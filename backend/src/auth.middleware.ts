import { Request, Response, NextFunction } from 'express';
import { keyStore, JwtPayload } from './key-store';

export { JwtPayload } from './key-store';

/**
 * Express middleware — verifies the Bearer token using the RSA key store.
 * On success, attaches the decoded payload to `req.user`.
 */
export function authenticateToken(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  keyStore
    .verifyToken(token)
    .then((payload) => {
      req.user = payload;
      next();
    })
    .catch(() => {
      res.status(403).json({ error: 'Invalid or expired token' });
    });
}

/**
 * Express middleware — optionally verifies the Bearer token.
 * If a valid token is present, attaches the decoded payload to `req.user`.
 * If no token is provided, continues without setting `req.user`.
 */
export function optionalAuthenticateToken(req: any, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  keyStore
    .verifyToken(token)
    .then((payload) => {
      req.user = payload;
      next();
    })
    .catch(() => {
      // Invalid token — proceed without user context
      next();
    });
}

/** Sign an access token (15 min). */
export function signToken(payload: JwtPayload): Promise<string> {
  return keyStore.signAccessToken(payload);
}

/** Sign a refresh token (7 days). */
export function signRefreshToken(payload: JwtPayload): Promise<string> {
  return keyStore.signRefreshToken(payload);
}
