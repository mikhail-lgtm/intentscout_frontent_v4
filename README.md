# IntentScout Frontend

Modern React + TypeScript frontend for the IntentScout application.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
- `VITE_API_BASE_URL` - Backend API URL (defaults to https://api.intentscout.ai/)

### Development

```bash
npm run dev
```

Visit `http://localhost:5173`

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Supabase** - Authentication & database
- **Lucide React** - Icons

## 📁 Project Structure

```
src/
├── components/        # React components
│   ├── auth/         # Authentication components
│   ├── common/       # Shared components
│   ├── signals/      # Intent signals features
│   └── outreach/     # Outreach features
├── hooks/            # Custom React hooks
├── lib/              # Utilities and configuration
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

## 🔐 Authentication

The app uses Supabase for authentication with support for:
- Email/password login
- Magic link authentication
- Organization-based access control

## 🌐 API Integration

- Centralized API client with automatic token refresh
- Comprehensive error handling
- Request deduplication and caching
- TypeScript-first API definitions

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The project includes Vercel configuration for optimal deployment.

### Other Platforms

The build output is standard static files that can be deployed anywhere:

```bash
npm run build
# Deploy the `dist/` folder
```

## 🔧 Configuration

### API Configuration

Edit `src/lib/config.ts` to modify:
- API endpoints
- Timeout settings
- Feature flags
- Environment detection

### Supabase Configuration

Update Supabase settings in your project dashboard:
- Site URL: `https://app.intentscout.ai`
- Redirect URLs: Add your domain to allowed redirects

## 🎯 Features

- **Intent Signals Dashboard** - View and manage company intent data
- **Filtering & Search** - Advanced filtering with real-time updates
- **Responsive Design** - Optimized for all screen sizes
- **Real-time Updates** - Live data synchronization
- **Export Capabilities** - Data export functionality

## 🛠️ Development

### Code Style

- ESLint for code linting
- TypeScript for type checking
- Prettier-compatible Tailwind classes

### Testing

```bash
npm run lint        # Lint code
npm run build       # Type check + build
```

## 📄 License

Private - All rights reserved.
