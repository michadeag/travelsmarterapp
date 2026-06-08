# TravelSmarter Admin Dashboard

Complete web-based admin interface for managing the TravelSmarter platform. Create deals, manage users, track subscriptions, and monitor analytics in one place.

## Features

✅ **User Management**
- View all registered users
- Create and edit user accounts
- Manage subscription tiers
- Track user activity and login history
- Delete inactive users

✅ **Subscription Management**
- Real-time subscription tracking
- Smart Traveler (€19/mo) analytics
- Elite (€49/mo) analytics
- Monthly Recurring Revenue (MRR) calculation
- Payment status monitoring

✅ **Deal Management**
- Create new deals with verification
- Edit existing deals
- Delete outdated deals
- Track deal performance (upvotes)
- Search and filter deals
- Category management

✅ **Content Management**
- Hack module tracking
- 16 modules overview
- Save statistics
- Value calculations
- Module performance metrics

✅ **Promo Code System**
- Create discount codes
- Set usage limits
- Track redemptions
- Manage expiration dates
- Monitor discount effectiveness

✅ **Analytics Dashboard**
- User growth metrics
- Trial conversion rates
- Churn rate monitoring
- Customer lifetime value (LTV)
- Traffic source analysis
- Signup trends

✅ **Settings & Configuration**
- API configuration
- Email service setup
- Stripe integration
- Notification preferences
- System settings

## Quick Start

### 1. Open Admin Dashboard

**Local Development:**
```
http://localhost:8080/admin/login.html
```

**Production:**
```
https://yourdomain.com/admin/login.html
```

### 2. Demo Credentials

```
Email: admin@travelsmarter.com
Password: DemoPassword123!
```

⚠️ **Change demo credentials immediately in production!**

### 3. Configure API Connection

1. Click "API Settings" on login page
2. Enter your backend API URL (default: `http://localhost:5000`)
3. Save settings

### 4. Log In

- Enter credentials
- Check "Remember me" for persistent login
- Click "Sign In"

## Dashboard Sections

### 📊 Dashboard (Home)

**Quick Stats:**
- Total Users - Active user count
- Active Subscriptions - Number of paid users
- Total Deals - Active deals count
- Pending Content - Hacks/deals awaiting review

**Recent Activities:**
- User signups
- Subscription changes
- Payment events
- Deal creation
- Content updates

### 👥 Users Management

**Features:**
- View all users with email, name, subscription tier
- Search users by email
- Create new users
- Edit user information
- Upgrade/downgrade subscription tiers
- Delete users
- Track last login

**Actions:**
```
+ Add User      - Create new user account
Edit            - Modify user information
Delete          - Remove user account
```

### 💳 Subscriptions

**Metrics:**
- Free users count
- Smart Traveler (€19/mo) count
- Elite (€49/mo) count
- Total Monthly Recurring Revenue (MRR)

**Active Subscriptions Table:**
- User email
- Subscription tier
- Status (active/inactive)
- Start date
- Next billing date
- Monthly amount

### 🎯 Deals Management

**Features:**
- View all active deals
- Create new deals
- Edit deal details
- Delete expired deals
- Search deals by title
- Track upvotes and saves
- Monitor deal performance

**Deal Fields:**
- Title (required)
- Description
- Category (Flights, Hotels, Credit Cards, Other)
- Value in EUR (required)
- Expiration date
- Verification status

### 💡 Hacks & Modules

**Overview:**
- Total hacks count (87)
- Most saved hacks
- Average savings per user (€2,500/year)

**Module Breakdown:**
All 16 modules with:
- Hack count per module
- Number of saves
- Average value per hack
- Active/Inactive status

### 🎟️ Promo Codes

**Create Codes:**
- Code name (e.g., SAVE20)
- Discount percentage
- Max uses allowed
- Expiration date

**Manage:**
- View all active codes
- Edit code details
- Track usage rate
- Monitor effectiveness

**Built-in Codes:**
```
SAVE20       - 20% discount (100 max uses, 90 days)
WELCOME10    - 10% discount (500 max uses, 30 days)
ANNUAL15     - 15% discount (50 max uses, 365 days)
EARLYBIRD25  - 25% discount (25 max uses, 7 days)
SUMMER30     - 30% discount (75 max uses, seasonal)
```

### 📈 Analytics

**Key Metrics:**
- Monthly signups (+18.5% growth)
- Trial to paid conversion (28%)
- Monthly churn rate (4.2%)
- Average customer LTV (€456)

**Traffic Analysis:**
- YouTube: 12,450 visits (3.7% conversion)
- Reddit: 8,234 visits (2.8% conversion)
- Email: 5,678 visits (15.7% conversion)
- Google: 3,456 visits (4.5% conversion)
- Referral: 2,123 visits (16.3% conversion)

### ⚙️ Settings

**Email Configuration:**
- Sendgrid API key
- Sender email address

**Stripe Configuration:**
- Stripe secret key
- Webhook signing secret

**Notification Preferences:**
- Send email on signup
- Send email on subscription
- Daily digest emails

## API Integration

The admin dashboard connects to your backend API using REST endpoints.

### Authentication

All API requests require JWT token in header:

```
Authorization: Bearer {token}
```

### Required Endpoints

```
GET  /api/auth/users            - List all users
POST /api/auth/users            - Create user
PUT  /api/auth/users/:id        - Update user
DELETE /api/auth/users/:id      - Delete user

GET  /api/subscriptions/list    - List subscriptions
GET  /api/subscriptions/stats   - Subscription statistics

GET  /api/deals                 - List deals
POST /api/deals                 - Create deal
DELETE /api/deals/:id           - Delete deal

GET  /api/admin/activities      - Recent activities
GET  /api/admin/analytics       - Analytics data
```

## User Roles & Permissions

### Admin User
- Full access to all sections
- Can create, edit, delete content
- Can manage users
- Can view analytics
- Can change settings

### Future: Editor Role
- Can manage deals and hacks
- Can moderate community
- Cannot manage users
- Cannot access settings

### Future: Analyst Role
- Can view analytics
- Read-only access
- Cannot modify content

## Security Best Practices

✅ **Use Strong Passwords**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Change demo credentials immediately

✅ **Enable 2FA**
- Two-factor authentication recommended
- Use authenticator apps

✅ **API Keys**
- Store securely in .env file
- Never commit to git
- Rotate keys regularly

✅ **Session Management**
- Session expires after 1 hour of inactivity
- Automatic logout in production
- Remember me token secure

✅ **Audit Logging**
- All admin actions logged
- Track user modifications
- Monitor payment changes

## Troubleshooting

### "Unable to connect to API"
1. Check API URL in settings
2. Ensure backend is running
3. Check CORS configuration
4. Verify JWT token is valid

### "Failed to load users"
1. Verify API URL is correct
2. Check authentication token
3. Ensure `/api/auth/users` endpoint exists
4. Check backend error logs

### "Login failed"
1. Verify email and password
2. Check if user account exists
3. Check user is admin
4. Verify backend authentication service

### "Settings not saving"
1. Check browser localStorage is enabled
2. Verify API URL format is correct
3. Try clearing browser cache
4. Check console for errors

## Dashboard Navigation

```
Dashboard (Home)
├─ Quick Stats
├─ Recent Activities
└─ MRR Overview

Users
├─ User List (Search, Add, Edit, Delete)
└─ User Details

Subscriptions
├─ Subscription Stats
└─ Active Subscriptions List

Deals
├─ Deal List (Search)
├─ Create Deal
└─ Deal Details

Hacks & Modules
├─ Module Overview
└─ Module Breakdown

Promo Codes
├─ Promo List
└─ Create Code

Analytics
├─ Key Metrics
└─ Traffic Analysis

Settings
├─ Email Config
├─ Stripe Config
└─ Notifications
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Quick search (coming soon) |
| `Ctrl+M` | Toggle sidebar menu (mobile) |
| `Ctrl+L` | Logout |

## Mobile Responsiveness

The admin dashboard is fully responsive:

- **Desktop**: Full sidebar + content
- **Tablet**: Collapsible sidebar
- **Mobile**: Bottom navigation bar

## Data Management

### Backup Strategy

Recommended:
```
- Daily automated backups
- Weekly offsite backups
- Monthly archive backups
```

### Data Retention

- User data: Indefinite (GDPR compliance)
- Activity logs: 90 days
- Analytics: 1 year
- Deleted users: 30-day recovery window

## Customization

### Adding New Admin Users

In production, create users via:

1. Backend user creation API
2. Admin dashboard user creation form
3. Manual database insertion (unsafe)

### Changing Theme Colors

Edit CSS variables in `dashboard.html`:

```css
:root {
    --primary: #667eea;
    --secondary: #764ba2;
    --accent: #10b981;
    --danger: #ef4444;
}
```

### Adding New Dashboard Sections

1. Add nav link to sidebar
2. Create tab content div
3. Add tab switch function
4. Add API integration
5. Test thoroughly

## Performance Tips

- Use filters to reduce data loaded
- Archive old deals regularly
- Clean up inactive users monthly
- Monitor MRR calculation efficiency

## Support

For issues or feature requests:
- Email: admin-support@travelsmarter.com
- GitHub Issues: [repository]
- Documentation: [docs site]

## Version

**Current Version:** 1.0.0
**Last Updated:** June 4, 2026

## License

Proprietary - TravelSmarter 2026

---

**Next Steps:**
1. ✅ Set up admin dashboard
2. Configure backend API integration
3. Create admin user accounts
4. Train team on dashboard usage
5. Enable analytics monitoring
6. Set up daily backup schedule
