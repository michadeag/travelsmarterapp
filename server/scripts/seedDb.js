const pool = require('../config/database');
require('dotenv').config();

const seedPromoCodes = `
INSERT INTO promo_codes (code, discount_percent, max_uses, valid_from, valid_until, is_active)
VALUES
  ('SAVE20', 20, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', true),
  ('WELCOME10', 10, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', true),
  ('ANNUAL15', 15, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', true),
  ('EARLYBIRD25', 25, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', true),
  ('SUMMER30', 30, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', false)
ON CONFLICT (code) DO NOTHING;
`;

const seedDeals = `
INSERT INTO deals (title, description, category, deal_type, value_amount, value_currency, source, verified, verification_count)
VALUES
  (
    'Mistake Fare: New York to Tokyo Business Class €890',
    'Lufthansa pricing error - business class normally €3,200. Only 2 hours left!',
    'flights',
    'mistake_fare',
    3110,
    'EUR',
    'system',
    true,
    42
  ),
  (
    'Chase Sapphire 80,000 Point Bonus',
    'Sign-up bonus increased to 80,000 points (usually 60k). Worth €800 in travel.',
    'credit_cards',
    'card_bonus',
    800,
    'EUR',
    'system',
    true,
    156
  ),
  (
    'IHG Status Match Available',
    'Match Hilton Diamond to IHG Gold Elite. Get 20% bonus points on stays.',
    'hotels',
    'status_match',
    500,
    'EUR',
    'system',
    true,
    89
  ),
  (
    'United Airlines Upgrade Offer',
    'System is offering 50% more upgrade inventory this week. High success rates.',
    'flights',
    'upgrade_opportunity',
    250,
    'EUR',
    'system',
    true,
    67
  ),
  (
    'Amex Platinum $550 Annual Fee',
    'Includes $200 airline fee credit + $100 hotel credit = €240 value. Net cost: €310.',
    'credit_cards',
    'fee_credit',
    240,
    'EUR',
    'system',
    true,
    123
  )
ON CONFLICT (title) DO NOTHING;
`;

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Seed promo codes
    console.log('  📝 Adding promo codes...');
    await pool.query(seedPromoCodes);

    // Seed deals
    console.log('  🎯 Adding deals...');
    await pool.query(seedDeals);

    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
