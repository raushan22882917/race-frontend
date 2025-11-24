# Local Development Setup

## CORS Fix for Local Development

The frontend has been configured to automatically handle CORS issues during local development.

### How It Works

1. **Development Mode Detection**: The API config automatically detects when running in development mode (`npm run dev`)
2. **Relative URLs**: In development, the frontend uses relative URLs (e.g., `/api/endurance`) instead of absolute URLs
3. **Vite Proxy**: The Vite dev server proxies all `/api/*` requests to the production backend
4. **No CORS Issues**: Since requests appear to come from the same origin (localhost:3000), CORS is bypassed

### Configuration

**`src/config/api.ts`**:
- Development: Uses empty base URL (relative URLs)
- Production: Uses `VITE_API_BASE_URL` from environment variables

**`vite.config.ts`**:
- Proxy configuration forwards `/api/*` to production backend
- Target: `https://hack-the-track-backend-821372121985.europe-west1.run.app`

### Running Locally

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. The frontend will automatically:
   - Use relative URLs (`/api/endurance`)
   - Proxy requests through Vite to the production backend
   - Avoid CORS errors

### Environment Variables

For **production builds**, set:
```bash
VITE_API_BASE_URL=https://hack-the-track-backend-821372121985.europe-west1.run.app
```

For **local development**, no environment variables are needed - the proxy handles everything.

### Troubleshooting

**If you still see CORS errors:**
1. Make sure you're running `npm run dev` (not a production build)
2. Check that requests are going to `/api/...` (relative) not `https://...` (absolute)
3. Verify the Vite proxy is working by checking the Network tab - requests should show `localhost:3000/api/...`

**If you see 503 errors:**
- The backend server may be down or overloaded
- Check backend status: `https://hack-the-track-backend-821372121985.europe-west1.run.app/api/health`
- The error messages now include more helpful information

### Error Messages

The API service now provides better error messages:
- **503 Service Unavailable**: Backend may be down
- **CORS Errors**: Clear instructions on what needs to be fixed
- **Network Errors**: Distinguishes between CORS and other network issues

