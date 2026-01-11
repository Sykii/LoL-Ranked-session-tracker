# 🎮 LoL Session Tracker

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F.svg)

**Track your League of Legends ranked sessions in real-time with a beautiful Discord-style interface and floating overlay**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Screenshots](#-screenshots) • [FAQ](#-troubleshooting)

</div>

---

## ✨ Features

### 🎨 Modern Discord-Style Interface (NEW in 3.0!)
- 🖼️ **Frameless window** with custom title bar
- 🎯 **Integrated window controls** (minimize, maximize, close)
- 🌙 **Dark theme** with smooth gradients
- 📱 **Draggable title bar** for window movement
- ⚙️ **Collapsible sections** for clean organization
- 🎨 **Professional design** with attention to detail

### 🎯 Dual Tracking Modes

#### **SINGLE Mode** - Active Account Tracking
- 📊 Real-time LP, rank, and division tracking
- 🔥 Session statistics (W/L, Net LP, Winrate)
- 📈 Total games and winrate display
- ⚡ Auto-refresh every 90 seconds
- 🎨 **Tryhard Mode** with special visual effects

#### **MULTI Mode** - Multi-Account Rotation
- 🔄 Auto-rotate through all your accounts (configurable interval)
- 💾 Independent session tracking per account
- 📊 Individual stats for each account
- ⚡ Smart caching system (91% fewer API requests)
- 🎨 Works with Tryhard Mode
- ⚙️ **Configurable rotation speed** (3-30 seconds)

### 🖥️ Overlay System

#### **Electron Overlay** (In-App)
- 🪟 Always-on-top floating window
- 🎯 Click-through enabled
- 📍 Draggable and position-saving
- 🎨 Beautiful glassmorphism design

#### **OBS Overlay** (For Streaming)
- 📹 Browser source compatible
- 🔄 Auto-updates every 2 seconds
- 🎬 Smooth transitions between accounts
- 💯 Identical design to Electron overlay

### 🎨 Visual Features

- **Discord-Style Interface** - Modern frameless window with custom controls
- **Collapsible Sections** - Organized UI with expandable panels
- **Custom Title Bar** - Integrated minimize, maximize, close buttons
- **Rank Icons** - Animated rank emblems with glow effects
- **Color-Coded Stats** - Green for wins, red for losses
- **Tryhard Mode** - 🔥 Epic red visual effects with pulsing animations
- **MULTI + Tryhard** - 🌟 Combined red-purple gradient effects
- **Smooth Transitions** - Fade and slide animations between accounts

### 🔧 Technical Features

- ✅ **Smart API Caching** - Reduces API calls by 91% in MULTI mode
- ✅ **Rate Limit Safe** - Respects Riot API rate limits
- ✅ **Session Persistence** - Tracks session from app start
- ✅ **Multi-Account Support** - Unlimited accounts
- ✅ **Automatic Updates** - Real-time data refresh
- ✅ **Error Handling** - Robust error recovery

---

## 📸 Screenshots

### SINGLE Mode
```
┌─────────────────────────────┐
│  Sykii#1509                │
│  ◆ DIAMOND IV               │
│  50 LP | 55% WR (100W-80L)  │
│  +15 LP                     │
│                             │
│  SESIÓN: 75% WR             │
│  3W - 1L                    │
└─────────────────────────────┘
```

### MULTI Mode
```
┌─────────────────────────────┐
│  AltAccount#EUW1           │  ← Rotates every 8s
│  ◆ PLATINUM I               │
│  80 LP | 60% WR (150W-100L) │
│  -5 LP                      │
│                             │
│  SESIÓN: 33% WR             │
│  1W - 2L                    │
└─────────────────────────────┘
```

### Tryhard Mode
```
╔═════════════════════════════╗
║ 🔥 Sykii#1509 !TRYHARD    ║  ← Red glow + animations
║  ◆ DIAMOND IV               ║
║  50 LP | 55% WR (100W-80L)  ║
║  +15 LP                     ║
║                             ║
║  SESIÓN: 75% WR             ║
║  3W - 1L                    ║
╚═════════════════════════════╝
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Riot API Key** ([Get one here](https://developer.riotgames.com/))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/lol-session-tracker.git
cd lol-session-tracker

# Install dependencies
npm install

# Start the app
npm start
```

### First-Time Setup

1. **Get your Riot API Key**
   - Go to https://developer.riotgames.com/
   - Sign in with your Riot account
   - Copy your Development API Key

2. **Configure the app**
   - Open the app
   - Click Settings (⚙️)
   - Paste your API Key
   - Click "Save API Key"

3. **Add your accounts**
   - Enter your Summoner Name and Tag (e.g., `Sykii#1509`)
   - Select your region
   - Click "Add Account"

4. **Start tracking!**
   - Select an account and click "Set as Active"
   - The overlay will appear automatically

---

## 📖 Usage

### Basic Tracking (SINGLE Mode)

1. **Select an account** from the list
2. Click **"Set as Active"**
3. The overlay shows:
   - Current rank and LP
   - Total winrate and games
   - Session W/L and net LP
   - Session winrate

### Multi-Account Rotation (MULTI Mode)

1. Add multiple accounts to your list
2. Click **"Switch to MULTI Mode"**
3. The overlay will:
   - Rotate through all accounts every 8 seconds
   - Show individual session stats for each account
   - Use smart caching to reduce API calls

### Tryhard Mode 🔥

- Click the **"!TRYHARD"** button
- Activates special visual effects:
  - Red glowing border
  - Pulsing animations
  - Epic "!TRYHARD" badge
- Works in both SINGLE and MULTI modes

### OBS Integration

1. In OBS, add a **Browser Source**
2. Set as **Local file**
3. Browse to: `path/to/project/obs/overlay.html`
4. Set dimensions: **340 x 200**
5. Check **"Refresh browser when scene becomes active"**

---

## ⚙️ Configuration

### Settings Panel

Access via the ⚙️ icon in the main window:

- **API Key** - Your Riot API key
- **Region** - Default region for new accounts
- **Overlay Position** - Automatically saved when moved

### Configuration File

Located at:
- **Windows**: `%APPDATA%/lol-session-tracker/config.json`
- **macOS**: `~/Library/Application Support/lol-session-tracker/config.json`
- **Linux**: `~/.config/lol-session-tracker/config.json`

---

## 🏗️ Architecture

### Project Structure

```
lol-session-tracker/
├── app/
│   ├── index.html           # Main window
│   └── overlay.html         # Electron overlay
├── obs/
│   ├── overlay.html         # OBS browser source
│   └── data.json           # Auto-generated data file
├── src/
│   ├── accountManager.js    # Account management
│   ├── sessionManager.js    # Session tracking (SINGLE)
│   ├── multiModeManager.js  # Multi-mode rotation
│   ├── multiSessionManager.js # Session tracking (MULTI)
│   └── riotApi.js          # Riot API wrapper
├── assets/
│   └── ranks/              # Rank icons
├── main.js                 # Electron main process
├── preload.js              # IPC bridge
├── renderer.js             # Main window logic
└── config.json             # User configuration
```

### Key Components

#### **AccountManager**
Manages multiple League accounts with CRUD operations.

#### **SessionManager** (SINGLE Mode)
Tracks session for the active account:
- Initial LP snapshot
- W/L counting
- Net LP calculation

#### **MultiSessionManager** (MULTI Mode)
Independent session tracking for each account in rotation.

#### **MultiModeManager**
Handles account rotation with configurable intervals and transition events.

#### **RiotAPI**
Wrapper around Riot API with:
- Smart caching (30s for general, 90s for MULTI)
- Rate limit protection
- Error handling

---

## 🎯 API Rate Limits

### Without Caching (MULTI Mode)
- **3 accounts** × (3600s / 8s) = **1,350 requests/hour** ❌
- **Exceeds Riot limits** → API key banned

### With Caching (90s TTL)
- **3 accounts** × (3600s / 90s) = **120 requests/hour** ✅
- **91% reduction** in API calls
- Safe for production use

### Cache Behavior

```
Account A shown → API request (cached for 90s)
8s later → Account B shown → API request (cached for 90s)
16s later → Account C shown → API request (cached for 90s)
24s later → Account A shown → Cache HIT ⚡ (no API call)
32s later → Account B shown → Cache HIT ⚡
...
90s later → Account A shown → Cache expired → New API request
```

---

## 🐛 Troubleshooting

### API Key Issues

**Error 401: "Unknown apikey"**

✅ **Solutions:**
1. Regenerate your API key (they expire every 24 hours)
2. Make sure you saved it in Settings
3. Restart the app after saving
4. Check for extra spaces when copying

### Overlay Not Showing

✅ **Solutions:**
1. Check that an account is set as active
2. Make sure the overlay window isn't minimized
3. Try moving it (it might be off-screen)
4. Restart the app

### MULTI Mode Not Rotating

✅ **Solutions:**
1. Make sure you have 2+ accounts added
2. Click "Switch to MULTI Mode"
3. Check console for errors
4. Verify all accounts have valid summoner names

### OBS Overlay Not Updating

✅ **Solutions:**
1. Verify the path to `obs/overlay.html` is correct
2. Check that `obs/data.json` exists and updates
3. Right-click the source → Refresh browser
4. Make sure local file is checked

---

## 🔒 Privacy & Security

- ✅ **All data stored locally** - No external servers
- ✅ **API key encrypted** - Stored in electron-store
- ✅ **No telemetry** - No tracking or analytics
- ✅ **Open source** - Audit the code yourself

---

## 🛠️ Development

### Build from Source

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build

# Package for distribution
npm run dist
```

### Debug Mode

Enable DevTools for the overlay:

```javascript
// main.js line ~84
overlayWindow.webContents.openDevTools({ mode: 'detach' });
```

### Tech Stack

- **Electron** 28.0.0 - Desktop app framework
- **Electron Store** - Persistent configuration
- **Axios** - HTTP client for Riot API
- **Node.js** 18+ - Runtime environment

---

## 📝 Changelog

### v3.0.0 (Latest) - Discord-Style UI Redesign 🎨
- ✅ **Frameless window** with custom title bar
- ✅ **Integrated window controls** (minimize, maximize, close)
- ✅ **Draggable title bar** for window movement
- ✅ **Collapsible sections** for better organization
- ✅ **MULTI mode configuration panel** with adjustable rotation speed
- ✅ **Modern dark theme** inspired by Discord
- ✅ **Improved layout** with better space utilization
- ✅ **Enhanced visual polish** throughout the app

### v2.7.1 - MULTI Mode Configuration
- ✅ Configurable rotation interval (3-30 seconds)
- ✅ Visual feedback on configuration changes
- ✅ Account counter in MULTI mode

### v2.6.2 - MULTI Mode Handlers
- ✅ Fixed IPC handlers for MULTI mode
- ✅ Switch between SINGLE/MULTI modes
- ✅ Proper state management

### v2.6.0 - Collapsible UI
- ✅ Expandable/collapsible sections
- ✅ Cleaner interface organization
- ✅ Better first-time user experience

### v2.5.0 - Production Ready
- ✅ Removed debugging logs
- ✅ Optimized for production
- ✅ Clean console output

### v2.4.8 - Animation Fixes
- ✅ Fixed animations in tryhard + MULTI mode
- ✅ Added `!important` to transition animations

### v2.4.0 - Total W/L Display
- ✅ Show total wins/losses next to winrate
- ✅ Format: `55% WR (100W-80L)`

### v2.3.0 - Cache System
- ✅ Smart caching for MULTI mode
- ✅ 91% reduction in API calls
- ✅ Configurable TTL (90s default)

### v2.2.0 - MULTI Mode Sessions
- ✅ Independent sessions per account
- ✅ Tryhard mode in MULTI
- ✅ Session W/L visible in MULTI

### v2.0.0 - MULTI Mode
- ✅ Multi-account rotation
- ✅ Account transitions with animations
- ✅ Dual overlay system (Electron + OBS)

### v1.0.0 - Initial Release
- ✅ SINGLE mode tracking
- ✅ Floating overlay
- ✅ Session statistics

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation if needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Riot Games** for the League of Legends API
- **Electron** team for the amazing framework
- **Community** for feedback and suggestions

---

## 📞 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/yourusername/lol-session-tracker/issues)
- 💡 **Feature Requests**: [Open an issue](https://github.com/yourusername/lol-session-tracker/issues)
- 📧 **Contact**: your.email@example.com

---

## ⚠️ Disclaimer

**LoL Session Tracker** is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

This is a third-party application that uses the official Riot Games API. Use at your own risk.

---

<div align="center">

**Made with ❤️ for the League of Legends community**

⭐ Star this repo if you find it useful!

[Report Bug](https://github.com/yourusername/lol-session-tracker/issues) • [Request Feature](https://github.com/yourusername/lol-session-tracker/issues)

</div>
