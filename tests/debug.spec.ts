import { test, expect } from '@playwright/test';

test('Debug Dashboard Rendering', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('text=Trading Dashboard', { timeout: 10000 });

  // Take screenshot
  await page.screenshot({ path: 'debug-dashboard.png', fullPage: true });

  // Check for stats cards specifically
  console.log('🔍 Looking for stats cards...');

  const statsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-5');
  console.log('Stats grid count:', await statsGrid.count());

  if (await statsGrid.first().isVisible()) {
    console.log('✅ Stats grid found');
    const statsCards = statsGrid.locator('.card, [class*="card"]');
    console.log('Stats cards in grid:', await statsCards.count());
  } else {
    console.log('❌ Stats grid not found');
  }

  // Check all StatsCard components
  const allStatsCards = page.locator('text=Total Equity, text=Unrealized PnL, text=Realized PnL, text=Win Rate, text=Total Trades');
  for (let i = 0; i < await allStatsCards.count(); i++) {
    const card = allStatsCards.nth(i);
    const text = await card.textContent();
    console.log(`Found stat: ${text}`);
  }

  // Check for historical data section
  const historicalSection = page.locator('text=Historical Data Range');
  console.log('Historical section found:', await historicalSection.isVisible());

  // Check for account cards section
  const accountCards = page.locator('text=Account 1, text=Account 2');
  console.log('Account cards found:', await accountCards.count());

  // Get page content and search for key elements
  const content = await page.content();
  console.log('Page contains "Total Equity":', content.includes('Total Equity'));
  console.log('Page contains "Historical Data Range":', content.includes('Historical Data Range'));
  console.log('Page contains StatsCard:', content.includes('StatsCard'));

  // Check what's actually in the body
  const bodyText = await page.locator('body').textContent();
  console.log('Page body text preview:', bodyText?.substring(0, 500));

  // Check for any React error boundaries or error messages
  const errorMessages = page.locator('text=Error, text=Something went wrong, text=Failed');
  console.log('Error messages found:', await errorMessages.count());

  // Check what components are actually rendered
  const dashboardTitle = page.locator('h1:has-text("Trading Dashboard")');
  console.log('Dashboard title found:', await dashboardTitle.isVisible());

  // Check for main content divs
  const mainContent = page.locator('main, .space-y-6');
  console.log('Main content areas:', await mainContent.count());

  // Scroll to top and check again
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  console.log('After scrolling to top...');
  console.log('Stats grid visible:', await statsGrid.first().isVisible());
});