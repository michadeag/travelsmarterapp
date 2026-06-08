const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');

// Pricing configuration
const PRICING = {
  smart_traveler: {
    name: 'Smart Traveler',
    price: 1900, // in cents = €19.00
    priceMonthly: 19.00,
    stripeProductId: 'prod_smart_traveler', // Will be set up in Stripe
  },
  elite: {
    name: 'Elite',
    price: 4900, // in cents = €49.00
    priceMonthly: 49.00,
    stripeProductId: 'prod_elite', // Will be set up in Stripe
  },
};

// @desc Create checkout session
// @route POST /api/subscriptions/checkout
// @access Private
exports.createCheckoutSession = async (req, res) => {
  try {
    const { tier, promoCode } = req.body;
    const userId = req.user.id;

    // Validate tier
    if (!PRICING[tier]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier'
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, email, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, userId]
      );
    }

    // Calculate price with promo code
    let amount = PRICING[tier].price;
    let discountPercent = 0;

    if (promoCode) {
      const promoResult = await pool.query(
        `SELECT discount_percent, discount_amount, current_uses, max_uses FROM promo_codes
         WHERE code = $1 AND is_active = true AND (max_uses IS NULL OR current_uses < max_uses)`,
        [promoCode.toUpperCase()]
      );

      if (promoResult.rows.length > 0) {
        const promo = promoResult.rows[0];
        if (promo.discount_percent) {
          discountPercent = promo.discount_percent;
          amount = Math.round(amount * (1 - promo.discount_percent / 100));
        } else if (promo.discount_amount) {
          amount = Math.max(0, amount - Math.round(promo.discount_amount * 100));
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: PRICING[tier].name,
              description: `TravelSmarter ${PRICING[tier].name} - Monthly Subscription`,
              metadata: {
                tier: tier,
              },
            },
            unit_amount: amount,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout?tier=${tier}`,
      metadata: {
        userId: userId,
        tier: tier,
        promoCode: promoCode || '',
        discountPercent: discountPercent,
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating checkout session',
      error: error.message,
    });
  }
};

// @desc Handle Stripe webhook
// @route POST /api/subscriptions/webhook
// @access Public
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).json({
      success: false,
      message: 'Webhook signature verification failed',
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook handler error',
    });
  }
};

async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const tier = session.metadata.tier;
  const subscriptionId = session.subscription;

  try {
    // Get user details for email
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.error(`User not found: ${userId}`);
      return;
    }

    const user = userResult.rows[0];

    // Get subscription details from Stripe to get billing dates
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    // Update user subscription
    await pool.query(
      `UPDATE users
       SET subscription_tier = $1, subscription_status = 'active', stripe_subscription_id = $2
       WHERE id = $3`,
      [tier, subscriptionId, userId]
    );

    // Create subscription record with billing dates
    const subscriptionResult = await pool.query(
      `INSERT INTO subscriptions (user_id, tier, status, price_monthly, stripe_subscription_id, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, $4, $5, $6)
       RETURNING current_period_end`,
      [userId, tier, PRICING[tier].priceMonthly, subscriptionId, currentPeriodStart, currentPeriodEnd]
    );

    const nextBillingDate = subscriptionResult.rows[0].current_period_end;

    // Log payment
    await pool.query(
      `INSERT INTO payment_history (user_id, stripe_payment_intent_id, amount, status, subscription_tier)
       VALUES ($1, $2, $3, 'completed', $4)`,
      [userId, session.payment_intent, PRICING[tier].priceMonthly, tier]
    );

    // Update promo code usage if applicable
    if (session.metadata.promoCode) {
      await pool.query(
        `UPDATE promo_codes SET current_uses = current_uses + 1
         WHERE code = $1`,
        [session.metadata.promoCode.toUpperCase()]
      );
    }

    // Send subscription confirmation email
    await emailService.sendSubscriptionConfirmation(
      {
        email: user.email,
        firstName: user.first_name
      },
      tier,
      nextBillingDate
    );

    console.log(`✅ Subscription activated for user ${userId} - tier ${tier}`);
  } catch (error) {
    console.error(`Error in handleCheckoutSessionCompleted for user ${userId}:`, error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;
  const status = subscription.status === 'active' ? 'active' : 'inactive';
  const currentPeriodStart = new Date(subscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  // Update user status
  await pool.query(
    `UPDATE users SET subscription_status = $1 WHERE id = $2`,
    [status, userId]
  );

  // Update subscription with billing dates
  await pool.query(
    `UPDATE subscriptions
     SET status = $1, current_period_start = $2, current_period_end = $3, updated_at = CURRENT_TIMESTAMP
     WHERE stripe_subscription_id = $4`,
    [status, currentPeriodStart, currentPeriodEnd, subscription.id]
  );

  console.log(`📝 Subscription updated for user ${userId} - status ${status}, next billing: ${currentPeriodEnd}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  try {
    // Find user by Stripe customer ID
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE stripe_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];
    const userId = user.id;

    // Downgrade to free tier
    await pool.query(
      `UPDATE users SET subscription_tier = 'free', subscription_status = 'inactive' WHERE id = $1`,
      [userId]
    );

    // Send subscription cancellation email
    await emailService.sendSubscriptionCancelled({
      email: user.email,
      firstName: user.first_name
    });

    console.log(`❌ Subscription cancelled for user ${userId}`);
  } catch (error) {
    console.error(`Error in handleSubscriptionDeleted:`, error);
  }
}

async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;

  try {
    const userResult = await pool.query(
      'SELECT id, email, first_name, subscription_tier FROM users WHERE stripe_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];
    const userId = user.id;

    // Log payment
    await pool.query(
      `INSERT INTO payment_history (user_id, stripe_payment_intent_id, amount, status, subscription_tier)
       VALUES ($1, $2, $3, 'completed', $4)`,
      [userId, invoice.payment_intent, invoice.amount_paid / 100, user.subscription_tier]
    );

    // Send payment success email
    await emailService.sendPaymentSuccessful(
      {
        email: user.email,
        firstName: user.first_name
      },
      invoice.amount_paid,
      user.subscription_tier
    );

    console.log(`💰 Payment succeeded for user ${userId}`);
  } catch (error) {
    console.error(`Error in handlePaymentSucceeded:`, error);
  }
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  try {
    const userResult = await pool.query(
      'SELECT id, email, first_name, subscription_tier FROM users WHERE stripe_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];
    const userId = user.id;

    // Log failed payment
    await pool.query(
      `INSERT INTO payment_history (user_id, stripe_payment_intent_id, amount, status, subscription_tier)
       VALUES ($1, $2, $3, 'failed', $4)`,
      [userId, invoice.payment_intent, invoice.amount_paid / 100, user.subscription_tier]
    );

    // Send payment failed email
    await emailService.sendPaymentFailed(
      {
        email: user.email,
        firstName: user.first_name
      },
      invoice.amount_paid,
      user.subscription_tier
    );

    console.log(`⚠️ Payment failed for user ${userId}`);
  } catch (error) {
    console.error(`Error in handlePaymentFailed:`, error);
  }
}

// @desc Get user subscription
// @route GET /api/subscriptions/current
// @access Private
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptionResult = await pool.query(
      `SELECT id, user_id, tier, status, price_monthly, current_period_start, current_period_end
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    // If subscription record exists, return it
    if (subscriptionResult.rows.length > 0) {
      const subscription = subscriptionResult.rows[0];

      return res.status(200).json({
        success: true,
        subscription: {
          id: subscription.id,
          tier: subscription.tier,
          status: subscription.status,
          priceMonthly: subscription.price_monthly,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
        },
      });
    }

    // If no subscription record exists, check the users table for subscription_tier
    // (user may have been manually upgraded via dashboard without subscription record)
    const userResult = await pool.query(
      'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].subscription_tier) {
      const userTier = userResult.rows[0].subscription_tier;
      const userStatus = userResult.rows[0].subscription_status || (userTier === 'free' ? 'inactive' : 'active');

      return res.status(200).json({
        success: true,
        subscription: {
          tier: userTier,
          status: userStatus,
        },
      });
    }

    return res.status(200).json({
      success: true,
      subscription: {
        tier: 'free',
        status: 'inactive',
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message,
    });
  }
};

// @desc Cancel subscription
// @route POST /api/subscriptions/cancel
// @access Private
exports.cancelSubscription = async (req, res) => {
  try {
    // Get user subscription
    const userResult = await pool.query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_subscription_id) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    const subscriptionId = userResult.rows[0].stripe_subscription_id;

    // Cancel at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message,
    });
  }
};

// @desc Get pricing plans
// @route GET /api/subscriptions/pricing
// @access Public
exports.getPricing = async (req, res) => {
  res.status(200).json({
    success: true,
    pricing: {
      free: {
        name: 'Free',
        price: 0,
        features: [
          '3 hacks per month',
          'Basic module access',
          'Community verification',
        ],
      },
      smart_traveler: {
        name: PRICING.smart_traveler.name,
        price: PRICING.smart_traveler.priceMonthly,
        features: [
          'All 16 modules',
          'Unlimited access to 87 hacks',
          'Daily deal alerts',
          'Save hacks & deals',
          'Priority support',
          'Expert community',
        ],
      },
      elite: {
        name: PRICING.elite.name,
        price: PRICING.elite.priceMonthly,
        features: [
          'Everything in Smart Traveler',
          'SMS alerts for mistake fares',
          'Expert consultations (Calendly)',
          'Custom deal filters',
          'Partner discount access',
          'Premium email support',
        ],
      },
    },
  });
};

// @desc Get subscription statistics for dashboard
// @route GET /api/subscriptions/stats
// @access Private
exports.getSubscriptionStats = async (req, res) => {
  try {
    // Get counts by subscription tier (from users table)
    const tierResult = await pool.query(
      `SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier`
    );

    // Get active subscriptions count
    const activeResult = await pool.query(
      `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`
    );

    // Get total MRR (Monthly Recurring Revenue)
    const mrrResult = await pool.query(
      `SELECT SUM(price_monthly) as total_mrr FROM subscriptions WHERE status = 'active'`
    );

    // Map tier results
    let freeCount = 0;
    let smartTravelerCount = 0;
    let eliteCount = 0;

    tierResult.rows.forEach(row => {
      if (row.subscription_tier === 'free') freeCount = parseInt(row.count);
      else if (row.subscription_tier === 'smart_traveler') smartTravelerCount = parseInt(row.count);
      else if (row.subscription_tier === 'elite') eliteCount = parseInt(row.count);
    });

    res.status(200).json({
      success: true,
      active: parseInt(activeResult.rows[0].count),
      free: freeCount,
      smartTraveler: smartTravelerCount,
      elite: eliteCount,
      monthlyRevenue: parseFloat(mrrResult.rows[0].total_mrr) || 0
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription stats',
      error: error.message
    });
  }
};

// @desc Get all subscriptions (admin only)
// @route GET /api/subscriptions
// @access Private
exports.getSubscriptions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.email, u.first_name, u.last_name
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    );

    res.status(200).json({
      success: true,
      subscriptions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

// @desc Update subscription (admin only)
// @route PUT /api/subscriptions/:id
// @access Private
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, status, cancel_at_period_end } = req.body;

    // Check if subscription exists
    const existing = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const result = await pool.query(
      `UPDATE subscriptions
       SET tier = COALESCE($1, tier),
           status = COALESCE($2, status),
           cancel_at_period_end = COALESCE($3, cancel_at_period_end),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [tier, status, cancel_at_period_end, id]
    );

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
};

// @desc Delete subscription (admin only)
// @route DELETE /api/subscriptions/:id
// @access Private
exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subscription exists
    const existing = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Delete subscription
    const result = await pool.query(
      'DELETE FROM subscriptions WHERE id = $1 RETURNING *',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subscription',
      error: error.message
    });
  }
};
