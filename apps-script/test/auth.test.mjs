import assert from "node:assert/strict";
import { makeSandbox, post, validToken, CLIENT_ID } from "./harness.mjs";

const USERS_HEADER = ["Email", "Name", "Role", "Active"];
let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name}\n       ${error.message}`);
  }
}

console.log("\nToken verification");

test("no token is rejected", () => {
  const s = makeSandbox({ tokenInfo: validToken() });
  const r = post(s, { action: "session" });
  assert.equal(r.ok, false);
  assert.match(r.error, /Sign in required/);
});

test("a token for another client id is rejected", () => {
  const s = makeSandbox({ tokenInfo: validToken({ aud: "someone-else.apps.googleusercontent.com" }) });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.ok, false);
  assert.match(r.error, /different application/);
});

test("a wrong issuer is rejected", () => {
  const s = makeSandbox({ tokenInfo: validToken({ iss: "evil.example.com" }) });
  const r = post(s, { action: "session", idToken: "x" });
  assert.match(r.error, /issuer/);
});

test("an expired token is rejected", () => {
  const s = makeSandbox({ tokenInfo: validToken({ exp: String(Math.floor(Date.now() / 1000) - 60) }) });
  const r = post(s, { action: "session", idToken: "x" });
  assert.match(r.error, /expired/);
});

test("an unverified email is rejected", () => {
  const s = makeSandbox({ tokenInfo: validToken({ email_verified: "false" }) });
  const r = post(s, { action: "session", idToken: "x" });
  assert.match(r.error, /verified email/);
});

test("tokeninfo failure is rejected", () => {
  const s = makeSandbox({ tokenInfo: null });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.ok, false);
});

console.log("\nAuthorisation rules");

test("on-domain user may submit but is not an admin", () => {
  const s = makeSandbox({ users: [USERS_HEADER], tokenInfo: validToken() });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.canSubmit, true);
  assert.equal(r.isAdmin, false);
  assert.equal(r.reason, "domain");
});

test("off-domain user not listed may not submit", () => {
  const s = makeSandbox({ users: [USERS_HEADER], tokenInfo: validToken({ email: "someone@gmail.com" }) });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.canSubmit, false);
  assert.equal(r.isAdmin, false);
});

test("off-domain user listed and active may submit", () => {
  const s = makeSandbox({
    users: [USERS_HEADER, ["partner@example.com", "Partner", "viewer", true]],
    tokenInfo: validToken({ email: "partner@example.com" })
  });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.canSubmit, true);
  assert.equal(r.isAdmin, false);
});

test("listed admin gets admin", () => {
  const s = makeSandbox({
    users: [USERS_HEADER, ["staff@startupmission.in", "Staff", "admin", true]],
    tokenInfo: validToken()
  });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.isAdmin, true);
  assert.equal(r.role, "admin");
});

test("Active FALSE revokes an on-domain admin", () => {
  const s = makeSandbox({
    users: [USERS_HEADER, ["staff@startupmission.in", "Staff", "admin", false]],
    tokenInfo: validToken()
  });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.isAdmin, false, "admin must be revoked");
  assert.equal(r.canSubmit, false, "deactivation must beat the domain rule");
  assert.equal(r.reason, "deactivated");
});

test("Active accepts hand-typed yes / 1 / TRUE", () => {
  for (const value of ["yes", "1", "TRUE", "true", " y "]) {
    const s = makeSandbox({
      users: [USERS_HEADER, ["staff@startupmission.in", "Staff", "admin", value]],
      tokenInfo: validToken()
    });
    const r = post(s, { action: "session", idToken: "x" });
    assert.equal(r.isAdmin, true, `Active=${JSON.stringify(value)} should be truthy`);
  }
});

test("email match ignores case and whitespace", () => {
  const s = makeSandbox({
    users: [USERS_HEADER, ["  Staff@StartupMission.IN ", "Staff", "admin", true]],
    tokenInfo: validToken({ email: "staff@startupmission.in" })
  });
  assert.equal(post(s, { action: "session", idToken: "x" }).isAdmin, true);
});

test("an empty Users tab seeds the deploying account as admin", () => {
  const s = makeSandbox({ users: [], tokenInfo: validToken({ email: "owner@startupmission.in" }) });
  const r = post(s, { action: "session", idToken: "x" });
  assert.equal(r.isAdmin, true, "owner should be seeded");
});

console.log("\nAction gating");

test("non-admin cannot list submissions", () => {
  const s = makeSandbox({ users: [USERS_HEADER], tokenInfo: validToken() });
  const r = post(s, { action: "listSubmissions", idToken: "x" });
  assert.equal(r.ok, false);
  assert.match(r.error, /not an admin/);
});

test("non-admin cannot update a submission", () => {
  const s = makeSandbox({ users: [USERS_HEADER], tokenInfo: validToken() });
  const r = post(s, { action: "updateSubmission", idToken: "x", payload: { requestId: "REQ-1", status: "Completed" } });
  assert.equal(r.ok, false);
  assert.match(r.error, /not an admin/);
});

test("off-domain account cannot submit", () => {
  const s = makeSandbox({ users: [USERS_HEADER], tokenInfo: validToken({ email: "outsider@gmail.com" }) });
  const r = post(s, { action: "submit", idToken: "x", payload: { submission: { employeeName: "X" } } });
  assert.equal(r.ok, false);
  assert.match(r.error, /@startupmission\.in/);
});

test("unknown action is rejected", () => {
  const s = makeSandbox({ users: [USERS_HEADER], tokenInfo: validToken() });
  assert.match(post(s, { action: "nope", idToken: "x" }).error, /Unknown action/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
