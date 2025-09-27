# ⚓ Trade Harbour
**One harbour, one dashboard, all your trades.**

A modern, open-source trading dashboard for monitoring multiple cryptocurrency accounts. Built with Electron, React, TypeScript, and Tailwind CSS.

![Trade Harbour](https://img.shields.io/badge/Trade%20Harbour-v1.3.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![GitHub](https://img.shields.io/badge/GitHub-fishyink%2Ftradeharbour-black.svg)

---

## 🌊 What is Trade Harbour?

Trade Harbour brings all your cryptocurrency trading accounts into one secure dashboard. Monitor multiple exchanges, track performance, and analyze your trading data - all from a single interface.

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

### Prerequisites
- **Node.js 18+** and npm
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fishyink/tradeharbour.git
   cd tradeharbour
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

### First Launch

1. Navigate to "Accounts" in the sidebar
2. Add your Bybit API keys (read-only recommended)
3. Start monitoring your trading data

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

<div align="center">

**⚓ Trade Harbour ⚓**

*One harbor, one dashboard, all your trades.*

**[🌟 Star on GitHub](https://github.com/fishyink/tradeharbour)** • **[🐛 Report Issues](https://github.com/fishyink/tradeharbour/issues)**

</div>