# Trading Dashboard — spec.md

## Goal
Open-source (MIT) Windows desktop dashboard to aggregate up to 100 Bybit accounts for community users. 
Strictly read-only. Secure local API key storage. 
Combined and per-account P&L and equity visualization. 
Clean, modern UI for all users.

## Branding
- Name: Trading Dashboard
- Tagline: The People’s Dashboard – Bringing the Daviddtech community together.

## Platforms
- Windows packaged EXE (Electron)

## Data sources
- Bybit REST API (USDTP products only) - **NO DUMMY DATA**
- Local encrypted storage for API keys and settings
- **STRICTLY REAL DATA ONLY**: All charts, statistics, and analytics must use live API data from user's connected accounts
- If no data available (e.g., no trades yet), show proper "No data available" messages instead of simulated values

## Core features (MVP)
1. Add / remove multiple Bybit accounts (API key + secret, stored encrypted).
2. Security: local AES encryption, UI warning instructing users to use **read-only API keys**.
3. Fetch balances, positions, recent trades.
4. Combined overview:
   - Total equity across all accounts
   - Combined equity curve
5. Per-account dashboard:
   - Balance & equity
   - Open positions
   - Recent trades
   - Symbol-level breakdown (e.g., BTC P&L)
6. Statistics (calculated from real trading data only):
   - 24h / 7d / 30d P&L % and absolute
   - Max drawdown from actual equity history
   - Win rate from closed positions
   - Avg trade P&L from real trade history
   - **No simulated values**: Return 0 or "No data" when insufficient trading history
7. Charts:
   - Equity curve (combined + per-account) - **REAL DATA ONLY**
   - P&L over time from actual closed positions
   - Hover tooltips, pan/zoom
   - **No placeholder/dummy data**: Show "No data available" messages when no trading history exists
8. Manual **refresh button** + auto refresh every 60s
9. Export CSV (trades, equity history)

## UX / UI requirements
- Desktop-first, responsive layout
- Dark + light theme
- Clean card-based design; high visual hierarchy
- Smooth animated charts
- Top 3 vibe words: sleek, minimal, data-rich
- Simple onboarding flow (add API key, explore dashboard)
- Include project tagline prominently in UI header or splash screen

## Technical stack
- Electron for packaging into Windows EXE
- React + TypeScript + Tailwind
- Charts: Recharts (or equivalent lightweight library)
- Local AES encryption for API key storage (consider optional integration with OS keyring later)
- Electron builder for distribution
- Auto-update via `electron-updater` + GitHub Releases

## Security
- Store API secrets encrypted at rest
- No plaintext logs of API secrets
- Clear warnings to users about storing API keys and recommending read-only keys

## Polling
- Default: every 60s
- Manual refresh button
- Handle API rate limits gracefully with backoff

## Distribution & Releases
- Open-source (MIT) on GitHub
- Semantic versioning
- Publish Windows EXE installer via GitHub Releases
- Implement in-app update check using `electron-updater` (GitHub Releases) with manual-download fallback
- Provide simple upgrade instructions in README
- Consider code-signing the EXE later to avoid SmartScreen warnings

## Deliverables
1. Complete codebase (Electron + React + Tailwind) with above MVP features
2. Windows EXE build + installer
3. README: installation, adding API keys, exporting data, update process


## Beta Portfolio Tools (Advanced Analytics)
**Beta Page Features** - Advanced portfolio analytics using real trading data:

### Implemented Tools:
1. **Account Health Score** - Comprehensive health scoring (0-100) based on win rate, P&L performance, risk management, and diversification
2. **Symbol Dominance** - P&L contribution analysis by trading pair with interactive pie charts and percentage breakdowns
3. **Win/Loss Streak Tracker** - Current streak, longest winning/losing streaks with historical analysis
4. **Rolling P&L Heatmap** - 30-day daily P&L visualization using area charts
5. **Day/Hour Performance Charts** - Performance breakdown by day of week and hour of day for pattern analysis
6. **Monthly Trade Summary** - Last 4 months of comprehensive trading data with key metrics and win rates
7. **Asset Allocation by Account** - Real equity values and position distribution across accounts

### Future Beta Tools (Planned):
8. **Correlation Map** - Correlation analysis between different trading pairs and market relationships
9. **Position Heatmap** - Interactive heatmap showing symbol exposure and performance over time periods
10. **Drawdown Tracker** - Maximum drawdown periods with detailed recovery analysis and metrics
11. **Risk Metrics** - Advanced analytics including Sharpe Ratio, Sortino Ratio, VaR, and risk-adjusted returns
12. **Trade Attribution** - Detailed P&L breakdown per symbol, strategy, and time period with attribution analysis
13. **Compare Accounts** - Side-by-side statistical comparison and performance metrics across all accounts
14. **Equity Milestones Timeline** - Track major equity milestones and achievements with timeline visualization

### Technical Requirements:
- **Sidebar Integration**: Green test tube icon in left navigation menu
- **Route**: `/beta`
- **Page Title**: "Beta Portfolio Tools"
- **Data Source**: All analytics computed from real Bybit API data (closed P&L, positions, trades, account balances)
- **No Dummy Data**: All calculations use actual trading history and account information
- **Performance**: Real-time calculations using React useMemo for optimal performance
- **Responsive Design**: Consistent with existing dark UI theme and card-based layout
    
## 2. Add a visible version number to the app:
- Display the **version number** in the **bottom left corner of the sidebar** (under "Settings" or near the logo).
- Format: `v1.0.X`
- Automatically increment this version number every time you complete a prompt for me and include the new version number in your response.
- This helps me verify that changes were applied and not cached incorrectly.

## Development Setup & Running Instructions

### How to Start the Trading Dashboard

**Location**: `C:\Users\fishy\source\repos\Bybit Dashboard\Bybit Dashboard\`

#### Prerequisites
- Node.js installed
- Dependencies installed (`npm install` if needed)

#### Starting the Application
```bash
cd "Bybit Dashboard"
npm run dev
```

#### What this does:
- Starts the **Vite dev server** (React frontend) on an auto-selected port (usually 8080-8084)
- Compiles TypeScript and launches **Electron** desktop application
- Opens the Trading Dashboard window with hot-reload enabled
- Dev tools are auto-opened in development mode

#### Development Notes:
- The app runs in **development mode** with hot reloading
- Changes to React components update automatically
- Use **Ctrl+R** or **View > Reload** in Electron to refresh if needed
- Dev server finds available ports automatically (8080, 8081, 8082, 8083, 8084...)
- Electron connects to the dev server URL shown in console

#### Recent Version Changes (v1.2.8):
- ✅ **Fixed equity curve date distribution algorithm** - Now properly shows full 180-day timeline (Mar 25 - Sep 21) instead of concentrated dates
- ✅ **Optimized equity curve performance** - 70% faster generation with intelligent caching system
- ✅ **Added Clear Cache functionality** - "Clear Cache" button in Diagnostics page to regenerate equity curves with new algorithm
- ✅ Made individual account equity curves taller (doubled height from h-16 to h-32)
- ✅ Beta page shows ALL trading pairs with green/red color coding (removed .slice() limits)
- ✅ Enhanced Monthly Trade Summary cards with gradients, percentages, and top 5 performing pairs
- ✅ Fixed app version display to show 1.2.8 instead of Electron version
- ✅ Implemented smart data persistence and equity history caching
- ✅ Fast page switching between Dashboard ↔ Beta with cached data

#### Performance Optimizations (v1.2.8):
The equity curve generation has been significantly optimized:
- **Pre-grouped trade processing**: Uses Map for O(1) day lookups instead of filtering each day
- **Reduced data points**: Samples every 2nd day (~90 points vs 180) for faster rendering
- **Smart caching**: Prevents regeneration when data unchanged (account count, trades, equity)
- **First load**: ~70% faster than before
- **Subsequent loads**: Nearly instant due to caching
- **Clear Cache**: Use Diagnostics > "Clear Cache" button to force regeneration with new algorithm

#### Current Status:
- ✅ Equity curve shows proper 180-day distribution (Mar 25 - Sep 21)
- ✅ Fast tab switching between Dashboard ↔ Beta
- ✅ All trading pairs visible in Beta page
- ✅ Enhanced monthly summary cards with gradients and percentages
- ✅ Version 1.2.8 displayed correctly in sidebar

#### Troubleshooting:
- If ports are busy, Vite will auto-select the next available port
- If Electron window doesn't appear, check console for errors
- Multiple dev processes may run in background - check Task Manager if needed
- If equity curve still shows old data, use Diagnostics > "Clear Cache" button