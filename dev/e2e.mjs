import { chromium } from "playwright";

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${extra ? `  ${extra}` : ""}`);
};

/* The mock treats the token as the email; the real backend verifies with Google. */
async function signedInPage(email, { admin = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on("pageerror", (e) => console.log("  PAGEERROR:", e.message));
  await page.addInitScript(([e, a]) => {
    sessionStorage.setItem("mediaBoxAuthSession", JSON.stringify({
      idToken: e, exp: Math.floor(Date.now() / 1000) + 3600,
      email: e, name: e, role: a ? "admin" : "", isAdmin: a, canSubmit: true, verified: false
    }));
  }, [email, admin]);
  return page;
}

console.log("\nIntake: submission requires an allowed account");

{
  const page = await signedInPage("outsider@gmail.com");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const denied = await page.locator("text=This account cannot submit requests.").isVisible().catch(() => false);
  check("off-domain account is refused the form", denied);
  await page.close();
}

{
  const page = await signedInPage("staff@startupmission.in");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  check("on-domain account sees the wizard", await page.locator("form.media-form").isVisible());

  // Validation gate
  await page.getByRole("button", { name: "Next" }).click();
  check("name is required", await page.locator("text=Name is compulsory.").isVisible());

  await page.locator('input[name="employeeName"]').fill("Asha Menon");
  await page.getByRole("button", { name: "Next" }).click();
  check("department is required", await page.locator("text=Name of Department is compulsory.").isVisible());

  await page.locator('select[name="department"]').selectOption("IEDC");
  await page.locator('label.choice-card', { hasText: "Press release" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(300);
  check("PR branch renders", await page.locator('textarea[name="prEventAnnouncement"]').isVisible());

  await page.locator('textarea[name="prEventAnnouncement"]').fill("Launch of the new incubation cohort");
  await page.locator('input[name="prWhere"]').fill("Kochi");
  await page.screenshot({ path: "/tmp/claude-0/shot-form.png", fullPage: true });

  await page.getByRole("button", { name: "Submit request" }).click();
  await page.waitForTimeout(1200);
  const ok = await page.locator("text=Submission sent successfully").isVisible().catch(() => false);
  check("submission succeeds", ok);
  check("summary is rendered", await page.locator("text=Launch of the new incubation cohort").first().isVisible());
  check("print button is enabled after submit", await page.getByRole("button", { name: "Print / Save PDF" }).isEnabled());
  await page.screenshot({ path: "/tmp/claude-0/shot-summary.png", fullPage: true });
  await page.close();
}

console.log("\nAdmin gating");

{
  const page = await signedInPage("staff@startupmission.in");
  await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  check("non-admin is refused the dashboard", await page.locator("text=This account is not an admin.").isVisible());
  check("non-admin sees no task table", (await page.locator("table.ops-table").count()) === 0);
  await page.close();
}

{
  // Tamper: claim admin in sessionStorage. The server still refuses the data.
  const page = await signedInPage("staff@startupmission.in", { admin: true });
  await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const leaked = await page.locator("tbody tr td strong").count();
  check("tampered isAdmin does not leak data", leaked === 0, `(rows visible: ${leaked})`);
  await page.close();
}

{
  const page = await signedInPage("admin@startupmission.in", { admin: true });
  await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  check("admin sees the dashboard", await page.locator("table.ops-table").isVisible());
  const rowText = await page.locator("tbody tr").first().textContent();
  check("admin sees the submitted request", /incubation cohort/.test(rowText || ""), `row: ${(rowText||"").slice(0,60)}`);
  await page.screenshot({ path: "/tmp/claude-0/shot-admin.png", fullPage: true });

  // Write-back
  await page.locator("tbody tr").first().locator("select").nth(1).selectOption("Ongoing");
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const after = await page.locator("tbody tr").first().locator("select").nth(1).inputValue();
  check("status change persists to the backend", after === "Ongoing", `(got ${after})`);

  await page.goto("http://localhost:5173/analytics", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  check("analytics renders metrics", (await page.locator(".ops-metric-card").count()) === 6);
  check("analytics renders donuts", (await page.locator(".ops-donut-ring").count()) === 3);
  await page.screenshot({ path: "/tmp/claude-0/shot-analytics.png", fullPage: true });
  await page.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
