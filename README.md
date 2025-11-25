# Telemetry Rush - Frontend Application

A modern React-based frontend application for real-time race telemetry visualization, analysis, and insights. Built with React, TypeScript, Three.js, and Tailwind CSS.

## 🚀 Features

### Core Visualization
- **Real-Time Telemetry**: Live GPS tracking, speed, throttle, brake, and gear data
- **3D Track Visualization**: Interactive 3D track rendering with Three.js
- **2D Track Map**: Google Maps integration with vehicle positions and paths
- **Multi-Vehicle Support**: Track multiple vehicles simultaneously
- **Weather Display**: Real-time weather conditions and track temperature

### Race Management
- **Playback Controls**: Start, pause, resume, restart, and speed control
- **Race Lifecycle**: Automatic race finish detection and celebration
- **Leaderboard**: Real-time race positions, gaps, and lap information
- **Lap Charts**: Visual lap time comparisons and trends

### Analysis & Insights
- **Driver Training & Insights**: Racing line comparison, braking analysis, cornering analysis
- **Post-Event Analysis**: Comprehensive race story and performance comparison
- **Real-Time Analytics**: Gaps, pit windows, strategy insights, tire degradation
- **Predictive Analysis**: Lap time prediction and performance trajectory
- **AI-Powered Chat**: Gemini AI integration for driver improvement suggestions

### User Interface
- **Responsive Design**: Works on desktop and tablet devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Vehicle Selection**: Easy vehicle switching and filtering
- **Fullscreen Views**: Dedicated fullscreen modes for analysis pages
- **Server Status**: Real-time backend connection status monitoring

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Project Structure](#project-structure)
- [Backend API Integration](#backend-api-integration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm
- Backend API server running (see [Backend API Integration](#backend-api-integration))

### Local Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd race-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional)
   ```bash
   # Create .env file
   echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The application will start on `http://localhost:3000` by default.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Backend API Base URL
VITE_API_BASE_URL=http://127.0.0.1:8000

# For production, use your deployed backend URL
# VITE_API_BASE_URL=https://your-backend-url.com
```

### Development vs Production

**Development Mode:**
- Uses Vite proxy to forward `/api/*` requests to backend
- Automatically handles CORS issues
- Hot module replacement (HMR) enabled
- Detailed error messages

**Production Mode:**
- Uses `VITE_API_BASE_URL` environment variable
- Optimized build with code splitting
- Static asset optimization

### API Configuration

The API configuration is managed in `src/config/api.ts`:

- Automatically detects development vs production mode
- Uses proxy in development to avoid CORS
- Falls back to environment variable in production
- Logs backend connection status on startup

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Development Server

The Vite dev server runs on port 3000 and includes:
- Hot module replacement (HMR)
- API proxy configuration
- Source maps for debugging
- Fast refresh for React components

### Project Structure

```
src/
├── components/          # React components
│   ├── PlaybackControls.tsx
│   ├── Scene3D.tsx
│   ├── TrackMap.tsx
│   ├── Leaderboard.tsx
│   └── ...
├── pages/              # Page components
│   ├── LiveTelemetry.tsx
│   ├── PostEventAnalysis.tsx
│   ├── RealTimeAnalytics.tsx
│   └── ...
├── services/           # API service layers
│   ├── apiService.ts
│   ├── telemetryServiceWS.ts
│   └── ...
├── store/              # State management (Zustand)
│   └── telemetryStore.ts
├── hooks/              # Custom React hooks
│   ├── usePolling.ts
│   └── useSSE.ts
├── types/              # TypeScript type definitions
│   ├── telemetry.ts
│   └── analysis.ts
├── utils/              # Utility functions
│   ├── gpsUtils.ts
│   └── trackPathUtils.ts
└── config/             # Configuration files
    └── api.ts
```

### Key Components

#### PlaybackControls
Controls race playback: start, pause, resume, restart, speed adjustment, and seeking.

#### Scene3D
Three.js-based 3D track visualization with vehicle models, camera controls, and lighting.

#### TrackMap
Google Maps integration showing vehicle positions, paths, and track layout.

#### Leaderboard
Real-time race positions, gaps, lap times, and vehicle status.

#### TelemetryViewer
Main container component that orchestrates all telemetry visualization components.

### State Management

Uses Zustand for state management:
- `telemetryStore.ts`: Global telemetry state, vehicle data, race state
- Lightweight and performant
- Type-safe with TypeScript

### Data Polling

The application uses REST API polling for real-time updates:
- **Telemetry**: Polled every 100ms
- **Endurance**: Polled every 500ms
- **Leaderboard**: Polled every 1000ms

Custom hooks (`usePolling.ts`) handle polling logic with automatic cleanup.

## 🔌 Backend API Integration

This frontend connects to the **Telemetry Rush Backend API Server**. For complete backend documentation, see the backend repository README.

### Quick Backend Setup

1. **Start the backend server** (default port 8000)
   ```bash
   cd hack_the_track_backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Verify backend is running**
   ```bash
   curl http://localhost:8000/api/health
   ```

3. **Configure frontend** (if backend is on different port)
   ```bash
   # In .env file
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

### API Endpoints Used

The frontend uses the following backend endpoints:

- `GET /api/health` - Health check and status
- `GET /api/init` - Combined initialization endpoint
- `GET /api/vehicles` - Vehicle list
- `GET /api/telemetry` - Real-time telemetry data
- `GET /api/endurance` - Endurance/lap data
- `GET /api/leaderboard` - Race leaderboard
- `POST /api/control` - Race control commands
- `GET /api/driver/{id}/...` - Driver insights
- `POST /api/analysis/...` - Analysis endpoints
- `GET /api/realtime/...` - Real-time analytics

### CORS Configuration

The frontend handles CORS automatically:
- **Development**: Uses Vite proxy (no CORS issues)
- **Production**: Backend must have CORS configured for frontend domain

See `LOCAL_DEV_SETUP.md` for detailed CORS configuration.

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
# Build image
docker build -t telemetry-rush-frontend .

# Run container
docker run -p 80:80 \
  -e VITE_API_BASE_URL=https://your-backend-url.com \
  telemetry-rush-frontend
```

### Static Hosting

The production build can be deployed to any static hosting service:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **Cloud Storage**: Upload `dist/` directory
- **Nginx**: Serve `dist/` directory

### Environment Variables in Production

Set environment variables in your hosting platform:

```bash
VITE_API_BASE_URL=https://your-backend-url.com
```

**Note**: Environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

### Nginx Configuration

An `nginx.conf` file is included for Nginx deployment. Key features:
- SPA routing support (all routes → index.html)
- Gzip compression
- Static asset caching
- Security headers

## 🔧 Troubleshooting

### Backend Connection Issues

**Problem**: Frontend can't connect to backend

**Solutions**:
1. Verify backend is running: `curl http://localhost:8000/api/health`
2. Check `VITE_API_BASE_URL` in `.env` file
3. Check browser console for connection errors
4. Verify CORS is configured on backend

### CORS Errors

**Problem**: CORS errors in browser console

**Solutions**:
1. Use development mode (`npm run dev`) - proxy handles CORS
2. Configure backend CORS for your frontend domain
3. Check `vite.config.ts` proxy configuration

### 503 Service Unavailable

**Problem**: Backend returns 503 errors

**Solutions**:
1. Check backend server status
2. Verify backend is not overloaded
3. Check backend logs for errors
4. Ensure data files are loaded (check `/api/health`)

### Build Errors

**Problem**: `npm run build` fails

**Solutions**:
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Check TypeScript errors: `npm run lint`
3. Verify all dependencies are installed
4. Check Node.js version (requires 18+)

### 3D Rendering Issues

**Problem**: 3D track not rendering

**Solutions**:
1. Check browser WebGL support
2. Verify Three.js dependencies are installed
3. Check browser console for WebGL errors
4. Try different browser (Chrome/Firefox recommended)

### Performance Issues

**Problem**: Application is slow or laggy

**Solutions**:
1. Reduce polling frequency (edit `usePolling.ts`)
2. Limit number of vehicles displayed
3. Disable 3D visualization if not needed
4. Check network tab for slow API responses
5. Use production build (development mode is slower)

## 📊 Performance Optimization

### Code Splitting
- Routes are code-split automatically
- Large components loaded on demand
- Three.js loaded only when 3D view is active

### Polling Optimization
- Configurable polling intervals
- Automatic cleanup on unmount
- Request deduplication

### Rendering Optimization
- React.memo for expensive components
- useMemo for computed values
- Virtual scrolling for large lists

## 🎨 UI/UX Features

- **Dark Theme**: Modern dark color scheme
- **Responsive Layout**: Adapts to different screen sizes
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Non-intrusive status updates
- **Keyboard Shortcuts**: Quick access to common actions

## 🔐 Security Considerations

- Environment variables for sensitive configuration
- No API keys stored in frontend code
- Input validation on all user inputs
- XSS protection via React's built-in escaping
- HTTPS recommended for production

## 📝 License

[Add your license information here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review browser console for errors
- Check backend server logs
- Verify API endpoints are accessible

## 🎯 Key Features Summary

✅ **Real-Time Visualization**: Live telemetry with 2D and 3D views  
✅ **Modern React Stack**: TypeScript, Vite, Tailwind CSS  
✅ **Performance Optimized**: Code splitting, lazy loading, efficient polling  
✅ **Comprehensive Analysis**: Driver insights, AI chat, predictive analysis  
✅ **Production Ready**: Docker support, static hosting, Nginx config  
✅ **Developer Friendly**: Hot reload, TypeScript, ESLint  

---

**Built with React, TypeScript, Three.js, and Tailwind CSS** 🚀

