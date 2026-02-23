# QFX Cinemas (MERN)

Movie booking platform with:
- Customer app (browse, favorites, seat booking, Stripe checkout)
- Admin panel (manage movies/shows/bookings)
- Real-time seat status via Socket.IO
- OTP signup + forgot/reset password email flows

## Tech Stack
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express + MongoDB (Mongoose)
- Payments: Stripe Checkout
- Realtime: Socket.IO
- Background/events: Inngest (optional fallback path)
- Email: Nodemailer (SMTP/Gmail app password)

## Project Structure
- `frontend/`: React app
- `backend/`: Express API and DB models

## Local Setup
### 1) Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM=QFX Cinema <your_email@gmail.com>

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

ADMIN_EMAILS=admin@gmail.com
ADMIN_DEFAULT_PASSWORD=admin123

INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

Run backend:
```bash
npm start
```

### 2) Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_USE_DUMMY_DATA=false
VITE_CLERK_PUBLISHABLE_KEY=optional_if_used
```

Run frontend:
```bash
npm run dev
```

Open:
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:5001`

## Authentication Model
- Customer auth cookie: `jwt`
- Admin auth cookie: `admin_jwt`
- Sessions are isolated.

## Key Features
- OTP signup: account created only after OTP verification
- Forgot/reset password email
- Admin-only movie/show management
- Customer-only booking routes
- Pending booking timeout and seat release
- Download ticket PDF

## Deployment Readiness Checklist
- Set production `CLIENT_URL` and API URLs correctly
- Use production MongoDB
- Use production Stripe keys + webhook secret
- Use production SMTP credentials
- Set secure `JWT_SECRET`
- Configure Google OAuth redirect for production domain
- Enable CORS for production frontend domain
- Run behind HTTPS in production

## Deploy Option A (Recommended): Frontend on Vercel + Backend on Render/Railway
### Backend (Render/Railway)
1. Deploy `backend/` as Node service.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add backend env vars from above.
5. Expose port from platform (`PORT` handled by code).

### Frontend (Vercel)
1. Deploy `frontend/` as Vite app.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add env:
```env
VITE_API_BASE_URL=https://your-backend-domain/api
VITE_USE_DUMMY_DATA=false
```

## Deploy Option B: Single VM (Nginx + PM2)
- Build frontend and serve static `frontend/dist` via Nginx
- Run backend with PM2:
```bash
pm2 start backend/server.js --name qfx-backend
pm2 save
```
- Reverse proxy `/api` to backend port

## Troubleshooting
- OTP/reset email not coming:
  - Verify `EMAIL_USER`, `EMAIL_PASS` (Gmail app password), spam folder
  - Check backend logs for `Error sending email`
- Google login `redirect_uri_mismatch`:
  - Match Google Console redirect exactly with `GOOGLE_REDIRECT_URI`
- Stripe checkout fails:
  - Confirm valid keys and webhook secret
- CORS/session issues:
  - Ensure `CLIENT_URL` matches deployed frontend URL exactly

## Scripts
### Backend
```bash
npm start
```

### Frontend
```bash
npm run dev
npm run build
npm run preview
```
