import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

before(async () => {
  await startServer();
});

after(() => {
  stopServer();
});

test("POST /api/auth/register rejects invalid inputs", async () => {
  // Missing email
  const res1 = await apiRequest("/auth/register", {
    method: "POST",
    body: { password: "short" },
  });
  assert.equal(res1.status, 400);

  // Short password (< 8 chars)
  const res2 = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: "valid@test.com", password: "123" },
  });
  assert.equal(res2.status, 400);
});

test("POST /api/auth/register creates user, preferences, and returns auth session", async () => {
  const email = `testuser_${Date.now()}@bookmind.app`;
  const res = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      email,
      password: "password12345",
      displayName: "Lector Prueba",
    },
  });

  assert.equal(res.status, 201);
  assert.ok(res.data.token);
  assert.equal(res.data.user.email, email);
  assert.equal(res.data.user.displayName, "Lector Prueba");
  assert.equal(res.data.preferences.language, "es-MX");
  assert.equal(res.data.preferences.theme, "system");
});

test("POST /api/auth/login verifies credentials and handles wrong password", async () => {
  const email = `login_${Date.now()}@bookmind.app`;
  await apiRequest("/auth/register", {
    method: "POST",
    body: { email, password: "correctPassword123" },
  });

  // Wrong password
  const failRes = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password: "wrongPassword" },
  });
  assert.equal(failRes.status, 401);

  // Correct password
  const successRes = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password: "correctPassword123" },
  });
  assert.equal(successRes.status, 200);
  assert.ok(successRes.data.token);
  assert.equal(successRes.data.user.email, email);
});

test("POST /api/auth/logout invalidates session", async () => {
  const email = `logout_${Date.now()}@bookmind.app`;
  const regRes = await apiRequest("/auth/register", {
    method: "POST",
    body: { email, password: "password12345" },
  });
  const token = regRes.data.token;

  // Me works with token
  const meRes = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);

  // Logout
  const logoutRes = await apiRequest("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutRes.status, 200);

  // Subsequent request fails
  const meAfterRes = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meAfterRes.status, 401);
});
