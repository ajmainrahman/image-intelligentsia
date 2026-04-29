import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ??
  process.env.AUTH_SECRET ??
  process.env.SESSION_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV !== "production"
    ? "image-intelligentsia-dev-secret-key"
    : undefined);

function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("No auth secret configured. Set JWT_SECRET in environment variables.");
  }
  return JWT_SECRET;
}

export interface AuthRequest extends Request {
  userId?: number;
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), { expiresIn: "30d" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub: string };
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export class ServerConfigurationError extends Error {
  statusCode = 500;
  publicMessage: string;
  constructor(message: string) {
    super(message);
    this.name = "ServerConfigurationError";
    this.publicMessage = message;
  }
}
