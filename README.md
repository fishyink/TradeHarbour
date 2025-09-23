# Bybit Dashboard

A modern, open-source Windows desktop application for monitoring and analyzing multiple Bybit trading accounts. Built with Electron, React, TypeScript, and Tailwind CSS.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## 🚀 Features

### 📊 **Multi-Account Management**
- Monitor up to 100 Bybit accounts simultaneously
- Secure AES-256 encrypted local storage for API keys
- Support for both mainnet and testnet accounts
- Easy account addition and removal

### 📈 **Comprehensive Analytics**
- **Combined Overview**: Total equity across all accounts
- **Per-Account Dashboards**: Individual account metrics and breakdowns
- **Real-time Data**: Live balance, positions, and trade updates
- **Performance Metrics**: Win rate, P&L tracking, max drawdown analysis

### 📉 **Advanced Charting**
- Interactive equity curves with zoom and pan
- Combined and per-account equity visualization
- Historical performance tracking
- Responsive chart design with dark/light theme support

### 💼 **Trading Insights**
- Open positions monitoring with real-time P&L
- Recent trades history and analysis
- Symbol-level breakdown and performance
- Risk metrics and position sizing information

### 🔒 **Security First**
- Local AES encryption for API key storage
- Read-only API access recommended
- No data transmitted to external servers
- Clear security warnings and best practices

### 🎨 **Modern UI/UX**
- Dark and light theme support
- Clean, card-based responsive design
- Smooth animations and transitions
- Desktop-optimized interface

### 📤 **Data Export**
- Export trades to CSV format
- Export positions and equity history
- Configurable data ranges and filters
- Easy data backup and analysis

### 🔄 **Auto-Update System**
- Automatic updates via GitHub Releases
- Manual refresh and auto-refresh options
- Configurable refresh intervals (30s to 10min)
- Background update notifications

### 🎮 **Demo Mode**
- Explore features without API keys
- Sample data for UI testing
- Perfect for onboarding new users
- Safe environment for learning

## 📥 Installation

### Quick Install (Recommended)

1. **Download the installer**:
   - Go to the [Releases](https://github.com/fishyink/Dashboard/releases) page
   - Download the latest `Bybit-Dashboard-Setup-1.0.0.exe`

2. **Run the installer**:
   - Double-click the downloaded file
   - Follow the installation wizard
   - The app will be installed and available in your Start Menu

3. **First Run**:
   - Launch "Bybit Dashboard" from your Start Menu
   - Try Demo Mode first or add your API keys

### Manual Installation

If you prefer to build from source:

```bash
# Clone the repository
git clone https://github.com/your-username/bybit-dashboard.git
cd bybit-dashboard

# Install dependencies
npm install

# Build and package
npm run build:win
```

## 🔧 Setup & Configuration

### Adding Your First Account

1. **Create Bybit API Keys**:
   - Log into your Bybit account
   - Go to API Management
   - Create a new API key with **READ-ONLY** permissions
   - Copy your API Key and Secret

2. **Add Account to Dashboard**:
   - Open Bybit Dashboard
   - Navigate to "Accounts" in the sidebar
   - Click "Add Account"
   - Enter your account name, API key, and secret
   - Select mainnet or testnet
   - Click "Add Account"

### ⚠️ Important Security Notes

- **ALWAYS use read-only API keys** - never grant trading permissions
- API keys are encrypted and stored locally on your machine
- No data is transmitted to external servers
- Regularly rotate your API keys for security

### Demo Mode

Want to explore the features first?

1. Click "Demo Mode" in the header
2. Explore the dashboard with sample data
3. When ready, disable demo mode and add real accounts

## 🎯 Usage Guide

### Dashboard Overview

The main dashboard provides:
- **Total Equity**: Combined value across all accounts
- **Unrealized P&L**: Current open position profits/losses
- **Win Rate**: Percentage of profitable trades
- **Trade Count**: Total number of executed trades

### Account Management

- **View Accounts**: See all connected accounts in the sidebar
- **Account Status**: Green dot = connected, Red dot = error
- **Remove Accounts**: Use the "Remove" button with confirmation
- **Edit Accounts**: Remove and re-add with updated credentials

### Data Export

Export your data for external analysis:

1. **Trades Export**: Complete trade history with execution details
2. **Positions Export**: Current and historical position data
3. **Equity History**: Time-series equity data for charting

Export formats: CSV files compatible with Excel and other tools

### Settings & Customization

- **Theme**: Switch between dark and light modes
- **Auto-Refresh**: Configure automatic data updates (30s - 10min)
- **Demo Mode**: Toggle sample data for testing
- **Data Management**: Export configurations and clear data

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Windows development environment
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/bybit-dashboard.git
cd bybit-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open in development mode with hot reload enabled.

### Building

```bash
# Build for production
npm run build

# Package Windows installer
npm run build:win

# Development build
npm run build:main && npm run build:renderer
```

### Project Structure

```
bybit-dashboard/
├── src/                  # React frontend source
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and storage services
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── electron/            # Electron main process
│   ├── main.ts         # Main Electron process
│   └── preload.ts      # Preload script
├── dist/               # Built application
└── release/            # Packaged installers
```

## 🔄 Updates

### Automatic Updates

The app automatically checks for updates on startup and notifies you when new versions are available.

### Manual Updates

1. Download the latest installer from [Releases](https://github.com/your-username/bybit-dashboard/releases)
2. Run the installer - it will update your existing installation
3. Your data and settings will be preserved

## ❓ Troubleshooting

### Common Issues

**API Connection Errors**:
- Verify your API key and secret are correct
- Ensure you're using the right environment (mainnet/testnet)
- Check that your API key has sufficient permissions
- Confirm your internet connection is stable

**Installation Issues**:
- Run the installer as Administrator if needed
- Disable antivirus temporarily during installation
- Ensure you have sufficient disk space
- Try downloading the installer again

**Performance Issues**:
- Reduce auto-refresh frequency in Settings
- Close other resource-intensive applications
- Restart the application periodically
- Clear application data if needed

**Data Export Problems**:
- Ensure you have write permissions to the target folder
- Check available disk space
- Try exporting smaller date ranges
- Restart the application and try again

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this README for detailed instructions
- **Community**: Join discussions in GitHub Discussions

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow existing code style and conventions
- Add TypeScript types for new features
- Test thoroughly before submitting
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bybit** for providing the API that makes this possible
- **Electron** for enabling cross-platform desktop development
- **React** and **TypeScript** for the modern development experience
- **Tailwind CSS** for the beautiful, responsive design
- **Recharts** for powerful charting capabilities

## ⚠️ Disclaimer

This software is for informational purposes only. Always verify data independently and never use this application for automated trading decisions. The developers are not responsible for any trading losses or API key security issues.

---

**Happy Trading! 📈**

*Built with ❤️ for the crypto trading community*
