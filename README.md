# TravelSmarter App

Complete Travel Hacking Platform - Frontend + Backend in one Monorepo

## 📁 Project Structure

```
TravelSmarterApp/
├── server/              # Node.js/Express Backend
│   ├── controllers/     # API Controllers
│   ├── routes/          # API Routes
│   ├── services/        # Business Logic
│   ├── config/          # Configuration
│   ├── server.js        # Express App Entry Point
│   └── package.json     # Backend Dependencies
├── public/              # Frontend (HTML/CSS/JS)
│   ├── index.html       # Main Page
│   ├── auth.html        # Auth Page
│   ├── admin/           # Admin Dashboard
│   └── ...              # Other Pages
└── package.json         # Root Scripts
```

## 🚀 Getting Started

### Install Dependencies
```bash
npm run install-all
```

### Run in Development
```bash
npm run dev
```

### Run in Production
```bash
npm start
```

The app will:
- Backend API: http://localhost:5000
- Frontend: http://localhost:5000

## 📝 Available Scripts

- `npm start` - Start backend server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run install-all` - Install all dependencies
- `npm run db:init` - Initialize database
- `npm run db:seed` - Seed database with test data

## 🔧 Configuration

Create a `.env` file in the `server/` folder:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travelsmarter
DB_USER=postgres
DB_PASSWORD=your_password
SENDGRID_API_KEY=your_sendgrid_key
STRIPE_SECRET_KEY=your_stripe_key
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## 📖 Documentation

- Backend: See `server/README.md`
- Architecture: See `server/ARCHITECTURE.md`
- Setup Guide: See `server/SETUP.md`

## 🐛 Troubleshooting

If you encounter deployment errors, check:
1. All dependencies installed: `npm run install-all`
2. .env file configured correctly in `server/`
3. Database connection working
4. Port 5000 is available

## 📅 Version History

- **1.0.0** - Monorepo migration (TravelSmarter + TravelSmarterApp structure)
  - Combined frontend and backend in single repo
  - Simplified deployment process
  - Single DigitalOcean App deployment

---

**Note:** Old structure (travelsmarter-backend, travelsmarter-frontend) still exists as backup.
