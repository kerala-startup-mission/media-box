import { chromium } from "playwright";
const b = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });

async function page(email, admin) {
  const p = await b.newPage();
  await p.addInitScript(([e, a]) => sessionStorage.setItem("mediaBoxAuthSession", JSON.stringify({
    idToken: e, exp: Math.floor(Date.now()/1000)+3600, email: e, name: e,
    role: a ? "admin" : "", isAdmin: a, canSubmit: true, verified: false
  })), [email, admin]);
  return p;
}

const p = await page("admin@startupmission.in", true);
for (const w of [760, 900, 1100, 1280, 1440]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  const cols = await p.evaluate(() => getComputedStyle(document.querySelector(".ops-category-tabs")).gridTemplateColumns.split(" ").length);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log(`  ${String(w).padStart(4)}px  tabs cols=${cols}  horizontal overflow=${overflow}`);
}
await p.setViewportSize({ width: 1280, height: 1000 });
await p.goto("http://localhost:5173/analytics", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
console.log("  metrics cols at 1280:", await p.evaluate(() => getComputedStyle(document.querySelector(".ops-metrics-grid")).gridTemplateColumns.split(" ").length));
await b.close();
