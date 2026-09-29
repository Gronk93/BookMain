import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

before(async () => {
  await startServer();
});

after(() => {
  stopServer();
});

test("GET /api/healthz returns 200 with status ok", async () => {
  const res = await apiRequest("/healthz");
  assert.equal(res.status, 200);
  assert.equal(res.data?.status, "ok");
  assert.ok(res.data?.version);
  assert.ok(res.data?.timestamp);
});

test("GET /api/readyz returns 200 with readiness status and database report", async () => {
  const res = await apiRequest("/readyz");
  assert.equal(res.status, 200);
  assert.equal(res.data?.status, "ready");
  assert.ok(res.data?.database);
  assert.ok(res.data?.timestamp);
});
