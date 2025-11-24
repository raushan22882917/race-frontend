# CORS Error Fix Guide

## Problem
The frontend (`https://race-frontend-m2zl.vercel.app`) cannot access the backend (`https://hack-the-track-backend-821372121985.europe-west1.run.app`) due to CORS (Cross-Origin Resource Sharing) policy blocking.

## Error Message
```
Access to fetch at 'https://hack-the-track-backend-821372121985.europe-west1.run.app/api/endurance' 
from origin 'https://race-frontend-m2zl.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The backend server is not configured to allow requests from the frontend's origin. This is a **backend configuration issue** that must be fixed on the backend server.

## Backend Fix Required

The backend needs to be configured to allow CORS requests from the frontend origin. Here's what needs to be done:

### For FastAPI Backend (Python)

Add CORS middleware to your FastAPI application:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://race-frontend-m2zl.vercel.app",  # Production frontend
        "http://localhost:3000",                   # Local development
        "http://127.0.0.1:3000",                   # Local development alternative
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Or for development, allow all origins (NOT recommended for production):
# allow_origins=["*"]
```

### For Other Backend Frameworks

#### Express.js (Node.js)
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://race-frontend-m2zl.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

#### Flask (Python)
```python
from flask_cors import CORS

CORS(app, origins=[
    "https://race-frontend-m2zl.vercel.app",
    "http://localhost:3000"
])
```

## Frontend Configuration

The frontend is already configured correctly. The `VITE_API_BASE_URL` environment variable should be set to:
```
VITE_API_BASE_URL=https://hack-the-track-backend-821372121985.europe-west1.run.app
```

### For Vercel Deployment

Set the environment variable in Vercel:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `VITE_API_BASE_URL` = `https://hack-the-track-backend-821372121985.europe-west1.run.app`

## Testing CORS Fix

After updating the backend, test with:

```bash
curl -H "Origin: https://race-frontend-m2zl.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://hack-the-track-backend-821372121985.europe-west1.run.app/api/health
```

You should see `Access-Control-Allow-Origin` header in the response.

## Alternative Solutions (Not Recommended)

### 1. Backend Proxy (Vercel)
You could add a Vercel serverless function to proxy requests, but this adds latency and complexity.

### 2. Disable CORS in Browser (Development Only)
This is only for local development and won't work in production:
- Chrome: `--disable-web-security --user-data-dir=/tmp/chrome_dev`
- **Never use this in production!**

## Summary

**The fix must be done on the backend server.** The backend needs to:
1. Add CORS middleware
2. Allow the frontend origin: `https://race-frontend-m2zl.vercel.app`
3. Allow necessary HTTP methods (GET, POST, PUT, DELETE)
4. Allow necessary headers (Content-Type, Authorization, etc.)

Once the backend is configured correctly, the CORS errors will be resolved.

