import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let userToken = null;

before(async () => {
  await startServer();

  const reg = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      email: `reader_pref_${Date.now()}@bookmind.app`,
      password: "password123",
      displayName: "Reader Pref User",
    },
  });
  userToken = reg.data.token;
});

after(() => {
  stopServer();
});

test("16.1 - User profile returns default reader visual preferences", async () => {
  const res = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  assert.equal(res.status, 200);
  assert.ok(res.data.preferences);
  const p = res.data.preferences;

  // BM-05 default reader preferences
  assert.equal(p.readerViewMode, "auto");
  assert.equal(p.readerLayout, "single");
  assert.equal(p.readerTheme, "paper");
  assert.equal(p.readerFontFamily, "serif");
  assert.equal(p.readerFontSize, 18);
  assert.equal(p.readerLineHeight, "normal");
  assert.equal(p.readerMargin, "normal");
  assert.equal(p.readerPageAnimation, "page");
  assert.equal(p.readerZoom, 100);
});

test("16.2 - PATCH /me/preferences updates and persists custom reader settings", async () => {
  const patchRes = await apiRequest("/me/preferences", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      readerViewMode: "reading",
      readerLayout: "double",
      readerTheme: "sepia",
      readerFontFamily: "sans",
      readerFontSize: 22,
      readerLineHeight: "relaxed",
      readerMargin: "wide",
      readerPageAnimation: "slide",
      readerZoom: 125,
    },
  });

  assert.equal(patchRes.status, 200);
  const updated = patchRes.data;
  assert.equal(updated.readerViewMode, "reading");
  assert.equal(updated.readerLayout, "double");
  assert.equal(updated.readerTheme, "sepia");
  assert.equal(updated.readerFontFamily, "sans");
  assert.equal(updated.readerFontSize, 22);
  assert.equal(updated.readerLineHeight, "relaxed");
  assert.equal(updated.readerMargin, "wide");
  assert.equal(updated.readerPageAnimation, "slide");
  assert.equal(updated.readerZoom, 125);

  // Verify persistence via GET /me
  const getMe = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(getMe.status, 200);
  assert.equal(getMe.data.preferences.readerTheme, "sepia");
  assert.equal(getMe.data.preferences.readerFontSize, 22);
});
