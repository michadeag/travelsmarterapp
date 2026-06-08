# TravelSmarter Backend - Quick Setup Guide

Get the backend running in 5 minutes.

## ⚡ Quick Start (5 minutes)

### Step 1: Install Dependencies (1 min)

```bash
cd backend
npm install
```

### Step 2: Setup Database (2 min)

Make sure PostgreSQL is running, then:

```bash
# Create database
createdb travelsmarter

# Initialize tables
npm run db:init

# Seed example data
npm run db:seed
```

### Step 3: Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env` and add:
```env
DB_PASSWORD=your_postgres_password
JWT_SECRET=any_random_string_here
STRIPE_SECRET_KEY=sk_test_123...
STRIPE_PUBLISHABLE_KEY=pk_test_123...
```

### Step 4: Start Server (1 min)

```bash
npm run dev
```

✅ Server running at `http://localhost:5000`

---

## 🧪 Test the API

### 1. Health Check

```bash
curl http://localhost:5000/health
```

### 2. Sign Up

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!",
    "firstName":"John",
    "lastName":"Doe"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid...",
    "email": "test@example.com",
    "subscriptionTier": "free"
  }
}
```

### 3. Get Current User (Protected)

```bash
# Replace TOKEN with your JWT from signup
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### 4. Get Pricing Plans

```bash
curl http://localhost:5000/api/subscriptions/pricing
```

### 5. Get All Deals

```bash
curl http://localhost:5000/api/deals
```

---

## 📊 Database Commands

### View Users

```bash
psql travelsmarter
\d users
SELECT email, subscription_tier FROM users;
```

### View Deals

```sql
SELECT title, category, upvote_count FROM deals;
```

### View Subscriptions

```sql
SELECT u.email, s.tier, s.status FROM subscriptions s
JOIN users u ON s.user_id = u.id;
```

### Reset Database (if needed)

```bash
dropdb travelsmarter
createdb travelsmarter
npm run db:init
npm run db:seed
```

---

## 🔐 Stripe Setup (for payments)

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Sign up for account

2. **Get API Keys**
   - Dashboard → Developers → API Keys
   - Copy Secret Key (starts with `sk_test_`)
   - Copy Publishable Key (starts with `pk_test_`)

3. **Add to .env**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Create Products**
   - Dashboard → Products → Add Product
   - Create "Smart Traveler" (€19/month)
   - Create "Elite" (€49/month)

5. **Setup Webhook** (for production)
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://yoursite.com/api/subscriptions/webhook`
   - Copy webhook secret to `.env`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

---

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js           # Database connection
├── controllers/
│   ├── authController.js     # Auth logic
│   ├── subscriptionController.js
│   ├── dealsController.js
│   └── hacksController.js
├── middleware/
│   └── auth.js              # JWT middleware
├── routes/
│   ├── authRoutes.js
│   ├── subscriptionRoutes.js
│   ├── dealsRoutes.js
│   └── hacksRoutes.js
├── scripts/
│   ├── initDb.js            # Create tables
│   └── seedDb.js            # Add example data
├── server.js                # Main server
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/signup` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/subscriptions/pricing` | ❌ | Get pricing |
| POST | `/api/subscriptions/checkout` | ✅ | Create checkout |
| GET | `/api/deals` | ❌ | Get all deals |
| POST | `/api/deals/:id/upvote` | ✅ | Upvote deal |
| GET | `/api/hacks/modules` | ❌ | Get all modules |
| POST | `/api/hacks/save` | ✅ | Save hack |

---

## 🐛 Troubleshooting

### "Cannot connect to database"

```bash
# Check PostgreSQL is running
psql --version

# Create database if missing
createdb travelsmarter

# Check credentials in .env
```

### "JWT_SECRET not defined"

```bash
# Add to .env
JWT_SECRET=your_random_string_here_make_it_long
```

### "Port 5000 already in use"

```bash
# Change port in .env
PORT=5001

# Or kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

### "Stripe key invalid"

```bash
# Check keys in .env are correct
# Get new keys from Stripe Dashboard → Developers
# Make sure to use TEST keys (starts with sk_test_, not sk_live_)
```

---

## 📱 Frontend Integration

Update your frontend `.env`:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Then in your frontend code:

```javascript
// Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Protected request
const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🔄 Environment Setup Summary

| File | Action | Command |
|------|--------|---------|
| `.env` | Create from template | `cp .env.example .env` |
| Database | Create | `createdb travelsmarter` |
| Tables | Initialize | `npm run db:init` |
| Data | Seed | `npm run db:seed` |
| Server | Start | `npm run dev` |

---

## ✅ Checklist

- [ ] Node.js 16+ installed
- [ ] PostgreSQL installed & running
- [ ] `.env` file created with all variables
- [ ] Database created
- [ ] Tables initialized (`npm run db:init`)
- [ ] Example data seeded (`npm run db:seed`)
- [ ] Server running (`npm run dev`)
- [ ] API responding to requests
- [ ] Frontend connected to API

---

## 📞 Need Help?

1. Check server logs for errors
2. Verify database connection: `psql travelsmarter`
3. Test API endpoint: `curl http://localhost:5000/health`
4. Check JWT token validity
5. Verify Stripe keys in .env

---

**Next Steps:**
- ✅ Backend running
- 📝 Create YouTube scripts (Module 2)
- 🚀 Launch frontend (Module 3)

**Last Updated:** June 4, 2026
