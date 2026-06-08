/**
 * Seed Routes
 * Admin endpoints for seeding sample data
 * WARNING: Only use in development - these should be behind admin authentication in production
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Reset community discussions (delete all posts and replies)
 * POST /api/admin/seed/community/reset
 */
router.post('/community/reset', async (req, res) => {
  try {
    // Delete all replies first (due to foreign key constraints)
    await pool.query('DELETE FROM community_replies');

    // Delete all posts
    await pool.query('DELETE FROM community_posts');

    res.json({
      success: true,
      message: 'Community discussions cleared. Ready to reseed.'
    });
  } catch (error) {
    console.error('Error resetting community:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting community',
      error: error.message
    });
  }
});

/**
 * Seed community discussions
 * POST /api/admin/seed/community
 */
router.post('/community', async (req, res) => {
  try {
    // Check if community posts already exist
    const result = await pool.query('SELECT COUNT(*) as count FROM community_posts');
    const postCount = parseInt(result.rows[0].count);

    if (postCount > 0) {
      return res.json({
        success: false,
        message: `Community already has ${postCount} posts. Use /reset first if you want to reseed.`
      });
    }

    // Create demo Elite user
    const demoUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['demo@travelsmarterapp.com']
    );

    let demoUserId;
    if (demoUserResult.rows.length === 0) {
      const createUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['demo@travelsmarterapp.com', 'hashed_demo_password', 'Community', 'Expert', 'elite']
      );
      demoUserId = createUserResult.rows[0].id;
    } else {
      demoUserId = demoUserResult.rows[0].id;
    }

    // Community posts data
    const posts = [
      {
        module_id: 1,
        title: 'Best time to book flights to Asia?',
        content: 'I\'m planning a trip to Thailand in March. Should I book now or wait? I\'ve been monitoring prices and they seem to fluctuate daily. Any tips on when to pull the trigger?',
        replies: [
          { content: 'March is shoulder season for Thailand - great timing! Book 6-8 weeks in advance. That usually hits the sweet spot. I saved €180 on my Bangkok flight this way.', upvotes: 24 },
          { content: 'Pro tip: Set up price alerts on Google Flights and wait for that Tuesday dip. I got mine for €520 roundtrip from Milan!', upvotes: 18 },
          { content: 'Just booked mine for €480. Used incognito mode + checked different dates. March midweek is cheaper than weekends.', upvotes: 15 }
        ]
      },
      {
        module_id: 2,
        title: 'Credit card sign-up bonus strategy?',
        content: 'Has anyone successfully used multiple sign-up bonuses in a short period? I\'m planning 3 trips this year and want to maximize my points. Is it worth opening 2-3 cards back to back?',
        replies: [
          { content: 'Totally worth it! I opened 3 cards over 6 months and got 150k points total. Now 2 free business class tickets to NYC. Just space them 3 months apart to avoid red flags.', upvotes: 42 },
          { content: 'Be careful with your credit score. I did 4 cards and my score dipped 30 points. Recovered in 6 months though. The value was worth it for me.', upvotes: 28 },
          { content: 'Which cards are you targeting? The Sapphire Preferred is still king for travel rewards IMO. 50k bonus = €500 travel credit.', upvotes: 19 }
        ]
      },
      {
        module_id: 3,
        title: 'Hotel status matching - anyone tried this?',
        content: 'Just got a new travel card with Platinum Hotel status. Can I actually match to other hotel chains? What\'s the process and success rate?',
        replies: [
          { content: 'Yes! I matched my IHG status to Marriott. Took 2 weeks via email. Free breakfast now at most properties - saves €50-80/night!', upvotes: 35 },
          { content: 'Pro tip: Match to Hyatt too if possible. Their free breakfast is the best value among major chains.', upvotes: 22 },
          { content: 'Success rate is ~80% in my experience. Make sure your card status is recognized first before applying for matches. Good luck!', upvotes: 17 }
        ]
      },
      {
        module_id: 4,
        title: 'Red-eye flights - worth the sleep loss?',
        content: 'Debating whether to save €150-200 on a red-eye flight or just pay extra for a morning departure. Mentally how do you recover the next day?',
        replies: [
          { content: 'Depends on the flight length. 5+ hours? The savings aren\'t worth it. 2-3 hours? Absolutely take the red-eye. I save on hotels AND flights!', upvotes: 31 },
          { content: 'I sleep better on planes than in hotels so red-eyes are perfect for me. Saved €2,400 last year on cheap overnight flights.', upvotes: 27 },
          { content: 'Coffee and a power nap at your destination airport. Work remotely if possible the next day. Not ideal but the math works out.', upvotes: 14 }
        ]
      },
      {
        module_id: 6,
        title: 'Southeast Asia on €30/day - possible in 2024?',
        content: 'Thinking about a 2-month backpacking trip through Vietnam, Thailand, Cambodia. Is €30/day realistic with good food and nice hostels?',
        replies: [
          { content: 'Easily doable in Vietnam/Cambodia. Thailand is pricey but still possible outside Bangkok. Budget €25 food, €8 hostel, €2 transport daily.', upvotes: 38 },
          { content: 'I did it last year: €15 dorm, €5 street food, €3 long-distance bus. Leave party cities early and go rural = instant savings.', upvotes: 29 },
          { content: 'Also check Workaway for free accommodation! Stayed 3 weeks at a farm in Thailand for 4 hours work/day. Recommend this route!', upvotes: 25 }
        ]
      },
      {
        module_id: 9,
        title: 'Best no-fee international card?',
        content: 'Currently using a card with 3% foreign transaction fees. Thinking about switching. Has anyone compared Wise vs Charles Schwab vs others?',
        replies: [
          { content: 'Wise card saved me €80+ last month alone. Real exchange rates, no hidden fees. Best for currency conversion. Plus debit card is instant.', upvotes: 45 },
          { content: 'Charles Schwab checking account is free too! Zero fees on ATM withdrawals worldwide. That alone saves €200+/year vs other banks.', upvotes: 33 },
          { content: 'Get both! Wise for spending abroad, Schwab for ATM withdrawals. I use them together for every trip.', upvotes: 28 }
        ]
      },
      {
        module_id: 10,
        title: 'Annual travel insurance - which provider?',
        content: 'Looking at annual travel insurance since I take 4-5 trips per year. Single trip policies add up fast. Any trusted providers with good claims experience?',
        replies: [
          { content: 'SafetyWing is €45/month, unlimited trips. Great for frequent travelers. I had malaria claim in Senegal - paid out €3,500 in 3 days.', upvotes: 42 },
          { content: 'Check your credit card benefits first! My Amex covers €50k medical. Combined with €100/year insurance = rock solid coverage for €100 total.', upvotes: 31 },
          { content: 'Allianz Global is solid but read reviews first. Their claim process can be slow. SafetyWing faster but slightly pricier. Pick your priority.', upvotes: 19 }
        ]
      },
      {
        module_id: 12,
        title: 'Airbnb long-term discount - how much should I expect?',
        content: 'Considering a 60-day Airbnb stay in Portugal. The platform shows 15% monthly discount. Is this typical or should I negotiate more?',
        replies: [
          { content: '15% is standard. Some hosts give 20-25% if you message them directly. Always message first with your dates - hosts sometimes do better deals off-platform.', upvotes: 36 },
          { content: 'I negotiated 30% off by booking 90 days. Pro tip: mention you\'re a quiet, long-term guest. Hosts love predictability.', upvotes: 28 },
          { content: 'Watch out for cleaning fees! Those kill your savings on long stays. Calculate total cost including all fees before committing.', upvotes: 22 }
        ]
      },
      {
        module_id: 14,
        title: 'Google Flights vs Skyscanner - which is better?',
        content: 'I always use Google Flights but wondering if I\'m missing deals on Skyscanner. Does anyone consistently find cheaper flights on one vs the other?',
        replies: [
          { content: 'Google Flights for price history and flexibility. Skyscanner for finding hidden gem budget airlines. Use both, compare on the airline site directly.', upvotes: 40 },
          { content: 'Pro move: Search Google Flights, then go to the airline website directly to book. Sometimes cheaper than booking through aggregators!', upvotes: 35 },
          { content: 'Kayak has good price prediction. I check all 3 plus directly on airline websites. Takes 10 minutes but saves €50-100 average.', upvotes: 26 }
        ]
      },
      {
        module_id: 15,
        title: 'Street food safety in Southeast Asia - real talk?',
        content: 'Excited for Bangkok but worried about street food. Friends warned me about getting sick. How risky is it really if you pick the right spots?',
        replies: [
          { content: 'Totally safe if you follow one rule: eat where locals eat, not tourists. The busier the stall = fresher food. Never had an issue this way.', upvotes: 44 },
          { content: 'I got food poisoning once from a fancy restaurant, never from street food. Cooked fresh > pre-made touristy meals. Pick busy stalls.', upvotes: 37 },
          { content: 'Pro tip: Watch the cook. If they\'re sloppy, walk away. If they look professional with high turnover, you\'re golden. Trust your gut (literally!)', upvotes: 31 }
        ]
      }
    ];

    // Insert posts and replies
    let insertedPosts = 0;
    let insertedReplies = 0;

    for (const post of posts) {
      const postResult = await pool.query(
        `INSERT INTO community_posts (user_id, module_id, title, content, upvote_count)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [demoUserId, post.module_id, post.title, post.content, 12 + Math.floor(Math.random() * 20)]
      );

      const postId = postResult.rows[0].id;
      insertedPosts++;

      // Insert replies
      for (const reply of post.replies) {
        await pool.query(
          `INSERT INTO community_replies (post_id, user_id, content, upvote_count)
           VALUES ($1, $2, $3, $4)`,
          [postId, demoUserId, reply.content, reply.upvotes]
        );
        insertedReplies++;
      }
    }

    res.json({
      success: true,
      message: `Successfully seeded ${insertedPosts} community posts with ${insertedReplies} replies!`,
      posts: insertedPosts,
      replies: insertedReplies
    });
  } catch (error) {
    console.error('Error seeding community:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding community',
      error: error.message
    });
  }
});

/**
 * Add demo replies to existing community posts
 * POST /api/admin/seed/community/replies
 */
router.post('/community/replies', async (req, res) => {
  try {
    // Create demo users for replies
    const demoUsers = [
      { email: 'sarah@travelhacker.com', name: 'Sarah', tier: 'elite' },
      { email: 'james@wanderlust.com', name: 'James', tier: 'elite' },
      { email: 'emma@globetrotter.com', name: 'Emma', tier: 'elite' }
    ];

    const userIds = [];
    for (const user of demoUsers) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length === 0) {
        const newUser = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [user.email, 'hashed_password', user.name, 'Traveler', user.tier]
        );
        userIds.push({ name: user.name, id: newUser.rows[0].id });
      } else {
        userIds.push({ name: user.name, id: existingUser.rows[0].id });
      }
    }

    // Get all posts for module 8
    const postsResult = await pool.query(
      'SELECT id, title FROM community_posts WHERE module_id = 8 ORDER BY created_at DESC LIMIT 10'
    );

    if (postsResult.rows.length === 0) {
      return res.json({
        success: false,
        message: 'No posts found for Module 8. Create posts first.'
      });
    }

    // Reply data mapped to post titles
    const replyData = {
      'Best time to visit Thailand?': [
        { user: 'Sarah', content: 'March-May is perfect! Less rain and fewer tourists. I saved €200 on my March trip by going mid-week.', upvotes: 8 },
        { user: 'James', content: 'Shoulder season is the way to go. Book 8 weeks in advance for best prices. I got roundtrip flights for €480!', upvotes: 12 }
      ],
      'Loyalty status hacks?': [
        { user: 'Sarah', content: 'Status matching saved me thousands! Matched my IHG elite to Marriott. Free breakfast now at most properties.', upvotes: 15 },
        { user: 'James', content: 'Pro tip: Match during low travel season for better negotiation. Hotels are more willing to match their benefits.', upvotes: 9 }
      ],
      'Credit card sign-up bonuses': [
        { user: 'Emma', content: 'I opened 2 cards strategically and got 3 free economy flights. The key is timing your spending around bonuses.', upvotes: 14 },
        { user: 'James', content: 'Just hit 200k points across my cards! Planning 4 free flights this year alone. Best investment ever.', upvotes: 11 }
      ],
      'Hotel upgrade strategies': [
        { user: 'James', content: 'Late check-in is your friend! Hotels love upgrading guests after 3pm when they know their occupancy.', upvotes: 13 },
        { user: 'Sarah', content: 'Loyalty status matters too. Even without a special occasion, elite members get free upgrades regularly.', upvotes: 10 }
      ],
      'Best travel insurance providers': [
        { user: 'Emma', content: 'SafetyWing paid out my claim in 3 days! Customer service was super responsive. Highly recommend.', upvotes: 16 },
        { user: 'Sarah', content: 'I use Allianz for longer trips. Bit more expensive but comprehensive coverage is worth it.', upvotes: 7 }
      ]
    };

    let repliesAdded = 0;

    // Add replies to posts
    for (const post of postsResult.rows) {
      const replies = replyData[post.title] || [];

      for (const reply of replies) {
        const userId = userIds.find(u => u.name === reply.user)?.id;
        if (userId) {
          await pool.query(
            `INSERT INTO community_replies (post_id, user_id, content, upvote_count)
             VALUES ($1, $2, $3, $4)`,
            [post.id, userId, reply.content, reply.upvotes]
          );
          repliesAdded++;
        }
      }
    }

    res.json({
      success: true,
      message: `Added ${repliesAdded} replies from ${userIds.length} demo users!`,
      replies: repliesAdded,
      users: userIds.length
    });
  } catch (error) {
    console.error('Error adding replies:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding replies',
      error: error.message
    });
  }
});

module.exports = router;
