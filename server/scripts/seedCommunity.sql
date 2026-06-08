-- Community Discussion Seeding Script
-- This script populates the community board with 10 realistic discussions

-- Create demo user if it doesn't exist
INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
VALUES ('demo@travelsmarterapp.com', 'hashed_demo_password', 'Community', 'Expert', 'elite')
ON CONFLICT (email) DO NOTHING;

-- Get the demo user ID
WITH demo_user AS (
  SELECT id FROM users WHERE email = 'demo@travelsmarterapp.com'
)

-- Insert all 10 community posts with replies
INSERT INTO community_posts (id, user_id, module_id, title, content, upvote_count, created_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM demo_user),
  post_data.module_id,
  post_data.title,
  post_data.content,
  post_data.upvote_count,
  NOW() - INTERVAL '1 day' * (row_number() OVER (ORDER BY post_data.module_id) * 2)
FROM (
  VALUES
    (1, 'Best time to book flights to Asia?', 'I''m planning a trip to Thailand in March. Should I book now or wait? I''ve been monitoring prices and they seem to fluctuate daily. Any tips on when to pull the trigger?', 28),
    (2, 'Credit card sign-up bonus strategy?', 'Has anyone successfully used multiple sign-up bonuses in a short period? I''m planning 3 trips this year and want to maximize my points. Is it worth opening 2-3 cards back to back?', 35),
    (3, 'Hotel status matching - anyone tried this?', 'Just got a new travel card with Platinum Hotel status. Can I actually match to other hotel chains? What''s the process and success rate?', 32),
    (4, 'Red-eye flights - worth the sleep loss?', 'Debating whether to save €150-200 on a red-eye flight or just pay extra for a morning departure. Mentally how do you recover the next day?', 25),
    (6, 'Southeast Asia on €30/day - possible in 2024?', 'Thinking about a 2-month backpacking trip through Vietnam, Thailand, Cambodia. Is €30/day realistic with good food and nice hostels?', 30),
    (9, 'Best no-fee international card?', 'Currently using a card with 3% foreign transaction fees. Thinking about switching. Has anyone compared Wise vs Charles Schwab vs others?', 38),
    (10, 'Annual travel insurance - which provider?', 'Looking at annual travel insurance since I take 4-5 trips per year. Single trip policies add up fast. Any trusted providers with good claims experience?', 26),
    (12, 'Airbnb long-term discount - how much should I expect?', 'Considering a 60-day Airbnb stay in Portugal. The platform shows 15% monthly discount. Is this typical or should I negotiate more?', 29),
    (14, 'Google Flights vs Skyscanner - which is better?', 'I always use Google Flights but wondering if I''m missing deals on Skyscanner. Does anyone consistently find cheaper flights on one vs the other?', 33),
    (15, 'Street food safety in Southeast Asia - real talk?', 'Excited for Bangkok but worried about street food. Friends warned me about getting sick. How risky is it really if you pick the right spots?', 37)
) AS post_data(module_id, title, content, upvote_count);

-- Insert replies for each post

-- Post 1: Flight booking timing
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Best time to book flights to Asia?') cp
CROSS JOIN (
  VALUES
    ('March is shoulder season for Thailand - great timing! Book 6-8 weeks in advance. That usually hits the sweet spot. I saved €180 on my Bangkok flight this way.', 24),
    ('Pro tip: Set up price alerts on Google Flights and wait for that Tuesday dip. I got mine for €520 roundtrip from Milan!', 18),
    ('Just booked mine for €480. Used incognito mode + checked different dates. March midweek is cheaper than weekends.', 15)
) AS reply_data(content, upvotes);

-- Post 2: Credit card strategy
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Credit card sign-up bonus strategy?') cp
CROSS JOIN (
  VALUES
    ('Totally worth it! I opened 3 cards over 6 months and got 150k points total. Now 2 free business class tickets to NYC. Just space them 3 months apart to avoid red flags.', 42),
    ('Be careful with your credit score. I did 4 cards and my score dipped 30 points. Recovered in 6 months though. The value was worth it for me.', 28),
    ('Which cards are you targeting? The Sapphire Preferred is still king for travel rewards IMO. 50k bonus = €500 travel credit.', 19)
) AS reply_data(content, upvotes);

-- Post 3: Hotel status matching
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Hotel status matching - anyone tried this?') cp
CROSS JOIN (
  VALUES
    ('Yes! I matched my IHG status to Marriott. Took 2 weeks via email. Free breakfast now at most properties - saves €50-80/night!', 35),
    ('Pro tip: Match to Hyatt too if possible. Their free breakfast is the best value among major chains.', 22),
    ('Success rate is ~80% in my experience. Make sure your card status is recognized first before applying for matches. Good luck!', 17)
) AS reply_data(content, upvotes);

-- Post 4: Red-eye flights
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Red-eye flights - worth the sleep loss?') cp
CROSS JOIN (
  VALUES
    ('Depends on the flight length. 5+ hours? The savings aren''t worth it. 2-3 hours? Absolutely take the red-eye. I save on hotels AND flights!', 31),
    ('I sleep better on planes than in hotels so red-eyes are perfect for me. Saved €2,400 last year on cheap overnight flights.', 27),
    ('Coffee and a power nap at your destination airport. Work remotely if possible the next day. Not ideal but the math works out.', 14)
) AS reply_data(content, upvotes);

-- Post 5: Southeast Asia budget
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Southeast Asia on €30/day - possible in 2024?') cp
CROSS JOIN (
  VALUES
    ('Easily doable in Vietnam/Cambodia. Thailand is pricey but still possible outside Bangkok. Budget €25 food, €8 hostel, €2 transport daily.', 38),
    ('I did it last year: €15 dorm, €5 street food, €3 long-distance bus. Leave party cities early and go rural = instant savings.', 29),
    ('Also check Workaway for free accommodation! Stayed 3 weeks at a farm in Thailand for 4 hours work/day. Recommend this route!', 25)
) AS reply_data(content, upvotes);

-- Post 6: No-fee international card
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Best no-fee international card?') cp
CROSS JOIN (
  VALUES
    ('Wise card saved me €80+ last month alone. Real exchange rates, no hidden fees. Best for currency conversion. Plus debit card is instant.', 45),
    ('Charles Schwab checking account is free too! Zero fees on ATM withdrawals worldwide. That alone saves €200+/year vs other banks.', 33),
    ('Get both! Wise for spending abroad, Schwab for ATM withdrawals. I use them together for every trip.', 28)
) AS reply_data(content, upvotes);

-- Post 7: Travel insurance
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Annual travel insurance - which provider?') cp
CROSS JOIN (
  VALUES
    ('SafetyWing is €45/month, unlimited trips. Great for frequent travelers. I had malaria claim in Senegal - paid out €3,500 in 3 days.', 42),
    ('Check your credit card benefits first! My Amex covers €50k medical. Combined with €100/year insurance = rock solid coverage for €100 total.', 31),
    ('Allianz Global is solid but read reviews first. Their claim process can be slow. SafetyWing faster but slightly pricier. Pick your priority.', 19)
) AS reply_data(content, upvotes);

-- Post 8: Airbnb long-term discounts
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Airbnb long-term discount - how much should I expect?') cp
CROSS JOIN (
  VALUES
    ('15% is standard. Some hosts give 20-25% if you message them directly. Always message first with your dates - hosts sometimes do better deals off-platform.', 36),
    ('I negotiated 30% off by booking 90 days. Pro tip: mention you''re a quiet, long-term guest. Hosts love predictability.', 28),
    ('Watch out for cleaning fees! Those kill your savings on long stays. Calculate total cost including all fees before committing.', 22)
) AS reply_data(content, upvotes);

-- Post 9: Flight search engines
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Google Flights vs Skyscanner - which is better?') cp
CROSS JOIN (
  VALUES
    ('Google Flights for price history and flexibility. Skyscanner for finding hidden gem budget airlines. Use both, compare on the airline site directly.', 40),
    ('Pro move: Search Google Flights, then go to the airline website directly to book. Sometimes cheaper than booking through aggregators!', 35),
    ('Kayak has good price prediction. I check all 3 plus directly on airline websites. Takes 10 minutes but saves €50-100 average.', 26)
) AS reply_data(content, upvotes);

-- Post 10: Street food safety
INSERT INTO community_replies (id, post_id, user_id, content, upvote_count, created_at)
SELECT gen_random_uuid(), cp.id, cp.user_id, reply_data.content, reply_data.upvotes, NOW() - INTERVAL '12 hours'
FROM (SELECT id, user_id FROM community_posts WHERE title = 'Street food safety in Southeast Asia - real talk?') cp
CROSS JOIN (
  VALUES
    ('Totally safe if you follow one rule: eat where locals eat, not tourists. The busier the stall = fresher food. Never had an issue this way.', 44),
    ('I got food poisoning once from a fancy restaurant, never from street food. Cooked fresh > pre-made touristy meals. Pick busy stalls.', 37),
    ('Pro tip: Watch the cook. If they''re sloppy, walk away. If they look professional with high turnover, you''re golden. Trust your gut (literally!)', 31)
) AS reply_data(content, upvotes);
