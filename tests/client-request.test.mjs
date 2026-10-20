import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { requestMutation } from "../lib/client-request.mjs";

let server;
let origin;

before(async () => {
  server = createServer((req, res) => {
    if (req.url === "/offline") return req.socket.destroy();
    if (req.url === "/unauthorized") res.statusCode = 401;
    if (req.url === "/failure") res.statusCode = 500;
    if (req.url === "/html") return res.end("<html>Sign in</html>");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: req.url === "/success" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("accepts an acknowledged successful save", async () => {
  assert.equal(await requestMutation(`${origin}/success`, { title: "기록" }), null);
});

test("reports failed HTTP responses without rejecting the UI handler", async () => {
  assert.match(await requestMutation(`${origin}/failure`, {}), /저장하지 못했어요/);
});

test("explains an expired or unauthorized session", async () => {
  assert.match(await requestMutation(`${origin}/unauthorized`, {}), /로그인/);
});

test("does not treat a login page or unacknowledged response as a successful save", async () => {
  assert.match(await requestMutation(`${origin}/html`, {}), /저장하지 못했어요/);
  assert.match(await requestMutation(`${origin}/unacknowledged`, {}), /저장하지 못했어요/);
});

test("reports a lost network connection without rejecting the UI handler", async () => {
  assert.match(await requestMutation(`${origin}/offline`, {}), /연결/);
});
