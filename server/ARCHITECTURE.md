# TravelSmarter Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Web App)                       │
│              HTML/CSS/JavaScript React/Vue                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  API Gateway / Router                       │
│              (Express.js Middleware)                        │
│  - CORS    - Helmet    - Body Parser    - Auth Middleware  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐ ┌──────▼─────┐ ┌─────▼──────┐
│   Auth     │ │ Payments   │ │  Hacks &   │
│ Controller │ │ Controller │ │   Deals    │
└───────┬────┘ └──────┬─────┘ └─────┬──────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────┐
│              PostgreSQL Database                           │
│                                                             │
│  Tables: Users | Subscriptions | Deals | Hacks | Logs     │
│  - Optimized Indexes                                       │
│  - ACID Compliance                                         │
│  - Relationships & Constraints                             │
└─────────────────────────────────────────────────────────────┘
        │
        ├─── Stripe (Payment Processing)
        ├─── Email Service (Future)
        └─── Analytics (Future)
```

## Request/Response Flow

```
Client Request
      │
      ▼
Express Router (routes/)
      │
      ▼
Middleware Stack
  ├─ CORS
  ├─ Body Parser
  ├─ Auth Middleware (if protected)
      │
      ▼
Controller Function
  ├─ Validate Input
  ├─ Query Database
  ├─ Call External Services (Stripe)
      │
      ▼
Response JSON
      │
      ▼
Client
```

## Authentication Flow

```
User Input (Email, Password)
      │
      ▼
POST /api/auth/signup or /api/auth/login
      │
      ▼
authController
  ├─ Validate input
  ├─ Hash password (bcryptjs)
  ├─ Query database
  ├─ Generate JWT token
      │
      ▼
Return: { token, user }
      │
      ▼
Client stores token in localStorage
      │
      ▼
Protected Requests:
  Authorization: Bearer <token>
      │
      ▼
protect middleware
  ├─ Extract token
  ├─ Verify JWT
  ├─ Attach user to request
      │
      ▼
Proceed to controller
```

## Payment/Subscription Flow

```
User selects plan
      │
      ▼
POST /api/subscriptions/checkout
      │
      ▼
subscriptionController.createCheckoutSession()
  ├─ Get user
  ├─ Create/get Stripe customer
  ├─ Create checkout session
      │
      ▼
Return: { sessionId, url }
      │
      ▼
Client redirects to Stripe Checkout
      │
      ▼
User enters card details
      │
      ▼
Stripe processes payment
      │
      ▼
Success → Stripe sends webhook
      │
      ▼
POST /api/subscriptions/webhook
      │
      ▼
subscriptionController.handleWebhook()
  ├─ Verify webhook signature
  ├─ Update user subscription
  ├─ Create subscription record
      │
      ▼
User now has active subscription
```

## Database Schema Relationships

```
┌─────────────┐
│    Users    │
│─────────────│
│ id (PK)     │◄──────────────┐
│ email       │              │
│ password    │              │
│ tier        │              │
│ stripe_cust │              │
│ stripe_sub  │              │
└─────────────┘              │
      │                      │
      │                      │
      ├─────────────────────────────────┐
      │                                 │
      │            (1 to many)          │
      │                                 │
      ▼                                 ▼
┌──────────────────┐          ┌──────────────────┐
│  Subscriptions   │          │   Saved_Hacks   │
│──────────────────│          │──────────────────│
│ id (PK)          │          │ id (PK)          │
│ user_id (FK)─────┼──────────│ user_id (FK)    │
│ tier             │          │ module_id        │
│ status           │          │ hack_id          │
│ stripe_sub_id    │          │ hack_title       │
│ period_start     │          │ hack_category    │
│ period_end       │          └──────────────────┘
└──────────────────┘
      │
      │ (references)
      │
      ▼
  ┌─────────────────┐
  │ Payment_History │
  │─────────────────│
  │ id (PK)         │
  │ user_id (FK)    │
  │ amount          │
  │ status          │
  │ stripe_pi_id    │
  │ created_at      │
  └─────────────────┘
```

## Module Organization

```
TravelSmarter Backend
│
├── config/
│   └── database.js          # Connection pool & config
│
├── controllers/             # Business logic
│   ├── authController.js    # Signup, login, profile
│   ├── subscriptionController.js  # Stripe, payments
│   ├── dealsController.js   # Create, upvote, save deals
│   └── hacksController.js   # Save, retrieve hacks
│
├── middleware/              # Express middleware
│   └── auth.js             # JWT verification
│
├── routes/                 # API endpoints
│   ├── authRoutes.js       # /api/auth/*
│   ├── subscriptionRoutes.js # /api/subscriptions/*
│   ├── dealsRoutes.js      # /api/deals/*
│   └── hacksRoutes.js      # /api/hacks/*
│
├── scripts/                # Database utilities
│   ├── initDb.js           # Create schema
│   └── seedDb.js           # Populate data
│
├── server.js              # Main Express app
├── package.json           # Dependencies
├── .env                   # Environment config
└── README.md              # Documentation
```

## API Endpoint Structure

```
Authentication (routes/authRoutes.js)
├── POST   /api/auth/signup
├── POST   /api/auth/login
├── GET    /api/auth/me
├── PUT    /api/auth/update-profile
└── POST   /api/auth/change-password

Subscriptions (routes/subscriptionRoutes.js)
├── GET    /api/subscriptions/pricing
├── POST   /api/subscriptions/checkout
├── POST   /api/subscriptions/webhook
├── GET    /api/subscriptions/current
└── POST   /api/subscriptions/cancel

Deals (routes/dealsRoutes.js)
├── GET    /api/deals
├── GET    /api/deals/:id
├── POST   /api/deals
├── POST   /api/deals/:id/upvote
├── POST   /api/deals/:id/save
├── GET    /api/deals/trending
├── GET    /api/deals/search
├── GET    /api/deals/stats/by-category
└── GET    /api/deals/saved

Hacks (routes/hacksRoutes.js)
├── GET    /api/hacks/modules
├── GET    /api/hacks/module/:moduleId
├── POST   /api/hacks/save
├── DELETE /api/hacks/:hackId/remove
├── GET    /api/hacks/saved
└── GET    /api/hacks/:hackId/is-saved
```

## Error Handling

```
Request
  │
  ├─ Input Validation Error?
  │   └─ 400 Bad Request
  │
  ├─ Authentication Error?
  │   └─ 401 Unauthorized
  │
  ├─ Authorization Error?
  │   └─ 403 Forbidden
  │
  ├─ Resource Not Found?
  │   └─ 404 Not Found
  │
  ├─ Server Error?
  │   └─ 500 Internal Server Error
  │
  └─ Success?
      └─ 200/201 OK
         │
         └─ JSON Response
```

## Security Layers

```
1. HTTPS/TLS
   └─ Encrypt data in transit

2. Express Helmet
   └─ Security headers

3. CORS
   └─ Only allow frontend domain

4. Input Validation
   └─ Prevent injection attacks

5. JWT Authentication
   └─ Verify user identity

6. Password Hashing (bcryptjs)
   └─ Never store plain passwords

7. SQL Parameterization
   └─ Prevent SQL injection

8. Stripe Webhook Verification
   └─ Verify payment authenticity
```

## Scalability Considerations

### Current (MVP)
- Single Node.js process
- Single PostgreSQL instance
- File-based logging

### Phase 2 (Growth)
- Load balancer (nginx)
- Multiple Node.js instances
- Redis caching
- Read replicas for database
- Connection pooling

### Phase 3 (Scale)
- Kubernetes deployment
- Microservices (Auth, Payments, Content)
- Message queue (RabbitMQ/Kafka)
- Distributed logging (ELK)
- CDN for static assets

## Performance Optimization

### Database
```sql
-- Indexed columns for fast queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_deals_active ON deals(is_active);
```

### Caching Strategy
- Cache pricing (rarely changes)
- Cache modules list
- Cache trending deals (1 hour TTL)

### API Response
- Pagination (limit 20 per page)
- Select only needed columns
- Use HTTP caching headers

## Monitoring & Logging

```
Application Events
      │
      ├─ Error Logs → Error tracking (Sentry)
      ├─ Access Logs → Analytics
      ├─ Database Logs → Performance monitoring
      └─ Business Events → Metrics (Amplitude)
```

## Deployment Pipeline

```
Code Commit
    │
    ▼
Git Push → GitHub
    │
    ▼
GitHub Actions
  ├─ Run tests
  ├─ Lint code
  ├─ Build
    │
    ▼
Deploy to Production
  ├─ Build Docker image
  ├─ Push to registry
  ├─ Update deployment
  ├─ Run migrations
  ├─ Health checks
    │
    ▼
Production API Live
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 16+ | JavaScript server |
| Framework | Express.js | Web framework |
| Database | PostgreSQL 12+ | Relational database |
| Auth | JWT + bcryptjs | Authentication |
| Payments | Stripe API | Payment processing |
| Deployment | Docker/K8s | Containerization |
| Monitoring | Sentry/Datadog | Error tracking |
| Logging | Winston | Application logs |

---

**Last Updated:** June 4, 2026
**Version:** 1.0.0
