import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { getUserPreferences, updateUserPreferences } from "../lib/repository";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const preferences = await getUserPreferences(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        createdAt: user.createdAt.toISOString(),
      },
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
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch user profile" },
    });
  }
});

router.patch("/me/preferences", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { language, theme, readingMode, fontSize } = req.body || {};

    const updated = await updateUserPreferences(user.id, {
      ...(language ? { language } : {}),
      ...(theme ? { theme } : {}),
      ...(readingMode ? { readingMode } : {}),
      ...(fontSize ? { fontSize } : {}),
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      language: updated.language,
      theme: updated.theme,
      readingMode: updated.readingMode,
      fontSize: updated.fontSize,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update preferences" },
    });
  }
});

export default router;
