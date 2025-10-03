# Trade Harbour v1.6.8 - Multi-Exchange Support Improvements

## 🚀 What's New in v1.6.8

### ✨ Features
- **Fixed position side display** - Positions now correctly show Long/Short for CCXT-based exchanges
- **Exchange visibility filter** - Control which exchanges appear in the dropdown (Settings → default: Bybit, BloFin, Toobit)
- **Background data fetch** - Adding accounts no longer blocks the UI - historical data fetches in background with progress bar
- **Improved account status** - Better status detection for non-Bybit exchanges (BloFin, etc.)
- **Cleaner positions table** - Removed "Last Updated" column for simplified view
- **One-click setup** - "Add Your First Account" button now goes directly to Manage Accounts page

### 🔧 Improvements
- Enhanced global progress bar with better responsiveness
- Loading screen now only appears on initial app launch (not on every page change)
- Better error handling across multi-exchange environments
- Non-blocking account addition - can add multiple accounts while previous data fetch is still running
- Removed GitHub Actions workflows - releases are now manual uploads only

### 🐛 Bug Fixes
- Fixed position sides showing inverted (all Short when should be Long)
- Fixed BloFin accounts incorrectly showing as "Inactive" despite having balance
- Fixed UI blocking when adding new accounts
- Improved position timestamp handling
- Better CCXT exchange integration

---

## 📦 Installation

### Windows
1. Download `TradeHarbour-1.6.8-portable.zip`
2. Extract the ZIP file
3. Run `Trade Harbour.exe`

**Note:** Windows may show a security warning since the app is not code-signed. Click "More info" → "Run anyway" to proceed.

---

## 🔄 Upgrading from v1.6.7
Your settings, accounts, and trading data will be preserved. Simply:
1. Close the old version
2. Extract and run the new version
3. Your data folder will be automatically migrated

---

## 📝 Release Notes
- **Multi-exchange support** is still in BETA - some exchanges may have limited features
- API keys are stored locally in encrypted format
- Historical data is cached locally for faster loading

---

## 🐛 Known Issues
- Some exchanges may not support all features yet
- Position timestamps rely on exchange API data quality

---

## 💬 Feedback & Support
Found a bug? Have a suggestion? Open an issue on GitHub!

---

**Full Changelog**: https://github.com/fishyink/TradeHarbour-Desktop/compare/v1.6.7...v1.6.8

⚓ Trade Harbour - One harbour, one dashboard, all your trades.
