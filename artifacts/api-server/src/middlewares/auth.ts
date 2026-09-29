import type { Request, Response, NextFunction } from "express";
import { validateSessionToken } from "../lib/auth";
import { findUserById } from "../lib/repository";
import type { User } from "@workspace/db";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieToken = req.cookies?.session_token;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to access this resource",
      },
    });
    return;
  }

  const session = validateSessionToken(token);
  if (!session) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired session. Please log in again.",
      },
    });
    return;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User account no longer exists",
      },
    });
    return;
  }

  req.user = user;
  req.sessionToken = token;
  next();
}
