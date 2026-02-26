import { JwtPayload } from '../../key-store';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
