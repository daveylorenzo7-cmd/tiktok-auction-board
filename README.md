# 🎯 TikTok Overlay Studio

A professional TikTok live streaming overlay platform similar to TikLink, HypeCode Studio, and 14alls. Features real-time coin leaderboards, customizable overlays, and live streaming tools.

## ✨ Features

- **🎨 Professional Design** - Modern glassmorphism UI with gradients and animations
- **🏆 Real-time Leaderboards** - Live TikTok coin tracking with medal rankings
- **🎛️ Control Panel** - Manual bidding, test data, and leaderboard management
- **📊 Status Monitoring** - Live connection status for server and TikTok
- **📱 Responsive** - Works perfectly on desktop, tablet, and mobile
- **⚡ Quick Actions** - Clear leaderboard, add test data, instant controls
- **🎭 OBS Ready** - Perfect for live streaming overlays
- **🔴 Live Updates** - Real-time synchronization across all viewers

## 🎨 Design Features

- **Glassmorphism UI** - Modern frosted glass effects
- **Gradient Accents** - Vibrant color schemes with TikTok branding
- **Smooth Animations** - Slide-in effects and hover transitions
- **Custom Scrollbars** - Themed scrolling for leaderboard
- **Status Indicators** - Visual connection status with icons
- **Notification System** - Toast notifications for user feedback

## Quick Start

**Without TikTok (for testing):**
```bash
npm start
```

**With TikTok integration:**
```bash
# Replace 'your_username' with your actual TikTok username
TIKTOK_USERNAME=your_username npm start
```

**On Windows PowerShell:**
```powershell
$env:TIKTOK_USERNAME="your_username"; npm start
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure TikTok Username:**
   Set your TikTok username in one of these ways:
   - Environment variable: `TIKTOK_USERNAME=your_username npm start`
   - Or edit `server.js` and replace `'your_tiktok_username'` with your actual username

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Visit `http://localhost:3000`

## How It Works

1. **TikTok Integration:** The server connects to your TikTok live stream using the `tiktok-live-connector` library
2. **Real-time Updates:** When viewers send gifts/coins, they're automatically added to the leaderboard
3. **Live Display:** The leaderboard updates in real-time for all viewers of your website
4. **Manual Bids:** You can also manually add bids for testing or special cases

## Control Panel Features

- **Manual Bid Entry** - Add custom bids with username and coin amount
- **Clear Leaderboard** - Reset all data with confirmation
- **Add Test Data** - Populate with sample users for testing
- **Status Monitoring** - Real-time connection status for server and TikTok
- **Keyboard Shortcuts** - Press Enter to submit bids quickly

## TikTok Setup

1. **Go live on TikTok** with your username
2. **Set your username:** `TIKTOK_USERNAME=your_username npm start`
3. **Open the website** at `http://localhost:3000`
4. **Share the URL** with your viewers so they can see the live leaderboard
5. **Watch coins appear** as viewers send gifts!

## OBS Integration

This overlay is perfect for OBS Studio:

1. **Add Browser Source** in OBS
2. **Set URL** to `http://localhost:3000`
3. **Set Width/Height** to your desired overlay size
4. **Enable "Shutdown source when not visible"** for performance
5. **Position** the overlay where you want it on stream

## Customization

- **Colors:** Edit CSS variables in `index.html` for custom branding
- **Layout:** Modify the grid layout for different screen arrangements
- **Animations:** Adjust timing and effects in the CSS
- **Fonts:** Change typography by updating the Google Fonts link

## Requirements

- Node.js 14+
- A TikTok account with live streaming enabled
- Your TikTok username for the live connector
- Modern web browser with WebSocket support

## Troubleshooting

- **"Cannot connect to TikTok Live"**: Make sure your username is correct and you're currently live streaming
- **No gifts appearing**: Check that viewers are sending gifts during your live stream
- **Server not starting**: Ensure port 3000 is available
- **OBS not showing overlay**: Check browser source settings and CORS policies

## Similar to

This platform provides similar functionality to:
- **TikLink** - Professional overlay tools
- **HypeCode Studio** - Live streaming enhancements
- **14alls** - Stream overlay platforms

Enjoy your professional TikTok overlay studio! 🎉</content>
<parameter name="filePath">c:\Users\davey\OneDrive\Desktop\Auction board\README_new.md