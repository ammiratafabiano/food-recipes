import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = "supersecret"; // mettilo in variabile d’ambiente

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
}

export { SECRET };
