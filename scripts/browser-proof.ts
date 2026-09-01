import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const executablePath = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
const baseUrl = process.env.SETTLESHIELD_BASE_URL ?? "http://127.0.0.1:4173";
const assetsDir = resolve("docs/assets");
mkdirSync(assetsDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const errors: string[] = [];
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await desktop.newPage();
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        errors.push(`console ${location.url || "unknown"}: ${message.text()}`);
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errors.push(`response ${response.status()}: ${response.url()}`);
      }
    });
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) {
      throw new Error(`desktop route returned ${response?.status() ?? "no response"}`);
    }
    await page.getByRole("heading", {
      name: "Protect value while crypto settlement is pending.",
    }).waitFor();
    await page.getByLabel("Settlement window").selectOption("3600");
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Find protection" }).click();
    const outcome = await Promise.race([
      page
        .getByRole("heading", { name: "Bounded terms" })
        .waitFor({ timeout: 30_000 })
        .then(() => "quote" as const),
      page
        .locator(".error-message")
        .waitFor({ timeout: 30_000 })
        .then(async () => `error:${await page.locator(".error-message").innerText()}` as const),
    ]);
    if (outcome !== "quote") throw new Error(outcome);
    const liveTerms = await page.locator(".quote-metrics").innerText();
    const desktopMetrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      title: document.title,
    }));
    const desktopPath = resolve(assetsDir, "settleshield-desktop.png");
    await page.screenshot({ path: desktopPath, fullPage: true });
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobile.newPage();
    mobilePage.on("pageerror", (error) => errors.push(`mobile page: ${error.message}`));
    mobilePage.on("console", (message) => {
      if (message.type() === "error") errors.push(`mobile console: ${message.text()}`);
    });
    const mobileResponse = await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    if (!mobileResponse || mobileResponse.status() !== 200) {
      throw new Error(`mobile route returned ${mobileResponse?.status() ?? "no response"}`);
    }
    const mobileMetrics = await mobilePage.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    const mobilePath = resolve(assetsDir, "settleshield-mobile.png");
    await mobilePage.screenshot({ path: mobilePath, fullPage: true });
    await mobile.close();

    if (desktopMetrics.overflow !== 0 || mobileMetrics.overflow !== 0) {
      throw new Error(
        `horizontal overflow desktop=${desktopMetrics.overflow} mobile=${mobileMetrics.overflow}`,
      );
    }
    if (errors.length > 0) {
      throw new Error(`browser errors: ${errors.join(" | ")}`);
    }

    console.log(
      JSON.stringify({
        desktop: desktopMetrics,
        mobile: mobileMetrics,
        liveTerms,
        screenshots: { desktop: desktopPath, mobile: mobilePath },
        errors,
      }),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Browser proof failed.");
  process.exit(1);
});
