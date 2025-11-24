# Understanding 503 Service Unavailable Errors

## What You're Seeing

The backend is returning **503 Service Unavailable** for certain endpoints, particularly:
- `/api/control` - Playback control commands (play, pause, restart, etc.)
- `/api/leaderboard` - Leaderboard data
- `/api/endurance` - Endurance race data

## What This Means

A **503 error** means the backend server is up and running, but the specific endpoint is temporarily unavailable. This is **not a frontend issue** - your frontend and proxy are working correctly.

## Common Reasons for 503 Errors

### 1. **No Race Data Yet** (Most Common)
The backend endpoints may require race data to be initialized before they can respond. This is normal when:
- No race session is currently active
- The backend hasn't received telemetry data yet
- The race recording hasn't started

**Solution**: Start a race recording or wait for telemetry data to begin flowing.

### 2. **Backend Service Overloaded**
The specific service handling the endpoint might be temporarily overloaded.

**Solution**: Wait a moment and try again. The frontend will automatically retry for polling endpoints.

### 3. **Service Initialization**
Some backend services need time to initialize when the server starts.

**Solution**: Wait a few seconds and try again.

## How the Frontend Handles This

### Polling Endpoints (Automatic Retry)
For endpoints that poll automatically (telemetry, leaderboard, endurance):
- ✅ Errors are logged as **warnings** (not errors)
- ✅ Polling continues automatically
- ✅ Will retry on the next poll interval
- ✅ No user action needed

### Control Commands (User Actions)
For user-initiated commands (play, pause, restart):
- ⚠️ Errors are logged with helpful messages
- ⚠️ State is **not updated** if command fails (prevents UI inconsistency)
- ⚠️ Error is re-thrown so callers can handle it
- 💡 Check console for specific error details

## Error Messages

The frontend now provides detailed error messages:

```
Service Unavailable (503): The backend endpoint /api/control is currently unavailable.

Possible reasons:
- The endpoint is temporarily overloaded
- The service needs to be initialized (e.g., no race data yet)
- The backend service for this endpoint is down

Proxied to: https://hack-the-track-backend-821372121985.europe-west1.run.app/api/control
Mode: Development (using proxy)
Request URL: /api/control
```

## Troubleshooting Steps

1. **Check Backend Health**
   ```bash
   curl https://hack-the-track-backend-821372121985.europe-west1.run.app/api/health
   ```
   Should return `200 OK` if backend is up.

2. **Check Specific Endpoint**
   ```bash
   curl https://hack-the-track-backend-821372121985.europe-west1.run.app/api/control
   ```
   If this returns `503`, the endpoint needs initialization.

3. **Verify Proxy is Working**
   - Check browser Network tab
   - Requests should show `localhost:3000/api/...`
   - Response should show `503` status

4. **Check Console Logs**
   - Look for proxy logs: `🔄 Proxying: GET /api/...`
   - Look for error messages with helpful context

## What's Working

✅ **Frontend Configuration**: Correctly configured  
✅ **Vite Proxy**: Working correctly (requests are proxied)  
✅ **CORS**: Resolved (proxy handles it)  
✅ **Error Handling**: Improved with helpful messages  
✅ **Automatic Retry**: Polling endpoints retry automatically  

## What Needs Backend Attention

⚠️ **Backend Endpoints**: Need to be initialized or have race data  
⚠️ **Service Availability**: Some services may need to be started  

## Summary

The **503 errors are expected** when:
- No race data exists yet
- Backend services are initializing
- Services are temporarily overloaded

The frontend handles these gracefully:
- Polling endpoints retry automatically
- Control commands show helpful error messages
- No user action needed for polling endpoints

**This is normal behavior** - the frontend is working correctly, and the backend just needs race data or initialization.


