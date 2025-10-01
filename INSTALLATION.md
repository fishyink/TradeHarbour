# Installation Guide

## Download

Download the appropriate version for your operating system from the [latest release](https://github.com/fishyink/TradeHarbour-Desktop/releases/latest):

- **TradeHarbour-macOS-Intel.zip** - For Intel-based Macs (x64)
- **TradeHarbour-macOS-Apple-Silicon.zip** - For M1/M2/M3/M4 Macs (arm64)
- **TradeHarbour-Windows.zip** - For Windows (x64)

## macOS Installation

### Step 1: Download and Extract
1. Download the appropriate ZIP file for your Mac
2. Double-click the ZIP to extract it
3. You should see **TradeHarbour.app**

### Step 2: Move to Applications
Drag **TradeHarbour.app** to your **Applications** folder

### Step 3: First Launch
Since the app is not signed with an Apple Developer certificate, you need to allow it to run:

**Option A: Right-Click Method (Easiest)**
1. Right-click (or Control+click) on TradeHarbour.app
2. Select **Open** from the menu
3. Click **Open** in the dialog that appears
4. The app should now launch

**Option B: System Preferences Method**
1. Try to open TradeHarbour normally
2. macOS will block it and show an error
3. Go to **System Preferences** > **Security & Privacy** > **General**
4. You'll see a message about TradeHarbour being blocked
5. Click **Open Anyway**

**Option C: Terminal Method (If you see "damaged" or "corrupt" error)**
If you get an error saying the app is "damaged" or "corrupt", it's actually just macOS's Gatekeeper protection. Run this command in Terminal:

```bash
xattr -cr /Applications/TradeHarbour.app
```

Then try opening the app normally.

### Troubleshooting macOS

**"TradeHarbour.app is damaged and can't be opened"**
- This is a false positive from macOS Gatekeeper
- Run: `xattr -cr /Applications/TradeHarbour.app`
- Then try opening again

**"TradeHarbour.app can't be opened because it is from an unidentified developer"**
- Use the Right-Click method described above
- Or go to System Preferences > Security & Privacy and click "Open Anyway"

**App won't launch at all**
- Make sure you downloaded the correct version (Intel vs Apple Silicon)
- Check if you have the correct permissions: `ls -l /Applications/TradeHarbour.app`
- Try running from Terminal: `/Applications/TradeHarbour.app/Contents/MacOS/TradeHarbour`

## Windows Installation

### Step 1: Download and Extract
1. Download **TradeHarbour-Windows.zip**
2. Right-click the ZIP and select **Extract All**
3. Choose a location to extract

### Step 2: Install
1. Open the extracted folder
2. Double-click the **TradeHarbour Setup.exe** installer
3. Follow the installation wizard
4. Launch TradeHarbour from the Start Menu or Desktop shortcut

### Troubleshooting Windows

**"Windows protected your PC" message**
- Click **More info**
- Click **Run anyway**
- This happens because the app is not signed with a Microsoft certificate

**Antivirus blocking the app**
- Some antivirus software may flag unsigned apps
- Add an exception for TradeHarbour in your antivirus settings
- The app is safe - you can verify by checking the source code on GitHub

## Support

If you encounter any issues:
1. Check the [GitHub Issues](https://github.com/fishyink/TradeHarbour-Desktop/issues)
2. Open a new issue with details about your problem
3. Include your operating system version and error messages
