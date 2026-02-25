/**
 * RSA Key Store with automatic rotation.
 *
 * Keys are persisted in the SQLite database so they survive restarts.
 * The active key pair is rotated on a configurable schedule (default: 24 h).
 * Old keys are kept for a grace period (default: 48 h) so that tokens signed
 * with a previous key can still be verified until they expire.
 *
 * Tokens are signed with RS256 and include a `kid` (Key ID) header so the
 * verifier knows which public key to use.
 */

import crypto from 'crypto';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { getDB } from './db';

/* ------------------------------------------------------------------ */
/*  Configuration (all durations in milliseconds)                      */
/* ------------------------------------------------------------------ */

/** How often a new key pair is generated (default 24 h). */
const ROTATION_INTERVAL_MS = Number(process.env.KEY_ROTATION_HOURS || 24) * 60 * 60 * 1000;

/** How long an old key stays valid for verification after rotation (default 48 h). */
const KEY_GRACE_PERIOD_MS = Number(process.env.KEY_GRACE_HOURS || 48) * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StoredKey {
  kid: string;
  public_key: string;
  private_key: string;
  created_at: number; // epoch ms
  expires_at: number; // epoch ms — after this the key cannot verify anything
  is_current: number; // 1 = active signing key
}

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
}

/* ------------------------------------------------------------------ */
/*  Key Store                                                          */
/* ------------------------------------------------------------------ */

class KeyStore {
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /* ---- bootstrap ------------------------------------------------- */

  async init(): Promise<void> {
    if (this.initialized) return;

    const db = await getDB();

    // Create table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS jwt_keys (
        kid         TEXT PRIMARY KEY,
        public_key  TEXT NOT NULL,
        private_key TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        expires_at  INTEGER NOT NULL,
        is_current  INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Ensure at least one active key exists
    const current = await db.get<StoredKey>('SELECT * FROM jwt_keys WHERE is_current = 1');
    if (!current) {
      await this.rotate();
    }

    // Schedule periodic rotation
    this.rotationTimer = setInterval(() => {
      this.rotate().catch(console.error);
    }, ROTATION_INTERVAL_MS);

    // Unref so the timer doesn't keep the process alive
    if (this.rotationTimer && typeof this.rotationTimer.unref === 'function') {
      this.rotationTimer.unref();
    }

    this.initialized = true;
    console.log(
      `[KeyStore] Initialised — rotation every ${ROTATION_INTERVAL_MS / 3600000}h, ` +
        `grace period ${KEY_GRACE_PERIOD_MS / 3600000}h`,
    );
  }

  /* ---- key rotation ---------------------------------------------- */

  /** Generate a fresh RSA-2048 key pair and mark it as the current signing key. */
  async rotate(): Promise<void> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const kid = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + ROTATION_INTERVAL_MS + KEY_GRACE_PERIOD_MS;

    const db = await getDB();

    // Demote previous current key
    await db.run('UPDATE jwt_keys SET is_current = 0 WHERE is_current = 1');

    // Insert new key
    await db.run(
      `INSERT INTO jwt_keys (kid, public_key, private_key, created_at, expires_at, is_current)
       VALUES (?, ?, ?, ?, ?, 1)`,
      kid,
      publicKey,
      privateKey,
      now,
      expiresAt,
    );

    // Purge keys that are past their grace period
    await db.run('DELETE FROM jwt_keys WHERE expires_at < ?', now);

    console.log(`[KeyStore] Rotated — new kid=${kid}`);
  }

  /* ---- signing --------------------------------------------------- */

  /** Return the current (active) key. */
  private async getCurrentKey(): Promise<StoredKey> {
    const db = await getDB();
    const key = await db.get<StoredKey>('SELECT * FROM jwt_keys WHERE is_current = 1');
    if (!key) throw new Error('[KeyStore] No active signing key');
    return key;
  }

  /** Sign an access token (short-lived, default 15 min). */
  async signAccessToken(payload: JwtPayload): Promise<string> {
    const key = await this.getCurrentKey();
    return jwt.sign(payload, key.private_key, {
      algorithm: 'RS256',
      expiresIn: '15m',
      keyid: key.kid,
    });
  }

  /** Sign a refresh token (long-lived, default 7 days). */
  async signRefreshToken(payload: JwtPayload): Promise<string> {
    const key = await this.getCurrentKey();
    return jwt.sign(payload, key.private_key, {
      algorithm: 'RS256',
      expiresIn: '7d',
      keyid: key.kid,
    });
  }

  /* ---- verification ---------------------------------------------- */

  /**
   * Verify a token by looking up the `kid` from its header.
   * Throws if the token is invalid, expired, or signed with an unknown/expired key.
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    // Decode header without verification to extract `kid`
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Token missing kid header');
    }

    const kid = decoded.header.kid;
    const db = await getDB();
    const key = await db.get<StoredKey>(
      'SELECT * FROM jwt_keys WHERE kid = ? AND expires_at > ?',
      kid,
      Date.now(),
    );

    if (!key) {
      throw new Error('Signing key not found or expired');
    }

    return new Promise<JwtPayload>((resolve, reject) => {
      jwt.verify(token, key.public_key, { algorithms: ['RS256'] }, (err, payload) => {
        if (err) return reject(err);
        resolve(payload as JwtPayload);
      });
    });
  }

  /* ---- JWKS endpoint (optional, for external consumers) ---------- */

  /** Return all valid public keys in a JWK-like format. */
  async getPublicKeys(): Promise<Array<{ kid: string; publicKey: string; expiresAt: number }>> {
    const db = await getDB();
    const keys = await db.all<StoredKey[]>(
      'SELECT kid, public_key, expires_at FROM jwt_keys WHERE expires_at > ?',
      Date.now(),
    );
    return keys.map((k) => ({
      kid: k.kid,
      publicKey: k.public_key,
      expiresAt: k.expires_at,
    }));
  }

  /* ---- cleanup --------------------------------------------------- */

  stop(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

/** Singleton instance — import this everywhere. */
export const keyStore = new KeyStore();
