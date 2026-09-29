import { expect, test } from "@playwright/test";

const VULNERABLE = 'const apiKey = "sk-live-1234567890";\neval(userInput);\ntry { run(); } catch (e) {}\n';

async function scanSample(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "app.js", mimeType: "text/javascript", buffer: Buffer.from(VULNERABLE) });
  await page.getByRole("button", { name: /^Scan 1 file/ }).click();
  await page.waitForURL(/\/scan\//);
}

test("scan shows issues, a score, and auto-fixes", async ({ page }) => {
  await scanSample(page);
  await expect(page.getByText("Secret written directly in code")).toBeVisible();
  await expect(page.getByText(/Health score/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Fix all \(2 auto-fixable\)/ })).toBeEnabled();
});

test("unsupported files show a friendly error", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await expect(page.getByText("isn't a supported file type")).toBeVisible();
});

test("marking an issue fixed shows a toast and updates the score", async ({ page }) => {
  await scanSample(page);
  const scoreBefore = await page.locator("text=/^\\d+$/").first().innerText();
  await page.getByText("Secret written directly in code").click();
  await page.getByRole("button", { name: "Mark as fixed" }).first().click();
  await expect(page.getByText("Marked as fixed")).toBeVisible();
  expect(await page.locator("text=/^\\d+$/").first().innerText()).not.toBe(scoreBefore);
});

test("Fix all opens a review dialog with before/after lines", async ({ page }) => {
  await scanSample(page);
  await page.getByRole("button", { name: /Fix all/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Review 2 automatic fixes");
  await expect(page.getByRole("dialog")).toContainText("process.env.APIKEY");
});

test("share link opens a read-only report", async ({ page }) => {
  await scanSample(page);
  await page.getByRole("button", { name: /Share/ }).click();
  await expect(page.getByText("Share link copied")).toBeVisible();
  await page.goto(await page.evaluate(() => navigator.clipboard.readText()));
  await expect(page.getByRole("heading", { name: /Shared report/ })).toBeVisible();
  await expect(page.getByText("Secret written directly in code")).toBeVisible();
});
