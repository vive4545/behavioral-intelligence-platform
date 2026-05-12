import { test, expect } from '@playwright/test';

test.describe('InterviewIQ Core Signal Flow', () => {
  test('should collect signals and receive scoring snapshots after consent', async ({ page }) => {
    await page.goto('/');

    // 1. Start session
    await page.click('button:has-text("Start Session")');
    await expect(page.locator('strong')).toHaveText('CONSENT_PENDING');

    // 2. Verify no signals before consent (Manual check or wait)
    // 3. Grant consent
    await page.click('button:has-text("Grant Consent")');
    await expect(page.locator('strong')).toHaveText('ACTIVE');

    // 4. Simulate activity
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.move(300, 300);

    // 5. Assert live score appears (WebSocket)
    await expect(page.locator('pre')).toContainText('"confidence":');
    
    // 6. Assert signals in log
    await expect(page.locator('div:has-text("mouse:move")')).toBeVisible();
  });
});
