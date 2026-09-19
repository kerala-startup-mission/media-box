/**
 * Stands in for the deployed Apps Script during local verification: same
 * envelope, same actions, same text/plain + CORS behaviour. Dev only.
 */
import { createServer } from "node:http";

const users = new Map([
  ["admin@startupmission.in", { name: "Admin User", role: "admin", active: true }],
  ["staff@startupmission.in", { name: "Staff User", role: "", active: true }]
]);
const tasks = [];

function access(email) {
  const user = users.get(email);
  const domain = email.split("@")[1] || "";
  if (user && !user.active) return { email, name: user.name, role: "", isAdmin: false, canSubmit: false, reason: "deactivated" };
  const domainAllowed = domain === "startupmission.in";
  return {
    email,
    name: user?.name || email,
    role: user?.role || "",
    isAdmin: Boolean(user && user.active && user.role === "admin"),
    canSubmit: domainAllowed || Boolean(user),
    reason: domainAllowed ? "domain" : user ? "listed" : "not-allowed"
  };
}

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") { res.writeHead(405).end(); return; }

  let raw = "";
  req.on("data", (c) => { raw += c; });
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    // The token is the email in this mock; the real backend verifies with Google.
    const who = access(String(body.idToken || "").toLowerCase());
    const send = (o) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };

    if (body.action === "session") return send({ ok: true, ...who });
    if (body.action === "listSubmissions") {
      if (!who.isAdmin) return send({ ok: false, error: "This account is not an admin." });
      return send({ ok: true, tasks: [...tasks].reverse() });
    }
    if (body.action === "updateSubmission") {
      if (!who.isAdmin) return send({ ok: false, error: "This account is not an admin." });
      const t = tasks.find((x) => x.requestId === body.payload.requestId);
      if (!t) return send({ ok: false, error: "No submission found." });
      for (const f of ["status", "priority", "team", "assignee"]) {
        if (body.payload[f]) t[f] = body.payload[f];
      }
      return send({ ok: true });
    }
    if (body.action === "submit") {
      if (!who.canSubmit) return send({ ok: false, error: `Only @startupmission.in accounts can submit. You are signed in as ${who.email}.` });
      const { submission = {}, task = {}, requestId = "" } = body.payload || {};
      tasks.push({ ...task, requestId, submittedByEmail: who.email });
      console.log(`[mock] submit from ${who.email}: ${task.title} | token in submission: ${JSON.stringify(submission).includes("idToken")}`);
      return send({ ok: true, mode: "connected", requestId });
    }
    send({ ok: false, error: "Unknown action" });
  });
}).listen(8787, () => console.log("mock backend on http://localhost:8787"));
