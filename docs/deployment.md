# Deployment Guide

## Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account (or local instance)
- ZEGOCLOUD Account (for video API keys)
- Gemini API Key

## Local Setup
1. **Clone repo**: `git clone <repo>`
2. **Backend**:
   - `cd backend`
   - `npm install`
   - Setup `.env` (MONGODB_URI, JWT_SECRET, etc.)
   - `node src/scripts/seedAdmin.js` (Optional: creates default admin user)
   - `npm run dev`
3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - Setup `.env` (VITE_API_BASE_URL, etc.)
   - `npm run dev`

## Production Deployment
- **Backend**: Can be deployed to Render, Heroku, or AWS App Runner. Ensure CORS is updated to match the frontend domain.
- **Frontend**: Can be deployed to Vercel, Netlify, or Render static hosting. Build command: `npm run build`.

