# Bybit Dashboard Changelog

## Version 1.5.1 - September 29, 2025

### 📦 **ZIP Release Format**
- **Complete Package Distribution**: Changed from standalone .exe to .zip format
  - ZIP contains TradeHarbour.exe + data folder + troubleshooting batch files
  - Users can immediately see data folder structure for easy upgrades
  - Includes install-dependencies.bat and fix-white-screen.bat for self-service support
  - No more hidden data - everything visible for user control

### 🔄 **Enhanced User Experience**
- **Simplified Upgrade Process**: Copy/paste data folder between versions
- **Transparent Data Location**: Data folder visible in download package
- **Complete Self-Service**: All troubleshooting tools included in ZIP
- **Professional Distribution**: Clean, organized package structure

---

## Version 1.5.0 - September 29, 2025

### 🔧 **Enhanced Production Stability & Error Handling**
- **Robust File Loading**: Multiple fallback paths for finding application files
  - Improved error detection and recovery for missing or corrupted files
  - Better logging and diagnostics for file loading issues
  - Enhanced compatibility across different Windows configurations

- **Intelligent Error Messages**: Replaced generic white screens with helpful guidance
  - Specific error pages explaining what went wrong and how to fix it
  - Direct references to included troubleshooting tools (fix-white-screen.bat)
  - Clear escalation path for unresolved issues

### 🛡️ **Production Loading Improvements**
- **Network-Independent**: Confirmed production mode uses no network ports
  - File-based loading eliminates port conflict possibilities
  - More reliable loading across corporate and restricted networks
  - Better performance and startup times

- **Enhanced Debugging**: Better console logging for troubleshooting
  - Clear success/failure indicators for each loading attempt
  - Detailed path information for support teams
  - Easier identification of antivirus or permission issues

### 📦 **User Experience**
- **No More Mystery Errors**: Users always know what's wrong and how to fix it
- **Self-Service Support**: Enhanced batch files with common cause explanations
- **Professional Error Handling**: Clear, actionable error messages instead of blank screens

---

## Version 1.4.9 - September 29, 2025 (Previous)

### 🛠️ **Comprehensive User Support & Troubleshooting**
- **Automated Dependency Installer**: Added `install-dependencies.bat` for one-click setup
  - Downloads and installs Microsoft Visual C++ Redistributable automatically
  - Checks Windows Update status and provides guidance
  - User-friendly progress reporting and error handling

- **Quick White Screen Fix**: Added `fix-white-screen.bat` for immediate issue resolution
  - Streamlined installer for the most common issue (missing VC++ Redistributable)
  - Simple one-click solution for users experiencing blank screens

### 📖 **Enhanced Documentation**
- **Comprehensive Troubleshooting Guide**: Added detailed white screen solutions to README
  - Step-by-step Visual C++ Redistributable installation
  - Windows update requirements and compatibility info
  - Antivirus exception instructions and admin permissions guide
  - Debug mode activation for advanced troubleshooting

- **Improved User Data README**: Enhanced data folder documentation with troubleshooting links
  - Clear upgrade instructions with troubleshooting references
  - Direct links to GitHub support resources

### 📦 **Release Package Improvements**
- **Bundled Support Files**: Troubleshooting .bat files included with portable release
- **Complete Self-Service**: Users can resolve issues without external downloads
- **Professional Support**: Clear escalation path to GitHub issues

### 🎯 **User Experience**
- **Zero-Knowledge Installation**: Users don't need to know what dependencies they need
- **One-Click Solutions**: Batch files handle all complexity automatically
- **Clear Documentation**: Every possible issue has a documented solution

---

## Version 1.4.8 - September 29, 2025 (Previous)

### 💾 **Simplified to 100% Portable Application**
- **Portable-Only Storage**: Data now ONLY stored in `data/` folder next to .exe
- **Removed AppData**: No more Windows system directories - truly portable
- **Removed User Choice**: Simplified UX - one storage mode, one location
- **USB-Friendly**: Perfect for running from USB drives, cloud folders
- **Zero Registry Impact**: Leaves your system completely clean

### 🎯 **Two Ways to Run**
- **Portable Release**: Download .exe from GitHub releases (recommended)
- **Development**: Clone repository and `npm run dev` (both use same `data/` folder)

### 🔧 **Technical Changes**
- **Simplified Storage Logic**: Removed dual-mode complexity
- **Enhanced Portability**: Data directory always relative to executable
- **Cleaner UI**: Removed storage mode selection interface
- **Updated Documentation**: Clear portable-only instructions

### 📦 **Release Improvements**
- **GitHub Actions**: Now named "Windows Release Portable"
- **Better Release Notes**: Clear portable application messaging
- **Enhanced Instructions**: Step-by-step portable setup guide

---

## Version 1.4.6 - September 29, 2025 (Previous)

### 🆕 **Major Feature: Dual Storage Modes**
- **User Choice Storage System**: Choose between System Mode and Portable Mode
  - **System Mode**: Data stored in Windows AppData (automatic persistence)
  - **Portable Mode**: Data stored next to .exe file (true portability)
  - **Live Migration**: Switch between modes safely with data migration
  - **Smart Detection**: App remembers your preference and initializes accordingly

### 🎛️ **Enhanced Diagnostics & Backup**
- **Storage Mode UI**: Visual mode selection with clickable cards
- **Real-time Storage Info**: Shows current paths for both modes
- **One-Click Mode Switching**: Migrate data between storage modes instantly
- **Enhanced Backup System**: Export/import works in both modes
- **Mode-Specific Upgrade Instructions**: Dynamic upgrade guides based on current mode

### 🔧 **Technical Improvements**
- **Dual Directory Management**: App handles both portable and system directories
- **Automatic Data Migration**: Seamless copying between storage locations
- **Storage Mode Persistence**: App remembers and respects user choice
- **Enhanced Error Handling**: Better fallbacks for storage initialization

### 📖 **Updated Documentation**
- **README Storage Guide**: Comprehensive guide for both storage modes
- **In-App Instructions**: Dynamic upgrade instructions based on current mode
- **Visual Mode Indicators**: Clear UI showing current storage mode

---

## Version 1.3.2 - September 29, 2025 (Previous Release)

### 🔧 Critical Bug Fixes & Security Improvements
- **Fixed Portable Version Storage Errors**: Resolved ENOTDIR storage errors in portable releases
  - Uses proper system userData directory for packaged apps instead of relative paths
  - Improved error handling for storage operations to prevent crashes
  - Fixed "Error invoking remote method 'store-set': Error: ENOTDIR, not a directory" issue

- **Security Enhancement - Removed User Data from Releases**:
  - **CRITICAL**: API keys and account data are no longer packaged with releases
  - Updated build configuration to exclude all user data files (*.json, *.db, etc.)
  - Only includes empty data directory structure for proper initialization

- **Enhanced Error Handling**:
  - Better fallback behavior when storage initialization fails
  - User-friendly error messages instead of application crashes
  - Graceful handling of missing directories in portable environments

### 📖 Documentation Updates
- **Clear Desktop-Only Requirements**: Updated README with prominent warnings
  - Added clear "Desktop Application Only" badges and warnings
  - Specified that the app will NOT run in web browsers
  - Added platform requirements section (Windows/Mac/Linux desktop only)
  - Reorganized Quick Start guide with download vs. build options

### 🏗️ Build System Improvements
- **Disabled Code Signing**: Removed problematic code signing requirements causing build failures
- **Cleaner Release Packages**: Eliminated inclusion of development-only files
- **Version Sync**: Updated all version references to 1.3.2

---

## Version 1.3.2 - September 28, 2025 (Previous Release Notes)

### 📅 Calendar Feature Enhancements
- **Calendar P&L Visualization**: Comprehensive calendar view for trade analysis
  - Daily, Weekly, Monthly, and Quarterly calendar views
  - Color-coded profit/loss indicators (green for profits, red for losses)
  - Real-time data integration with closed P&L trades
  - Interactive calendar squares with click functionality to view detailed trade breakdown

- **Trade Details & Analytics**: Enhanced trade analysis capabilities
  - Detailed trade breakdown when clicking calendar periods
  - Long vs Short ratio analysis with visual progress indicators
  - Win rate calculations and trade duration analytics
  - Professional equity curve charts with mouse hover tooltips showing exact dollar values
  - Chronological equity progression display

- **CSV Export Functionality**: Professional data export capabilities
  - Download CSV button for exporting selected period trade data
  - Comprehensive export including Account, ID, Symbol/Size, Open/Close prices with timestamps, Duration, and Realized P&L
  - Automatic filename generation with period and date information

- **Smart Duration Handling**: Optimized duration display logic
  - Duration column removed from Weekly, Monthly, and Quarterly views (due to API data limitations for older trades)
  - Duration column maintained for Daily view with accurate trade timing
  - Improved duration calculation with better handling of instant trades

- **UI/UX Improvements**: Cleaner calendar interface
  - Removed unnecessary Notes and Overview buttons
  - Removed Actions column (edit/delete functionality) for cleaner trade tables
  - Fixed field mapping issues (orderId, qty/closedSize) for consistent data display
  - Improved button layout and spacing

### 🔧 Technical Fixes
- **Data Consistency**: Fixed field name mismatches causing data display issues
- **Trade History Integration**: Ensured calendar duration calculations match Trade History page accuracy
- **API Data Handling**: Better handling of historical trade data limitations for older trades

---

## Version 1.4.0 - September 27, 2025

### 🎨 UI/UX Improvements
- **Enhanced P&L Display**: Added professional P&L cards with multiple timeframes
  - Added 24h, 7d, 30d, 90d, and 180d realized P&L tracking
  - Individual cards for each timeframe with clean background styling
  - Color-coded profit/loss indicators (green/red)
  - Percentage calculations with proper error handling

- **Improved Data Formatting**: Standardized decimal places across the dashboard
  - All monetary values now display with exactly 2 decimal places
  - Stats cards, P&L values, and trading tables use consistent formatting
  - Removed redundant +/- signs (color coding provides clear indication)

- **Enhanced Equity Curve**: Fixed tooltip date display and improved chart functionality
  - Fixed "Jan 1" date bug - now shows correct dates for all data points
  - Added proper XAxis configuration for accurate timestamp handling
  - Improved tooltip content with precise date and equity values

### 🏗️ Layout & Structure Changes
- **Dashboard Layout Optimization**:
  - Moved Open Positions table to full width at bottom of dashboard
  - Removed Recent Trades section from main dashboard
  - Cleaner, more focused dashboard experience

- **Removed Duplicate Information**:
  - Eliminated duplicate USDT balance display in account cards
  - Streamlined account card layout for better readability

### 📊 New Trade History Page
- **Comprehensive Trade Analysis**: Brand new dedicated Trade History page
  - Advanced filtering system with multiple criteria:
    - Account filter (select specific account or view all)
    - Trading pair filter (BTCUSDT, ETHUSDT, etc.)
    - Side filter (Buy/Sell transactions)
    - Date range picker (From/To dates)
  - Smart pagination (50 trades per page)
  - Real-time trade count display
  - Active filters visualization with removable tags

- **Export Functionality**:
  - One-click CSV export of filtered trade data
  - Dynamic filename with current date
  - Export button shows filtered trade count
  - Respects all applied filters

- **Professional UI Design**:
  - Clean card-based layout
  - Responsive grid system for filters
  - Empty state messaging when no trades found
  - Consistent styling with rest of application

### 🧹 Code Quality & Performance
- **Removed Unused Code**:
  - Cleaned up trade-related imports and variables from Dashboard
  - Removed pagination logic no longer needed on main dashboard
  - Streamlined component dependencies

- **Enhanced Data Handling**:
  - Improved timestamp parsing for equity charts
  - Better error handling for P&L calculations
  - Optimized trade filtering and sorting algorithms

### 🚀 Navigation Improvements
- **New Navigation Option**:
  - Added "Trade History" menu item to sidebar
  - Professional document icon for easy identification
  - Seamless integration with existing navigation system

### 🔧 Technical Improvements
- **Chart Enhancements**:
  - Fixed Recharts XAxis configuration for proper time-based display
  - Improved tooltip accuracy by accessing data from payload
  - Better timestamp handling across all chart components

- **Data Precision**:
  - Enhanced number formatting with consistent decimal places
  - Improved percentage calculations with proper rounding
  - Better handling of edge cases in P&L calculations

### 📊 Enhanced Open Positions Table (Added Later in Session)
- **Improved Position Display**: Enhanced open positions table with comprehensive information
  - Added **Date & Time** column showing position creation date and time
  - Added **Leverage** column (displays leverage multiplier like "10x" or "N/A" if unavailable)
  - Changed **Buy/Sell** to **Long/Short** for clearer position indication
  - Added **Exchange** column to support future multi-exchange functionality (currently shows "Bybit")
  - Professional styling with consistent formatting and color coding

- **Technical Improvements**:
  - Enhanced position interface to include optional leverage field
  - Improved date formatting with readable date and 24-hour time format
  - Added exchange support infrastructure for future expansion
  - Maintained responsive design for all screen sizes

### 🔐 Account Management Security Enhancements (Added Later in Session)
- **Enhanced API Key Security**: Improved security for sensitive account information
  - **Masked API Key Display**: API keys now show as "ABCD••••••••XYZA" instead of showing partial keys
  - **Edit Account Functionality**: Added edit button for each account to update expired or invalid API keys
  - **Secure Edit Modal**: Professional edit interface with form validation and error handling
  - **Complete Account Update**: Edit functionality allows updating name, API key, secret, and testnet status

- **User Experience Improvements**:
  - Side-by-side Edit and Remove buttons for better account management
  - Consistent form validation across add and edit operations
  - Clear error messaging for expired or invalid API keys
  - Professional modal design with proper loading states

- **Security Best Practices**:
  - API keys masked in all displays to prevent shoulder surfing
  - API secrets remain hidden in password fields
  - Secure account replacement process for updates
  - Maintained read-only API key security notice

### 🔧 Enhanced Trade History Filtering (Final Update)
- **Exchange Filter Addition**: Completed comprehensive filtering system
  - **Exchange Dropdown**: Added exchange filter to support future multi-exchange functionality
  - **Active Filter Display**: Exchange filter shows in active filters section with indigo color coding
  - **Filter Integration**: Exchange filter works seamlessly with existing account, pair, side, and date filters
  - **Clear Filters Support**: Exchange filter resets with "Clear All" functionality
  - **Responsive Design**: Updated grid layout to accommodate new filter (7-column responsive grid)

### 🌐 Multi-Exchange Support Implementation (Major Feature)
- **Exchange Integration**: Full support for Bybit, Toobit, and BloFin exchanges
  - **Unified API Architecture**: Created exchange factory pattern to manage all exchange APIs
  - **Exchange-Specific Services**: Individual API implementations for each exchange with proper authentication
  - **Universal Data Models**: Unified data structures for accounts, balances, positions, trades, and P&L across all exchanges
  - **Backward Compatibility**: Existing Bybit accounts automatically migrated to new format

- **Enhanced Account Management**:
  - **Exchange Selection**: Dropdown to choose exchange when adding accounts (Bybit, Toobit, BloFin)
  - **Exchange-Specific Forms**: Dynamic form fields based on selected exchange (e.g., BloFin access passphrase)
  - **Visual Exchange Indicators**: Color-coded badges showing exchange type for each account
  - **Smart Validation**: Exchange-specific credential validation and error handling

- **API Implementation Details**:
  - **Toobit Integration**: Complete spot trading API with HMAC SHA256 authentication
  - **BloFin Integration**: Futures trading API with access passphrase support and advanced order handling
  - **Exchange Factory**: Centralized service routing requests to appropriate exchange APIs
  - **Unified Response Format**: All exchanges return data in consistent format for seamless dashboard integration

- **Technical Infrastructure**:
  - **Multi-Exchange Storage**: Enhanced storage service supporting all exchange account types
  - **State Management**: Updated Zustand store to handle unified account data and multi-exchange operations
  - **Historical Data**: Maintained Bybit historical cache while preparing infrastructure for other exchanges
  - **Error Handling**: Exchange-specific error messages and validation

---

### 📝 Future Enhancement Ideas
- Real-time trade updates
- Advanced trade analytics (win rate by pair, monthly summaries)
- Additional export formats (Excel, PDF)
- Trade search functionality
- Custom date range presets (Last 7 days, Last month, etc.)
- Favorite trading pairs for quick filtering

---

*This version focuses on professional data presentation, enhanced user experience, and comprehensive trade analysis capabilities.*