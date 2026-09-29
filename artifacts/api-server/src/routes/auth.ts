import { Router, type IRouter } from "express";
import { hashPassword, verifyPassword, createSessionToken, revokeSessionToken } from "../lib/auth";
import { findUserByEmail, createUser, getUserPreferences } from "../lib/repository";

const router: IRouter = Router();

const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_EMAIL", message: "A valid email address is required" },
      });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "Password must have at least 8 characters" },
      });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(400).json({
        success: false,
        error: { code: "USER_ALREADY_EXISTS", message: "An account with this email already exists" },
      });
      return;
    }

    const passwordHash = hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      displayName: displayName || email.split("@")[0],
    });

    const { token, expiresAt } = createSessionToken(user.id);
    const preferences = await getUserPreferences(user.id);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        createdAt: user.createdAt.toISOString(),
      },
      token,
      preferences: {
        id: preferences.id,
        userId: preferences.userId,
        language: preferences.language,
        theme: preferences.theme,
        readingMode: preferences.readingMode,
        fontSize: preferences.fontSize,
        updatedAt: preferences.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to register" },
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: "MISSING_CREDENTIALS", message: "Email and password are required" },
      });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
      return;
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
      return;
    }

    const { token } = createSessionToken(user.id);
    const preferences = await getUserPreferences(user.id);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        createdAt: user.createdAt.toISOString(),
      },
      token,
      preferences: {
        id: preferences.id,
        userId: preferences.userId,
        language: preferences.language,
        theme: preferences.theme,
        readingMode: preferences.readingMode,
        fontSize: preferences.fontSize,
        updatedAt: preferences.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to login" },
    });
  }
});

router.post("/logout", (req, res) => {
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7).trim() : null);

  if (token) {
    revokeSessionToken(token);
  }

  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;
