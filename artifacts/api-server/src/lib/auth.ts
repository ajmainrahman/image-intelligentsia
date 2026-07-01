import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "atlas_token";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is required in production. " +
          "Set it in your deployment environment.",
      );
    }
    return "atlas-dev-secret-key-change-in-production";
  }
  return secret;
}

// Validate JWT_SECRET on startup in production
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required in production. " +
      "Set it in your deployment environment.",
  );
}

export interface AuthRequest extends Request {
  userId?: number;
  cookies: Record<string, string>;
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function setAuthCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  // Prefer HttpOnly cookie, fall back to Authorization header for backward compat
  let token: string | undefined = req.cookies?.[COOKIE_NAME];

  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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
