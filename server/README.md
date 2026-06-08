# TravelSmarter Backend API

Production-ready Node.js/Express backend for the TravelSmarter travel hacking platform.

## Features

✅ **User Authentication**
- JWT-based authentication
- Secure password hashing with bcryptjs
- Session management

✅ **Subscription Management**
- Stripe payment integration
- Smart Traveler (€19/month) and Elite (€49/month) tiers
- Promo code system
- Webhook handling for payment events

✅ **Deal Management**
- Create, read, update deals
- Upvote and save deals
- Deal trending and search
- Category-based filtering

✅ **Hack Management**
- Save and manage hacks across 16 modules
- Module organization
- Hack categorization

✅ **Database**
- PostgreSQL with comprehensive schema
- Optimized indexes
- Automatic migrations

## Setup Instructions

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

**Required environment variables:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travelsmarter
DB_USER=postgres
DB_PASSWORD=your_password

# API
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Initialize Database

Create PostgreSQL database:

```bash
createdb travelsmarter
```

Run database initialization script:

```bash
npm run db:init
```

This will create all necessary tables with proper indexes.

### 4. Seed Initial Data

```bash
npm run db:seed
```

This populates:
- 5 example promo codes
- 5 example deals

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication

```
POST   /api/auth/signup                 - Register new user
POST   /api/auth/login                  - Login user
GET    /api/auth/me                     - Get current user (protected)
PUT    /api/auth/update-profile         - Update user profile (protected)
POST   /api/auth/change-password        - Change password (protected)
```

### Subscriptions & Payments

```
GET    /api/subscriptions/pricing       - Get pricing plans
POST   /api/subscriptions/checkout      - Create checkout session (protected)
POST   /api/subscriptions/webhook       - Stripe webhook handler
GET    /api/subscriptions/current       - Get current subscription (protected)
POST   /api/subscriptions/cancel        - Cancel subscription (protected)
```

### Deals

```
GET    /api/deals                       - Get all deals (paginated)
GET    /api/deals/trending              - Get trending deals
GET    /api/deals/search                - Search deals
GET    /api/deals/stats/by-category     - Get category statistics
GET    /api/deals/:id                   - Get single deal
POST   /api/deals                       - Create deal (protected)
POST   /api/deals/:id/upvote            - Upvote deal (protected)
POST   /api/deals/:id/save              - Save deal (protected)
GET    /api/deals/saved                 - Get saved deals (protected)
```

### Hacks

```
GET    /api/hacks/modules               - Get all 16 modules
GET    /api/hacks/module/:moduleId      - Get hacks in module
POST   /api/hacks/save                  - Save hack (protected)
DELETE /api/hacks/:hackId/remove        - Remove saved hack (protected)
GET    /api/hacks/saved                 - Get saved hacks (protected)
GET    /api/hacks/:hackId/is-saved      - Check if hack is saved (protected)
```

## Database Schema

### Users Table
- id (UUID)
- email (VARCHAR)
- password_hash (VARCHAR)
- subscription_tier (VARCHAR)
- subscription_status (VARCHAR)
- stripe_customer_id (VARCHAR)
- stripe_subscription_id (VARCHAR)
- created_at, updated_at, last_login (TIMESTAMP)

### Subscriptions Table
- id (UUID)
- user_id (FK)
- tier (VARCHAR)
- status (VARCHAR)
- price_monthly (DECIMAL)
- stripe_subscription_id (VARCHAR)
- current_period_start, current_period_end (TIMESTAMP)

### Deals Table
- id (UUID)
- title (VARCHAR)
- description (TEXT)
- category (VARCHAR)
- deal_type (VARCHAR)
- value_amount (DECIMAL)
- verified (BOOLEAN)
- verification_count (INTEGER)
- upvote_count (INTEGER)
- expires_at (TIMESTAMP)

### Saved Hacks Table
- id (UUID)
- user_id (FK)
- module_id (INTEGER)
- hack_id (INTEGER)
- hack_title (VARCHAR)
- hack_category (VARCHAR)
- saved_at (TIMESTAMP)

### Promo Codes Table
- id (UUID)
- code (VARCHAR UNIQUE)
- discount_percent (DECIMAL)
- discount_amount (DECIMAL)
- max_uses (INTEGER)
- current_uses (INTEGER)
- valid_from, valid_until (TIMESTAMP)
- is_active (BOOLEAN)

## Stripe Integration

### Setup Stripe

1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Create Products in Stripe

1. Go to Stripe Dashboard → Products
2. Create two products:
   - **Smart Traveler** - €19/month
   - **Elite** - €49/month
3. Update product IDs in `subscriptionController.js`

### Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourapi.com/api/subscriptions/webhook`
3. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Get signing secret and add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Authentication Flow

1. User signs up/logs in
2. Server returns JWT token
3. Client stores token (localStorage)
4. Client includes token in Authorization header: `Bearer <token>`
5. Server verifies token with `protect` middleware

## Error Handling

All endpoints return consistent JSON responses:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

## Deployment

### Production Setup

1. Update `.env`:
   ```
   NODE_ENV=production
   DB_HOST=your_prod_db
   JWT_SECRET=strong_random_key
   FRONTEND_URL=https://yourdomain.com
   ```

2. Use environment-specific database
3. Enable HTTPS (use reverse proxy like nginx)
4. Set up database backups
5. Configure error tracking (e.g., Sentry)

### Deploy to Heroku

```bash
heroku create travelsmarter-api
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
git push heroku main
```

### Deploy to AWS/GCP

See deployment guides in `/docs/deployment`

## Testing

Run API tests:

```bash
npm test
```

Test authentication:

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Test protected endpoint:

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Best Practices

✅ JWT tokens expire after 30 days
✅ Passwords hashed with bcryptjs (10 salt rounds)
✅ CORS enabled only for frontend domain
✅ Helmet.js for security headers
✅ SQL injection protection via parameterized queries
✅ Rate limiting recommended (add express-rate-limit)
✅ Input validation (add express-validator)

## Monitoring & Logging

Recommended tools:
- **Error Tracking:** Sentry
- **Logging:** Winston or Pino
- **Monitoring:** New Relic or Datadog
- **Analytics:** Mixpanel or Segment

## Support

For API documentation, see `/docs/api.md`
For database schema details, see `/docs/database.md`
For Stripe integration guide, see `/docs/stripe.md`

## License

MIT

---

**Last Updated:** June 4, 2026
**API Version:** 1.0.0
