import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve("showcase");
const artifacts = resolve("docs/assets");
mkdirSync(artifacts, { recursive: true });

const server = spawn("python", ["-m", "http.server", "4180", "--bind", "127.0.0.1", "--directory", root], {
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:4180/");
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error("Static showcase server did not become ready.");
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
    headless: true,
  });
  const errors: string[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
    });

    await page.goto("http://127.0.0.1:4180/", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Protect value while crypto settlement is pending." }).waitFor();
    await page.getByText("Pages showcase").waitFor();
    await page.getByRole("heading", { name: "Settlement exposure" }).waitFor();
    await page.getByRole("heading", { name: "Protection limits" }).waitFor();
    await page.getByRole("heading", { name: "Verified lifecycle" }).waitFor();
    await page.getByRole("button", { name: "Calculate protection" }).click();
    await page.getByRole("heading", { name: "Protection economics" }).waitFor();
    const terms = await page.locator("#quote-metrics").innerText();
    if (!terms.includes("$4.50") || !terms.includes("$10.00") || !terms.includes("$5.50")) {
      throw new Error(`Unexpected bounded terms: ${terms}`);
    }
    const proofLinks = await page.locator("a[data-proof-link]").count();
    if (proofLinks < 4) throw new Error(`Expected at least four proof links, found ${proofLinks}.`);
    const desktop = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    if (desktop.scrollWidth > desktop.innerWidth) throw new Error("Desktop showcase overflows horizontally.");
    await page.screenshot({ path: resolve(artifacts, "settleshield-pages-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    const mobile = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    if (mobile.scrollWidth > mobile.innerWidth) throw new Error("Mobile showcase overflows horizontally.");
    await page.screenshot({ path: resolve(artifacts, "settleshield-pages-mobile.png"), fullPage: true });
    if (errors.length) throw new Error(errors.join("\n"));

    console.log(JSON.stringify({ desktop, mobile, proofLinks, terms, errors }));
    await context.close();
  } finally {
    await browser.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Showcase proof failed.");
    process.exit(1);
  })
  .finally(() => {
    server.kill();
  });
