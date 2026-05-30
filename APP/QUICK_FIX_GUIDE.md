# Quick Fix Guide: 403 Forbidden Errors

## 🚨 Problem
Getting **403 Forbidden** errors on the dashboard even though you're logged in.

## ✅ Quick Solution (2 minutes)

### Option 1: Use Diagnostics Page (Easiest)
1. Open your browser
2. Go to: **`http://localhost:3000/diagnostics`**
3. Click **"Run Diagnostics"** button
4. Click **"Clear Auth & Re-login"** button
5. Log in again with your credentials
6. ✅ Done!

### Option 2: Manual Clear (Alternative)
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Type: `localStorage.clear()`
4. Press **Enter**
5. Refresh the page (**F5**)
6. Log in again
7. ✅ Done!

## 🔍 Why This Happens

The authentication token (JWT) becomes invalid when:
- ❌ Backend server restarts with a new secret
- ❌ Token expires
- ❌ Server configuration changes
- ❌ Connecting to a different server instance

## 📊 Check If It's Fixed

After logging in again:
1. Go to dashboard
2. Should see data loading without errors
3. Check browser console (F12) - no 403 errors
4. ✅ If you see data, it's fixed!

## 🆘 Still Having Issues?

### Check Backend Server:
```bash
# Make sure backend is running
cd backend
npm start
```

### Check API URL:
```bash
# View .env file
cat APP/.env

# Should show:
VITE_API_URL=http://localhost:3000/api
```

### Run Full Diagnostics:
1. Go to: `http://localhost:3000/diagnostics`
2. Click "Run Diagnostics"
3. Check what's failing
4. Follow the suggestions

## 📞 Need Help?

1. **Check Console Errors:**
   - Press F12
   - Go to Console tab
   - Look for red error messages
   - Share these with your developer

2. **Check Network Tab:**
   - Press F12
   - Go to Network tab
   - Look for failed requests (red)
   - Click on them to see details

3. **Share Diagnostic Results:**
   - Go to `/diagnostics`
   - Run diagnostics
   - Take screenshot
   - Share with your developer

## 📝 Remember

- **Always log in again** after clearing auth data
- **Don't panic** - this is a common issue with a simple fix
- **Bookmark the diagnostics page** for quick access: `/diagnostics`

## 🎯 Prevention

For developers:
- Don't change JWT_SECRET in production
- Use consistent secrets across restarts
- Implement refresh tokens for better UX

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Solution Implemented
