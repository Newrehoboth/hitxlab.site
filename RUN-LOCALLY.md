# 🚀 Run HITXLAB Locally

## Prerequisites
You need **Node.js** installed on your Mac.

### Install Node.js (if not installed):
1. Open Terminal
2. Install Homebrew (if not installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install Node.js:
   ```bash
   brew install node
   ```

## Run the Dev Server

1. **Open Terminal** and navigate to project:
   ```bash
   cd "/Users/user/Documents/beats_market/newone/beat-boutique-hq"
   ```

2. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

3. **Start the dev server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   - The terminal will show a URL like: `http://localhost:5173`
   - Open that URL in your browser
   - Any changes you make will reload automatically! 🔥

## Stop the Server
Press `Ctrl + C` in the terminal

---

## Quick Commands
- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Check for errors**: `npm run lint`
