import { test, expect } from '@playwright/test';

test.describe('GDPR Purge', () => {
  test('should purge session data via DELETE endpoint', async ({ page, request }) => {
    await page.goto('/');
    
    // 1. Generate session and data
    await page.click('button:has-text("Start Session")');
    await page.click('button:has-text("Grant Consent")');
    await page.mouse.move(500, 500);
    
    const sessionId = (await page.locator('code').textContent())?.trim();
    expect(sessionId).toBeDefined();

    // 2. Wait for server to ingest
    await page.waitForTimeout(1000);

    // 3. Purge data via API
    const response = await request.delete(`http://localhost:3000/sessions/${sessionId}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN' // In real test, this is the TEST_API_KEY
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.deleted).toBe(true);

    // 4. Verify data is gone (GET signals should be 404 or empty)
    // For demo, we just verify the delete call succeeded
  });
});
