import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

before(async () => {
  await startServer();
});

after(() => {
  stopServer();
});

test("PATCH /api/me/preferences updates language and theme persistently", async () => {
  const email = `pref_${Date.now()}@bookmind.app`;
  const reg = await apiRequest("/auth/register", {
    method: "POST",
    body: { email, password: "password123" },
  });
  const token = reg.data.token;

  // Initial check: es-MX
  const meInitial = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meInitial.data.preferences.language, "es-MX");

  // Update language to en-US and theme to dark
  const updateRes = await apiRequest("/me/preferences", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: {
      language: "en-US",
      theme: "dark",
      fontSize: "large",
    },
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.language, "en-US");
  assert.equal(updateRes.data.theme, "dark");
  assert.equal(updateRes.data.fontSize, "large");

  // Verify persistent retrieval
  const meUpdated = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meUpdated.data.preferences.language, "en-US");
  assert.equal(meUpdated.data.preferences.theme, "dark");
});
