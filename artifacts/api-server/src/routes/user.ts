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
        readerViewMode: preferences.readerViewMode,
        readerLayout: preferences.readerLayout,
        readerTheme: preferences.readerTheme,
        readerFontFamily: preferences.readerFontFamily,
        readerFontSize: preferences.readerFontSize,
        readerLineHeight: preferences.readerLineHeight,
        readerMargin: preferences.readerMargin,
        readerPageAnimation: preferences.readerPageAnimation,
        readerZoom: preferences.readerZoom,
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
    const {
      language,
      theme,
      readingMode,
      fontSize,
      readerViewMode,
      readerLayout,
      readerTheme,
      readerFontFamily,
      readerFontSize,
      readerLineHeight,
      readerMargin,
      readerPageAnimation,
      readerZoom,
    } = req.body || {};

    const updated = await updateUserPreferences(user.id, {
      ...(language !== undefined ? { language } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...(readingMode !== undefined ? { readingMode } : {}),
      ...(fontSize !== undefined ? { fontSize } : {}),
      ...(readerViewMode !== undefined ? { readerViewMode } : {}),
      ...(readerLayout !== undefined ? { readerLayout } : {}),
      ...(readerTheme !== undefined ? { readerTheme } : {}),
      ...(readerFontFamily !== undefined ? { readerFontFamily } : {}),
      ...(readerFontSize !== undefined ? { readerFontSize } : {}),
      ...(readerLineHeight !== undefined ? { readerLineHeight } : {}),
      ...(readerMargin !== undefined ? { readerMargin } : {}),
      ...(readerPageAnimation !== undefined ? { readerPageAnimation } : {}),
      ...(readerZoom !== undefined ? { readerZoom } : {}),
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      language: updated.language,
      theme: updated.theme,
      readingMode: updated.readingMode,
      fontSize: updated.fontSize,
      readerViewMode: updated.readerViewMode,
      readerLayout: updated.readerLayout,
      readerTheme: updated.readerTheme,
      readerFontFamily: updated.readerFontFamily,
      readerFontSize: updated.readerFontSize,
      readerLineHeight: updated.readerLineHeight,
      readerMargin: updated.readerMargin,
      readerPageAnimation: updated.readerPageAnimation,
      readerZoom: updated.readerZoom,
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
