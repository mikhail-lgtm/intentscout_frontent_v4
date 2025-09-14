# Local Development Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   # или
   npm install
   ```

2. **Start development server:**
   ```bash
   pnpm dev
   # или
   npm run dev
   ```

3. **Open in browser:**
   - Frontend: `http://localhost:5173`
   - USG Demo page: `http://localhost:5173/usg-demo`

## Backend Setup (for USG Demo)

1. **Start USG demo backend:**
   ```bash
   cd ../code/api_v4_usg_cc
   python main.py
   # Runs on http://localhost:8081
   ```

2. **Configure proxy (if needed):**
   - Frontend calls `/api/usg/*` 
   - Should proxy to `http://localhost:8081/api/usg/*`
   - Check `vite.config.ts` for proxy settings

## Available Pages

- `/` - Main signals page (Customertimes data)
- `/signals` - Same as above  
- `/outreach` - Outreach page
- `/settings` - Settings
- `/usg-demo` - USG ConstructConnect demo (separate data)

## Development Notes

- Frontend runs on port 5173 (Vite default)
- Backend API on port 5060 (main api_v4)
- USG demo backend on port 8081
- Hot reload enabled for both frontend and backend changes
