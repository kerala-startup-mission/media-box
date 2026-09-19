import { chromium } from "playwright";

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
});
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });

const origins = new Set();
page.on("request", (r) => { try { origins.add(new URL(r.url()).origin); } catch {} });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const ok = (n, v, extra = "") => console.log(`  ${v ? "ok  " : "FAIL"} ${n}${extra ? `  ${extra}` : ""}`);

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

ok("preview banner is shown", await page.locator("text=PREVIEW BUILD").isVisible());
ok("account chooser is rendered", await page.locator("text=Preview sign-in").isVisible());
ok("no password field anywhere", (await page.locator('input[type="password"]').count()) === 0);

// Outsider -> blocked
await page.locator("button", { hasText: "Outsider" }).click();
await page.waitForTimeout(800);
ok("outsider is blocked from the form", await page.locator("text=cannot submit requests").isVisible());

// Reset and sign in as staff
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.locator("button", { hasText: "Staff" }).click();
await page.waitForTimeout(900);
ok("staff sees the wizard", await page.locator("form.media-form").isVisible());

await page.locator('input[name="employeeName"]').fill("Asha Menon");
await page.locator('select[name="department"]').selectOption("IEDC");
await page.locator("label.choice-card", { hasText: "Press release" }).click();
await page.getByRole("button", { name: "Next" }).click();
await page.waitForTimeout(400);
await page.locator('textarea[name="prEventAnnouncement"]').fill("Launch of the new incubation cohort");
await page.getByRole("button", { name: "Submit request" }).click();
await page.waitForTimeout(1000);
ok("submission succeeds", await page.locator("text=Submission sent successfully").isVisible());
await page.screenshot({ path: "/tmp/claude-0/preview-summary.png", fullPage: true });

// Staff is not an admin
await page.goto("http://localhost:4173/#/dashboard", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
ok("staff is refused the dashboard", await page.locator("text=not an admin").isVisible());

// Admin sees it. Re-goto on the same hash URL is a no-op, so reload explicitly.
await page.evaluate(() => sessionStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.locator("button", { hasText: "Admin" }).first().click();
await page.waitForTimeout(1100);
ok("admin sees the dashboard", await page.locator("table.ops-table").isVisible());
ok("admin sees the submitted request",
   /incubation cohort/.test((await page.locator("tbody tr").first().textContent()) || ""));
await page.screenshot({ path: "/tmp/claude-0/preview-admin.png", fullPage: true });

await page.goto("http://localhost:4173/#/analytics", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
ok("analytics renders", (await page.locator(".ops-metric-card").count()) === 6);

console.log("\n  network origins contacted:");
[...origins].sort().forEach((o) => console.log(`    ${o}`));
const googleAuth = [...origins].some((o) => /accounts\.google|oauth2\.googleapis|googleusercontent/.test(o));
console.log(`\n  contacted a Google AUTH endpoint: ${googleAuth ? "YES - PROBLEM" : "no"}`);
console.log(`  page errors: ${errors.length ? errors.join(" | ") : "none"}`);

await browser.close();
