import { expect, test } from "@playwright/test";

/** Creates 12 small files with a known circular-ish graph and unique names per run. */
async function scanTwelveFiles(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("vcc:onboarding:completed", "true"));
  await page.goto("/");
  const stamp = Date.now().toString(36);
  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 12 }, (_, i) => ({
      name: `file${i}-${stamp}.ts`,
      mimeType: "text/plain",
      buffer: Buffer.from(
        i === 0
          ? `import { v } from "./file1-${stamp}";\nconsole.log(v);`
          : `export const v${i} = ${i};\nrequire("./file${i - 1}-${stamp}");\n// TODO wire me`
      ),
    }))
  );
  await page.getByRole("button", { name: /Scan 12 files/ }).click();
  await page.waitForURL(/\/scan\//);
  await page.getByRole("button", { name: "Architecture" }).click();
  await page.waitForURL(/\/architecture\//);
  return stamp;
}

test("architecture page renders the mermaid diagram under strict CSP", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await scanTwelveFiles(page);
  const svg = page.locator(".mermaid-container svg");
  await expect(svg).toBeVisible();
  await expect(page.locator(".mermaid-container g.node").first()).toBeVisible();
  // no CSP violations should have been reported
  expect(consoleErrors.filter((t) => /Content Security Policy/i.test(t))).toEqual([]);
});

test("clicking a diagram node opens the file details sidebar", async ({ page }) => {
  const stamp = await scanTwelveFiles(page);
  await expect(page.locator(".mermaid-container g.node").first()).toBeVisible();
  await page.locator(".mermaid-container g.node").first().click();
  const sidebar = page.getByText(`file0-${stamp}.ts`).first();
  await expect(sidebar).toBeVisible({ timeout: 5000 });
});

test("share view copies a /share link and shows a toast (no alert)", async ({ page }) => {
  let alertDialoged = false;
  page.on("dialog", () => { alertDialoged = true; });
  await scanTwelveFiles(page);
  await page.getByRole("button", { name: "Share View (Link Only)" }).click();
  await expect(page.getByText("Share link copied to clipboard!")).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(new RegExp(`^https?://.*/share#.+`));
  expect(alertDialoged).toBe(false);
});
