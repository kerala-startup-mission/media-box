import assert from "node:assert/strict";
import { makeSandbox, post, validToken } from "./harness.mjs";

const USERS = [
  ["Email", "Name", "Role", "Active"],
  ["staff@startupmission.in", "Staff Member", "admin", true]
];

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (e) { failures.push(name); console.log(`  FAIL ${name}\n       ${e.message}`); }
}

const SAMPLE_PAYLOAD = {
  employeeName: "Asha Menon",
  department: "IEDC",
  category: "PR",
  prEventAnnouncement: "Launch of the new incubation cohort",
  prWhere: "Kochi",
  prWhySignificant: "First cohort of the year",
  submittedAt: "2026-09-17T06:30:00.000Z"
};

const SAMPLE_TASK = {
  id: "TASK-1",
  title: "Launch of the new incubation cohort",
  category: "PR",
  status: "Will Do",
  priority: "High Touch",
  team: "PR Team",
  assignee: "To be assigned",
  summary: "First cohort of the year",
  createdAt: "2026-09-17T06:30:00.000Z"
};

function submitOnce(sandbox, requestId = "REQ-1001") {
  return post(sandbox, {
    action: "submit",
    idToken: "the-secret-token-value",
    payload: { submission: SAMPLE_PAYLOAD, task: SAMPLE_TASK, requestId }
  });
}

console.log("\nSubmission round trip");

test("a submission is accepted and writes one row", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  const r = submitOnce(s);
  assert.equal(r.ok, true, r.error);
  const sheet = s.sheetsMap.get("Media Requests");
  assert.equal(sheet.data.length, 2, "header row plus one data row");
});

test("the row has exactly as many cells as HEADERS", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  const sheet = s.sheetsMap.get("Media Requests");
  assert.equal(sheet.data[1].length, sheet.data[0].length, "row width must match header width");
  assert.equal(sheet.data[0].length, 67);
});

test("the verified identity is recorded, not the self-reported name", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  const sheet = s.sheetsMap.get("Media Requests");
  const headers = sheet.data[0];
  const row = sheet.data[1];
  assert.equal(row[headers.indexOf("Submitted By Email")], "staff@startupmission.in");
  assert.equal(row[headers.indexOf("Employee Name")], "Asha Menon");
});

test("the ID TOKEN NEVER reaches the sheet", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  const sheet = s.sheetsMap.get("Media Requests");
  const serialized = JSON.stringify(sheet.data);
  assert.ok(!serialized.includes("the-secret-token-value"), "a live credential must never be persisted");
  const raw = sheet.data[1][sheet.data[0].indexOf("Raw Payload JSON")];
  assert.ok(!String(raw).includes("idToken"), "Raw Payload JSON must not carry the token");
  assert.ok(String(raw).includes("Asha Menon"), "but it should still carry the submission");
});

console.log("\nAdmin read and write back");

test("listSubmissions returns the task for an admin", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  const r = post(s, { action: "listSubmissions", idToken: "x" });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.tasks.length, 1);
  assert.equal(r.tasks[0].requestId, "REQ-1001");
  assert.equal(r.tasks[0].title, "Launch of the new incubation cohort");
  assert.equal(r.tasks[0].priority, "High Touch");
  assert.equal(r.tasks[0].submittedByEmail, "staff@startupmission.in");
});

test("updateSubmission writes the status back to the sheet", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  const r = post(s, {
    action: "updateSubmission",
    idToken: "x",
    payload: { requestId: "REQ-1001", status: "Completed", assignee: "Ashitha" }
  });
  assert.equal(r.ok, true, r.error);

  const sheet = s.sheetsMap.get("Media Requests");
  const headers = sheet.data[0];
  assert.equal(sheet.data[1][headers.indexOf("Status")], "Completed");
  assert.equal(sheet.data[1][headers.indexOf("Assignee")], "Ashitha");
  assert.equal(sheet.data[1][headers.indexOf("Priority")], "High Touch", "untouched fields keep their value");

  const listed = post(s, { action: "listSubmissions", idToken: "x" });
  assert.equal(listed.tasks[0].status, "Completed", "the read path reflects the write");
});

test("updateSubmission cannot rewrite submission content", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  post(s, {
    action: "updateSubmission",
    idToken: "x",
    payload: { requestId: "REQ-1001", employeeName: "Someone Else", prWhere: "Nowhere", status: "Ongoing" }
  });
  const sheet = s.sheetsMap.get("Media Requests");
  const headers = sheet.data[0];
  assert.equal(sheet.data[1][headers.indexOf("Employee Name")], "Asha Menon", "content must be immutable here");
  assert.equal(sheet.data[1][headers.indexOf("Status")], "Ongoing");
});

test("updateSubmission on an unknown id fails cleanly", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s);
  const r = post(s, { action: "updateSubmission", idToken: "x", payload: { requestId: "REQ-NOPE", status: "Ongoing" } });
  assert.equal(r.ok, false);
  assert.match(r.error, /No submission found/);
});

test("a corrupt Workflow Task JSON cell does not break the list", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s, "REQ-A");
  submitOnce(s, "REQ-B");
  const sheet = s.sheetsMap.get("Media Requests");
  sheet.data[1][sheet.data[0].indexOf("Workflow Task JSON")] = "{not json";
  const r = post(s, { action: "listSubmissions", idToken: "x" });
  assert.equal(r.ok, true);
  assert.equal(r.tasks.length, 2, "both rows still returned");
});

test("newest submission comes back first", () => {
  const s = makeSandbox({ users: USERS, tokenInfo: validToken() });
  submitOnce(s, "REQ-OLD");
  submitOnce(s, "REQ-NEW");
  const r = post(s, { action: "listSubmissions", idToken: "x" });
  assert.equal(r.tasks[0].requestId, "REQ-NEW");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
