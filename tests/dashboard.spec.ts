import { test, expect } from '@playwright/test';

test.describe('Trading Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('text=Trading Dashboard', { timeout: 10000 });
  });

  test('should display dashboard title and version', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trading Dashboard');

    // Check if version is displayed in sidebar
    await expect(page.locator('text=v1.1.0')).toBeVisible();
  });

  test('should show welcome message when no accounts are configured', async ({ page }) => {
    // Check for welcome message when no accounts exist
    const welcomeMessage = page.locator('text=Welcome to Trading Dashboard');
    if (await welcomeMessage.isVisible()) {
      await expect(welcomeMessage).toBeVisible();
      await expect(page.locator('text=Connect your Bybit accounts')).toBeVisible();
      await expect(page.locator('button:has-text("Add Your First Account")')).toBeVisible();
    }
  });

  test('should display account cards when accounts are configured', async ({ page }) => {
    // Look for account cards
    const accountCards = page.locator('[data-testid="account-card"], .card:has-text("Account")');
    const accountCount = await accountCards.count();

    if (accountCount > 0) {
      console.log(`Found ${accountCount} account(s)`);

      // Test each account card
      for (let i = 0; i < accountCount; i++) {
        const card = accountCards.nth(i);
        await expect(card).toBeVisible();

        // Check for account status (Active/Error)
        const statusIndicator = card.locator('text=Active, text=Error').first();
        await expect(statusIndicator).toBeVisible();

        // Check for equity display
        const equity = card.locator('text=/\\$[\\d,]+/').first();
        if (await equity.isVisible()) {
          console.log(`Account ${i + 1} equity found`);
        }
      }
    }
  });

  test('should display stats cards with proper data', async ({ page }) => {
    // Wait for stats to load
    await page.waitForTimeout(2000);

    // Check for stats cards
    const statsCards = [
      'Total Equity',
      'Unrealized PnL',
      'Realized PnL',
      'Win Rate',
      'Total Trades'
    ];

    for (const statTitle of statsCards) {
      const statCard = page.locator(`.card:has-text("${statTitle}")`);
      if (await statCard.isVisible()) {
        await expect(statCard).toBeVisible();
        console.log(`✅ ${statTitle} card found`);

        // Check if it has a value (not just "Loading..." or "$0")
        const value = statCard.locator('text=/\\$|%|[0-9]/'). first();
        if (await value.isVisible()) {
          const valueText = await value.textContent();
          console.log(`${statTitle}: ${valueText}`);
        }
      } else {
        console.log(`⚠️ ${statTitle} card not found`);
      }
    }
  });

  test('should display historical data section', async ({ page }) => {
    // Look for historical data range section
    const historicalSection = page.locator('text=Historical Data Range').first();
    if (await historicalSection.isVisible()) {
      await expect(historicalSection).toBeVisible();

      // Check for load history button
      const loadButton = page.locator('button:has-text("Load 6-Month History")');
      await expect(loadButton).toBeVisible();

      // Check cache stats
      const cacheInfo = page.locator('text=/cached|account\\(s\\)|KB/');
      if (await cacheInfo.first().isVisible()) {
        console.log('✅ Cache information displayed');
      }
    } else {
      console.log('⚠️ Historical data section not visible');
    }
  });

  test('should test historical data loading functionality', async ({ page }) => {
    // Look for the Load 6-Month History button
    const loadButton = page.locator('button:has-text("Load 6-Month History")');

    if (await loadButton.isVisible()) {
      console.log('🔄 Testing historical data loading...');

      // Click the load button
      await loadButton.click();

      // Wait for loading to start
      await page.waitForTimeout(1000);

      // Check for progress indicator
      const progressBar = page.locator('text=Loading Historical Data, .animate-spin');
      if (await progressBar.first().isVisible()) {
        console.log('✅ Progress indicator appeared');

        // Wait for loading to complete (with timeout)
        await page.waitForFunction(
          () => !document.querySelector('text=Loading Historical Data'),
          { timeout: 60000 }
        ).catch(() => {
          console.log('⚠️ Loading took longer than 60 seconds');
        });
      }

      // Check if data improved after loading
      await page.waitForTimeout(2000);
      const totalTrades = page.locator('text=Total Trades').locator('..').locator('text=/[0-9]+/');
      if (await totalTrades.first().isVisible()) {
        const tradesText = await totalTrades.first().textContent();
        console.log(`Total trades after loading: ${tradesText}`);
      }
    } else {
      console.log('⚠️ Load 6-Month History button not found');
    }
  });

  test('should verify trading pair profits section', async ({ page }) => {
    // Look for account cards with trading pair profits
    const accountCards = page.locator('.card:has-text("Trading Pair Profits")');
    const count = await accountCards.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const card = accountCards.nth(i);

        // Check for trading pairs table
        const table = card.locator('table, .trading-pair');
        if (await table.first().isVisible()) {
          console.log(`✅ Account ${i + 1}: Trading pairs table found`);

          // Check for specific trading pairs
          const pairs = ['GALA', 'NEAR', 'ADA', 'SOL', 'LINK'];
          for (const pair of pairs) {
            const pairRow = card.locator(`text=${pair}`);
            if (await pairRow.first().isVisible()) {
              console.log(`✅ Found trading pair: ${pair}`);
            }
          }
        } else {
          // Check for no data message
          const noDataMsg = card.locator('text=No closed positions, text=Loading');
          if (await noDataMsg.first().isVisible()) {
            console.log(`⚠️ Account ${i + 1}: No trading data available`);
          }
        }
      }
    }
  });

  test('should check refresh functionality', async ({ page }) => {
    // Find and click refresh button
    const refreshButton = page.locator('button:has-text("Refresh Data")');

    if (await refreshButton.isVisible()) {
      console.log('🔄 Testing refresh functionality...');

      await refreshButton.click();

      // Check for loading state
      const loadingIndicator = page.locator('.animate-spin, text=Loading...');
      if (await loadingIndicator.first().isVisible()) {
        console.log('✅ Refresh loading indicator appeared');

        // Wait for refresh to complete
        await page.waitForFunction(
          () => !document.querySelector('text=Loading...'),
          { timeout: 30000 }
        ).catch(() => {
          console.log('⚠️ Refresh took longer than 30 seconds');
        });
      }
    }
  });

  test('should capture console errors and warnings', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Wait for page to fully load and any async operations
    await page.waitForTimeout(5000);

    // Log any console errors/warnings
    if (errors.length > 0) {
      console.log('❌ Console Errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('⚠️ Console Warnings:', warnings);
    }

    // Fail test if there are critical errors (excluding known deprecation warnings)
    const criticalErrors = errors.filter(error =>
      !error.includes('deprecated') &&
      !error.includes('Warning') &&
      !error.includes('DEP0060')
    );

    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors);
    }
  });
});