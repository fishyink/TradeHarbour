# ⚓ Trade Harbour
**One harbour, one dashboard, all your trades.**

## <span style="color: red; font-weight: bold; font-size: 1.5em;">⚠️ ELECTRON DESKTOP APP ONLY - NO BROWSER SUPPORT ⚠️</span>

### <span style="color: red; font-weight: bold;">🚨 IMPORTANT: This application ONLY runs in Electron - NOT in web browsers! 🚨</span>


A modern, open-source **Electron desktop application** for monitoring multiple cryptocurrency accounts. Built with Electron, React, TypeScript, and Tailwind CSS.

![Trade Harbour](https://img.shields.io/badge/Trade%20Harbour-v1.3.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![GitHub](https://img.shields.io/badge/GitHub-fishyink%2Ftradeharbour-black.svg)
![Platform](https://img.shields.io/badge/Platform-Desktop%20Only-red.svg)

---

## 🌊 What is Trade Harbour?

Trade Harbour brings all your cryptocurrency trading accounts into one secure **desktop dashboard**. Monitor multiple exchanges, track performance, and analyze your trading data - all from a single interface.

### 🖥️ Platform Requirements

#### ✅ Supported Platforms
- **Windows 10/11 (64-bit)** - Download ZIP release (recommended)
- **macOS** - Build from source only (requires Node.js)
- **Linux** - Build from source only (requires Node.js)


#### 🔧 Requirements
- **Desktop environment only** - runs as Electron application
- **Microsoft Visual C++ Redistributable** (Windows, usually pre-installed)
- **Data Storage**: All data stays local and portable with the app

## ❓ Troubleshooting

### White Screen / Won't Start?
If you see a blank white screen, try these solutions:

#### 1. **Install Visual C++ Redistributable** (Most Common Fix)
- Download from: [Microsoft Visual C++ Downloads](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)
- Install the **x64 version**
- Restart Trade Harbour

#### 2. **Update Windows**
- Ensure Windows 10/11 is updated to latest version
- Minimum: Windows 10 version 1903

#### 3. **Check Antivirus**
- Some antivirus software blocks unsigned executables
- Add Trade Harbour to your antivirus exceptions
- Windows Defender usually works fine

#### 4. **Run as Administrator**
- Right-click TradeHarbour.exe → "Run as administrator"
- This can resolve permission issues

#### 5. **Enable Debug Mode**
For advanced troubleshooting:
```cmd
set ELECTRON_DEBUG=1
TradeHarbour-1.4.8-portable.exe
```
This opens developer tools to see any error messages.

### Still Having Issues?
- Check [GitHub Issues](https://github.com/fishyink/tradeharbour/issues) for solutions
- Create a new issue with your system details

---

## ✨ Key Features

- **Multi-Exchange Support**: Bybit (full), Toobit & Blofin (beta)
- **Multi-Account Support**: Connect multiple accounts per exchange
- **Real-time Tracking**: Live balances, positions, and trades
- **Performance Analytics**: P&L tracking, win rates, equity curves
- **Secure Storage**: AES-256 encrypted local API key storage
- **Data Export**: CSV export for external analysis
- **Dark/Light Themes**: Professional interface design

---

## 🚀 How to Install & Run

### 🪟 **Windows Users - Easy Download** (Recommended)

<div style="background-color: #e8f5e8; border: 2px solid #4caf50; padding: 15px; border-radius: 5px; margin: 10px 0;">
<strong style="color: #2e7d32;">✅ Windows: Download Ready-to-Use ZIP Package</strong><br><br>

**Step 1:** Visit the [Releases](https://github.com/fishyink/tradeharbour/releases) page<br>
**Step 2:** Download **TradeHarbour-X.X.X-portable.zip**<br>
**Step 3:** Extract ZIP to any folder (Desktop, Documents, USB drive, etc.)<br>
**Step 4:** Double-click **TradeHarbour.exe** from extracted folder<br>
**Step 5:** Application opens in Electron window - start trading!<br><br>

**📁 What's in the ZIP:**<br>
✅ TradeHarbour.exe (main application)<br>
✅ data/ folder (your settings and trade data)<br>
✅ install-dependencies.bat (fixes white screen issues)<br>
✅ fix-white-screen.bat (quick troubleshooting)<br><br>

**💾 No installation needed** - it's 100% portable!
</div>

### 🍎 **Mac Users - Build from Source** (Technical Setup Required)

<div style="background-color: #fff3e0; border: 2px solid #ff9800; padding: 15px; border-radius: 5px; margin: 10px 0;">
<strong style="color: #e65100;">⚠️ Mac: No Pre-Built Downloads - Must Build Locally</strong><br><br>

**Prerequisites:** Terminal knowledge required<br><br>

**Step 1: Install Development Tools**
```bash
# Install Homebrew (package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and Git
brew install node git
```

**Step 2: Build Trade Harbour**
```bash
# Clone the repository
git clone https://github.com/fishyink/TradeHarbour.git
cd TradeHarbour

# Install dependencies and build
npm install

# Run Trade Harbour (opens in Electron window)
npm run dev
```

**✅ Result:** Trade Harbour opens as native Mac desktop app<br>
**📁 Data Location:** Creates local `data/` folder for your settings
</div>

### 🛠️ Advanced: Build from Source (All Platforms)
> **Note**: This requires technical knowledge and is only for developers

#### Prerequisites
- **Node.js 18+** and npm
- **Git**
- **Windows/Mac/Linux** (desktop environment required)

#### Development Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fishyink/tradeharbour.git
   cd tradeharbour
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development application**
   ```bash
   npm run dev
   ```

#### Building for Distribution
```bash
npm run build        # Build the application
npm run dist         # Create distributable packages
```

### First Launch

1. Navigate to "Accounts" in the sidebar
2. Add your Bybit API keys (read-only recommended)
3. Start monitoring your trading data

---

## 🔄 Upgrading to New Versions

### 💾 **Portable Application - Two Ways to Run**

Trade Harbour is a **100% portable application** that stores all data in a `data/` folder next to the executable. This means:

- ✅ **True portability** - run from USB drives, cloud folders, anywhere
- ✅ **Easy backups** - just copy the entire folder
- ✅ **No registry changes** - leaves your system clean
- ✅ **Multiple instances** - run different versions side by side
- ✅ **Clear data ownership** - you can see exactly where your data is

### 🚀 **Two Ways to Use Trade Harbour:**

#### 📦 **Option 1: Portable Release (Recommended)**
Download pre-built executable from GitHub releases:

**To upgrade:**
1. **Close** Trade Harbour
2. **Download** the new version from [Releases](https://github.com/fishyink/tradeharbour/releases)
3. **Copy your `data/` folder** to the new version directory
4. **Run** the new version - your data is preserved!

> **Pro tip**: Just replace the .exe file in your current folder to keep all data in place

#### 🛠️ **Option 2: Development from Source**
Clone and run from the Git repository:

**To upgrade:**
1. **Close** Trade Harbour
2. **Pull latest changes**: `git pull origin main`
3. **Update dependencies**: `npm install` (if needed)
4. **Start**: `npm run dev` - your data in the local `data/` folder remains

### 🛡️ **Built-in Backup & Restore**

Trade Harbour includes backup tools:

1. **Go to**: Diagnostics → Backup & Restore
2. **Export**: Creates a complete backup file
3. **Import**: Restores from backup file
4. **View Location**: See exactly where your data is stored

### 📍 **Data Location:**
- **Portable Release**: `[YourFolder]\data\`
- **Development**: `[RepoFolder]\data\`
- **In-app**: Diagnostics → Backup & Restore shows exact path

### ⚠️ **Important Notes:**
- **Your data travels with the app** - perfect for USB drives
- **Never run multiple versions simultaneously** from the same folder
- **Always close the app before replacing** the executable
- **Export a backup** before major version changes
- **No installation required** - just download and run

---

## 🔧 Exchange Setup

### Bybit (Full Support)
1. **Create API Keys**:
   - Login to [Bybit](https://bybit.com)
   - Go to Account & Security → API Management
   - Create new API key with **READ-ONLY** permissions
   - Copy API Key and Secret

2. **Add to Trade Harbour**:
   - Click "Add Account"
   - Enter account name, API key, and secret
   - Select mainnet or testnet

### Toobit & Blofin (Beta Testing)
- Limited functionality currently available
- Full integration coming soon
- Contact support for beta access

### ⚠️ Security

- **Always use READ-ONLY API keys**
- **Rotate keys regularly**
- **Your data stays local** - never shared externally

---

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## ⚠️ Disclaimer

Trade Harbour is for informational purposes only. Always verify data independently. Not responsible for trading decisions or losses.

---

## 🤝 Connect & Support

Hit me up on Discord over at the [Daviddtech community](https://discord.gg/daviddtech) to report bugs or request features!

**Discord**: @fishyink
**Daviddtech Community**: [Join Discord](https://discord.gg/daviddtech)

---

<div align="center">

**⚓ Trade Harbour ⚓**

*One harbor, one dashboard, all your trades.*

**[🌟 Star on GitHub](https://github.com/fishyink/tradeharbour)** • **[🐛 Report Issues](https://github.com/fishyink/tradeharbour/issues)**

</div>