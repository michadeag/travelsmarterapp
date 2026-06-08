const pool = require('../config/database');
require('dotenv').config();

const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  price_monthly DECIMAL(10, 2),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences/settings table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  notification_push BOOLEAN DEFAULT true,
  deal_alert_categories TEXT[],
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved hacks table (user bookmarks)
CREATE TABLE IF NOT EXISTS saved_hacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER,
  hack_id INTEGER,
  hack_title VARCHAR(255),
  hack_category VARCHAR(100),
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, module_id, hack_id)
);

-- Deals/Offers table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  deal_type VARCHAR(50),
  value_amount DECIMAL(10, 2),
  value_currency VARCHAR(10) DEFAULT 'EUR',
  image_url VARCHAR(500),
  source VARCHAR(100),
  verified BOOLEAN DEFAULT false,
  verification_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deal interactions (upvotes, saves)
CREATE TABLE IF NOT EXISTS deal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, deal_id, interaction_type)
);

-- Community contributions (user-submitted hacks)
CREATE TABLE IF NOT EXISTS community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER,
  hack_title VARCHAR(255) NOT NULL,
  hack_description TEXT NOT NULL,
  hack_value DECIMAL(10, 2),
  steps TEXT,
  success_rate DECIMAL(5, 2),
  status VARCHAR(50) DEFAULT 'pending',
  verification_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expert contributors (verified users)
CREATE TABLE IF NOT EXISTS expert_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expertise_areas TEXT[],
  accuracy_score DECIMAL(5, 2),
  contribution_count INTEGER DEFAULT 0,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs (for tracking sent emails)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email_address VARCHAR(255),
  email_type VARCHAR(50),
  subject VARCHAR(255),
  status VARCHAR(50),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent DECIMAL(5, 2),
  discount_amount DECIMAL(10, 2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  amount DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'EUR',
  status VARCHAR(50),
  subscription_tier VARCHAR(50),
  promo_code_id UUID REFERENCES promo_codes(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_hacks_user_id ON saved_hacks(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(is_active);
CREATE INDEX IF NOT EXISTS idx_community_contributions_status ON community_contributions(status);
CREATE INDEX IF NOT EXISTS idx_expert_contributors_user ON expert_contributors(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
`;

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    await pool.query(createTablesSQL);
    console.log('✅ Database tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
