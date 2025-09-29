# ⚓ Trade Harbour
**One harbour, one dashboard, all your trades.**

A modern, open-source **desktop application** for monitoring multiple cryptocurrency accounts. Built with Electron, React, TypeScript, and Tailwind CSS.

> **⚠️ IMPORTANT: This is a desktop application only**
> Trade Harbour is built with Electron and **will NOT run in web browsers**. You must download and install the desktop application to use it.

![Trade Harbour](https://img.shields.io/badge/Trade%20Harbour-v1.3.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![GitHub](https://img.shields.io/badge/GitHub-fishyink%2Ftradeharbour-black.svg)
![Platform](https://img.shields.io/badge/Platform-Desktop%20Only-red.svg)

---

## 🌊 What is Trade Harbour?

Trade Harbour brings all your cryptocurrency trading accounts into one secure **desktop dashboard**. Monitor multiple exchanges, track performance, and analyze your trading data - all from a single interface.

### 🖥️ Platform Requirements
- **Desktop Application**: Windows, macOS, or Linux
- **NOT supported**: Web browsers, mobile devices, online access
- **Requires**: Installation on your computer
- **Data Storage**: All data stays local and private on your machine

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

## 🚀 Quick Start

### Option 1: Download Release (Recommended)
1. **Download the latest release** from the [Releases](https://github.com/fishyink/tradeharbour/releases) page
2. **Extract and run** the executable file
3. **No installation required** - it's a portable application

### Option 2: Build from Source
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

### ⚙️ **Storage Modes - You Choose!**

Trade Harbour offers two storage modes for your data:

#### 🗂️ **System Mode (Default)**
- **Data location**: Windows AppData folder (`%APPDATA%\trade-harbour\`)
- **Pros**: Automatic data persistence, survives app updates, multiple installations possible
- **Best for**: Most users, permanent installations

#### 💾 **Portable Mode**
- **Data location**: `data/` folder next to the .exe file
- **Pros**: True portability, easy backups, USB-friendly, clear data ownership
- **Best for**: USB drives, temporary setups, multiple separate instances

> **Switch anytime**: Go to Diagnostics → Backup & Restore → Storage Mode

### 🚀 **How to Upgrade:**

#### If Using System Mode 🗂️
Your data **automatically persists** between versions:

1. **Download** the new version from [Releases](https://github.com/fishyink/tradeharbour/releases)
2. **Close** the current Trade Harbour application
3. **Replace** the old .exe file (or install anywhere)
4. **Run** the new version - all your data will be there!

#### If Using Portable Mode 💾
Your data travels with the application folder:

1. **Download** the new version
2. **Close** the current Trade Harbour application
3. **Copy your `data/` folder** to the new version directory
4. **Run** the new version - your data is preserved!

> **Pro tip**: In portable mode, you can also just replace the .exe file in your current folder

### 🛡️ **Built-in Backup & Restore**

Trade Harbour includes backup tools:

1. **Go to**: Diagnostics → Backup & Restore
2. **Export**: Creates a complete backup file
3. **Import**: Restores from backup file
4. **Switch Modes**: Migrate between storage modes safely

### 📍 **Find Your Data:**
- **System Mode**: `%APPDATA%\trade-harbour\`
- **Portable Mode**: `[AppFolder]\data\`
- **In-app**: Diagnostics → Backup & Restore shows current location

### ⚠️ **Important Notes:**
- **Choose your preferred storage mode** on first run
- **Never run multiple versions simultaneously** (data conflicts possible)
- **Always close the app before replacing** the executable
- **Export a backup** before major version changes

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