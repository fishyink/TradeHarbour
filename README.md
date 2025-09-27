# ⚓ Trade Harbour
**One harbour, one dashboard, all your trades.**

A modern, open-source desktop application for monitoring and analyzing multiple cryptocurrency trading accounts. Built with Electron, React, TypeScript, and Tailwind CSS.

![Trade Harbour](https://img.shields.io/badge/Trade%20Harbour-v1.3.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![GitHub](https://img.shields.io/badge/GitHub-fishyink%2Ftradeharbour-black.svg)

---

## 🌊 What is Trade Harbour?

Trade Harbour is your **unified trading command center** – bringing all your cryptocurrency accounts into one powerful, secure dashboard. Whether you're managing multiple exchange accounts or tracking complex trading strategies, Trade Harbour provides the insights and tools you need.

### 🎯 **Why Trade Harbour?**
- **One Harbour**: Centralized view of all your trading accounts
- **One Dashboard**: Unified interface for comprehensive analysis
- **All Your Trades**: Complete visibility across exchanges and strategies

---

## ✨ Features

### 🏦 **Multi-Exchange Support**
- **Bybit**: Full integration with portfolio tracking and analytics
- **Multiple Accounts**: Monitor unlimited accounts per exchange
- **Secure Storage**: AES-256 encrypted local storage for API keys
- **Testnet Support**: Safe testing environment

### 📊 **Comprehensive Analytics**
- **Portfolio Overview**: Total equity and performance across all accounts
- **Real-time Tracking**: Live balance, positions, and trade updates
- **Performance Metrics**: Win rate, P&L tracking, max drawdown analysis
- **Historical Data**: Complete trade history and equity curves

### 🎨 **Custom Dashboard System**
- **Smart Card Generator**: AI-powered component creation with ChatGPT/Claude
- **Dynamic Rendering**: Real-time data visualization in custom components
- **Drag & Drop**: Arrange your dashboard exactly how you want it
- **Size Controls**: Small, medium, and large card layouts

### 📈 **Advanced Charting**
- **Interactive Charts**: Zoom, pan, and analyze with precision
- **Equity Curves**: Combined and per-account performance visualization
- **Responsive Design**: Beautiful charts that adapt to any screen size
- **Dark/Light Themes**: Professional styling for any environment

### 🔒 **Security First**
- **Local Storage Only**: Your data never leaves your machine
- **Read-Only API**: Recommended for maximum security
- **Encrypted Keys**: AES-256 encryption for all sensitive data
- **No External Servers**: Complete privacy and control

### 📤 **Data Export & Analysis**
- **CSV Export**: Complete trade and position data
- **Configurable Ranges**: Export exactly what you need
- **Excel Compatible**: Ready for your favorite analysis tools
- **Backup Ready**: Secure your trading history

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Git**
- **Windows, macOS, or Linux**

### Installation

1. **Clone Trade Harbour**
   ```bash
   git clone https://github.com/fishyink/tradeharbour.git
   cd tradeharbour
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Launch Development Mode**
   ```bash
   npm run dev
   ```

   Trade Harbour will open with hot reload enabled for development.

4. **Build for Production** (Optional)
   ```bash
   npm run build
   ```

### 🎮 First Launch

**Option 1: Demo Mode** (Recommended)
- Click "Demo Mode" to explore features with sample data
- Perfect for understanding Trade Harbour's capabilities
- No API keys required

**Option 2: Connect Your Accounts**
- Navigate to "Accounts" in the sidebar
- Add your exchange API keys (read-only recommended)
- Start monitoring your real trading data

---

## 🔧 Configuration

### Adding Exchange Accounts

#### Bybit Setup
1. **Create API Keys**:
   - Login to [Bybit](https://bybit.com)
   - Go to Account & Security → API Management
   - Create new API key with **READ-ONLY** permissions
   - Copy API Key and Secret

2. **Add to Trade Harbour**:
   - Open Trade Harbour → Accounts
   - Click "Add Account"
   - Enter account name, API key, and secret
   - Select mainnet or testnet
   - Click "Add Account"

### ⚠️ Security Best Practices

- **Always use READ-ONLY API keys** – never grant trading permissions
- **Rotate keys regularly** for enhanced security
- **Verify permissions** before adding any API key
- **Keep backups** of your configuration (export feature available)

---

## 🎨 Custom Dashboard

### Smart Card Generator

Trade Harbour includes an AI-powered card generation system:

1. **Describe Your Idea**: Tell Trade Harbour what you want to visualize
2. **Choose Size**: Select small, medium, or large card layout
3. **Generate Prompt**: Get a complete AI prompt for ChatGPT/Claude
4. **Paste & Activate**: Add the generated component to your dashboard

### Supported Card Types
- **Portfolio Overviews**: Equity, P&L, volume metrics
- **Performance Analytics**: Win rates, trade statistics
- **Position Monitoring**: Real-time position tracking
- **Custom Visualizations**: Charts, tables, and more

### Component Features
- **Pattern Recognition**: Automatic detection of card types
- **Error Handling**: Detailed debugging for custom components
- **Responsive Design**: Adapts to different screen sizes
- **Live Data**: Real-time updates from your trading accounts

---

## 🛠️ Development

### Project Structure
```
trade-harbour/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   │   ├── CustomCards.tsx     # AI card generation system
│   │   ├── CustomDashboard.tsx # Dynamic dashboard renderer
│   │   └── Dashboard.tsx       # Main trading dashboard
│   ├── services/          # Exchange API integrations
│   ├── store/             # Zustand state management
│   └── types/             # TypeScript definitions
├── electron/              # Electron main process
└── dist/                  # Built application
```

### Available Scripts
```bash
npm run dev          # Development mode with hot reload
npm run build        # Production build
npm run build:win    # Windows executable
npm run build:mac    # macOS application
npm test             # Run test suite
```

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📊 Supported Exchanges

| Exchange | Status | Features |
|----------|--------|----------|
| **Bybit** | ✅ Full Support | Portfolio, Trades, Positions, Analytics |
| **Binance** | 🚧 Coming Soon | Portfolio tracking planned |
| **OKX** | 🚧 Planned | Integration roadmap |
| **Coinbase** | 🚧 Planned | API research phase |

*Want to add your exchange? [Open an issue](https://github.com/fishyink/tradeharbour/issues) or contribute!*

---

## ❓ Troubleshooting

### Common Issues

**API Connection Errors**
- Verify API key and secret are correct
- Ensure using correct environment (mainnet/testnet)
- Check API key permissions (read-only recommended)
- Confirm stable internet connection

**Performance Issues**
- Reduce auto-refresh frequency in Settings
- Close resource-intensive applications
- Try demo mode to isolate issues
- Clear application data and restart

**Custom Cards Not Rendering**
- Check error messages in card display
- Verify component code syntax
- Ensure proper data structure usage
- Try the Portfolio Overview template first

### Getting Help
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/fishyink/tradeharbour/issues)
- **Discussions**: [Community support and ideas](https://github.com/fishyink/tradeharbour/discussions)
- **Documentation**: Check this README for detailed instructions

---

## 🗺️ Roadmap

### Upcoming Features
- **Drag & Drop Dashboard**: Arrange cards with intuitive interface
- **More Exchanges**: Binance, OKX, Coinbase integrations
- **Advanced Analytics**: ML-powered insights and predictions
- **Mobile Companion**: Companion app for mobile monitoring
- **Cloud Sync**: Optional encrypted cloud backup
- **Team Features**: Multi-user and team dashboard sharing

### Version History
- **v1.3.1**: Custom Cards system, AI integration, improved UI
- **v1.2.0**: Multi-exchange foundation, enhanced security
- **v1.1.0**: Advanced charting, data export features
- **v1.0.0**: Initial release with Bybit integration

---

## 📄 License

Trade Harbour is open-source software licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Trading Community**: For inspiration and feedback
- **Bybit**: For providing robust API access
- **Electron**: Enabling cross-platform desktop development
- **React & TypeScript**: Modern development foundation
- **Tailwind CSS**: Beautiful, responsive design system

---

## ⚠️ Disclaimer

Trade Harbour is for informational and analysis purposes only. Always verify data independently and never use this application for automated trading decisions. The developers are not responsible for any trading losses, API key security issues, or financial decisions made using this software.

---

<div align="center">

**⚓ Welcome to Trade Harbour ⚓**

*One harbor, one dashboard, all your trades.*

**[🌟 Star on GitHub](https://github.com/fishyink/tradeharbour)** • **[📥 Download Latest](https://github.com/fishyink/tradeharbour/releases)** • **[🐛 Report Issues](https://github.com/fishyink/tradeharbour/issues)**

*Built with ❤️ for the cryptocurrency trading community*

</div>