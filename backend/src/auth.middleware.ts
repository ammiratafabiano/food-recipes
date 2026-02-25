import { Request, Response, NextFunction } from 'express';
import { keyStore, JwtPayload } from './key-store';

export { JwtPayload } from './key-store';

/**
 * Express middleware — verifies the Bearer token using the RSA key store.
 * On success, attaches the decoded payload to `req.user`.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  keyStore
    .verifyToken(token)
    .then((payload) => {
      (req as any).user = payload;
      next();
    })
    .catch(() => {
      res.status(403).json({ error: 'Invalid or expired token' });
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
