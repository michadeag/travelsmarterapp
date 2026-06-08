const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates
const templates = {
  welcomeEmail: (user) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: '✈️ Welcome to TravelSmarter!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2.5em;">✈️ TravelSmarter</h1>
          <p style="margin: 10px 0 0 0; font-size: 1.1em;">Welcome to Your Travel Hacking Journey!</p>
        </div>
        <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1em; color: #333;">Hi ${user.firstName || 'Traveler'},</p>
          <p style="color: #666; line-height: 1.6;">
            Welcome to TravelSmarter! We're thrilled to have you join our community of travel hackers.
            Get ready to discover amazing deals, hacks, and strategies to travel smarter and save more.
          </p>

          <h3 style="color: #667eea; margin-top: 30px;">What's Next?</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>📱 Explore our 16 travel hacking modules</li>
            <li>🎯 Learn 87 proven travel hacks</li>
            <li>💬 Join our expert community</li>
            <li>🎁 Get exclusive deals and alerts</li>
          </ul>

          <div style="margin-top: 30px; padding: 20px; background: white; border-left: 4px solid #667eea; border-radius: 4px;">
            <p style="color: #667eea; font-weight: bold; margin: 0;">🌟 Pro Tip:</p>
            <p style="color: #666; margin: 10px 0 0 0;">
              Upgrade to Smart Traveler to unlock unlimited access to all our hacks and features!
            </p>
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
              Start Exploring
            </a>
          </div>

          <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 0.9em; text-align: center; margin-top: 20px;">
            Questions? Reply to this email or visit our support center.
          </p>
        </div>
      </div>
    `
  }),

  subscriptionConfirmation: (user, subscription) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: `✅ Your ${subscription.planName} Subscription is Active!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2.5em;">✅ Subscription Confirmed!</h1>
        </div>
        <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1em; color: #333;">Hi ${user.firstName || 'Traveler'},</p>
          <p style="color: #666; line-height: 1.6;">
            Great news! Your subscription is now active. You're all set to enjoy premium access to TravelSmarter.
          </p>

          <div style="margin-top: 30px; padding: 20px; background: white; border: 2px solid #667eea; border-radius: 8px;">
            <h3 style="color: #667eea; margin-top: 0;">Subscription Details</h3>
            <table style="width: 100%; color: #666;">
              <tr>
                <td style="padding: 8px 0;"><strong>Plan:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${subscription.planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Price:</strong></td>
                <td style="padding: 8px 0; text-align: right;">€${subscription.priceMonthly}/month</td>
              </tr>
              <tr style="border-top: 1px solid #eee;">
                <td style="padding: 8px 0;"><strong>Renewal Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date(subscription.nextBillingDate).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <h3 style="color: #667eea; margin-top: 30px;">✨ You Now Have Access To:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>${subscription.tier === 'elite' ? '✅' : '✓'} All 16 Travel Hacking Modules</li>
            <li>${subscription.tier === 'elite' ? '✅' : '✓'} Unlimited Hacks & Deals Access</li>
            <li>${subscription.tier === 'elite' ? '✅' : '✓'} Daily Deal Alerts</li>
            <li>${subscription.tier === 'elite' ? '✅' : '✓'} Expert Community</li>
            ${subscription.tier === 'elite' ? `
              <li>✅ SMS Mistake Fare Alerts</li>
              <li>✅ Expert Consultations</li>
              <li>✅ Custom Deal Filters</li>
              <li>✅ Partner Discounts</li>
              <li>✅ Premium Email Support</li>
            ` : ''}
          </ul>

          <div style="margin-top: 40px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/dashboard"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>

          <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 0.9em; text-align: center; margin-top: 20px;">
            Manage your subscription in account settings anytime.
          </p>
        </div>
      </div>
    `
  }),

  paymentSuccessful: (user, payment) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: `💳 Payment Received - €${payment.amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2.5em;">💳 Payment Successful!</h1>
        </div>
        <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1em; color: #333;">Hi ${user.firstName || 'Traveler'},</p>
          <p style="color: #666; line-height: 1.6;">
            Thank you! Your payment has been processed successfully.
          </p>

          <div style="margin-top: 30px; padding: 20px; background: white; border: 2px solid #10b981; border-radius: 8px;">
            <h3 style="color: #10b981; margin-top: 0;">Payment Details</h3>
            <table style="width: 100%; color: #666;">
              <tr>
                <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right;">€${payment.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString()}</td>
              </tr>
              <tr style="border-top: 1px solid #eee;">
                <td style="padding: 8px 0;"><strong>Subscription Tier:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${payment.tier}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
            <p style="color: #065f46; font-weight: bold; margin: 0;">✅ Your subscription is active!</p>
            <p style="color: #065f46; margin: 10px 0 0 0; line-height: 1.6;">
              You now have full access to all premium features. Enjoy your TravelSmarter experience!
            </p>
          </div>

          <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 0.9em; text-align: center; margin-top: 20px;">
            Invoice and receipt available in your account settings.
          </p>
        </div>
      </div>
    `
  }),

  paymentFailed: (user, payment) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: `⚠️ Payment Failed - Action Required`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2.5em;">⚠️ Payment Failed</h1>
        </div>
        <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1em; color: #333;">Hi ${user.firstName || 'Traveler'},</p>
          <p style="color: #666; line-height: 1.6;">
            We were unable to process your payment. Your subscription may be interrupted if payment is not resolved soon.
          </p>

          <div style="margin-top: 30px; padding: 20px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <p style="color: #991b1b; font-weight: bold; margin: 0;">⚠️ Action Required</p>
            <p style="color: #991b1b; margin: 10px 0 0 0; line-height: 1.6;">
              Please update your payment method to keep your subscription active.
            </p>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/billing"
               style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
              Update Payment Method
            </a>
          </div>

          <p style="color: #666; margin-top: 30px; line-height: 1.6;">
            Common reasons for payment failure:
          </p>
          <ul style="color: #666; line-height: 1.8;">
            <li>Card has expired</li>
            <li>Insufficient funds</li>
            <li>Incorrect card details</li>
            <li>Card issuer declined the transaction</li>
          </ul>

          <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 0.9em; text-align: center; margin-top: 20px;">
            Need help? Contact our support team at support@travelsmarterapp.com
          </p>
        </div>
      </div>
    `
  }),

  subscriptionCancelled: (user) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: '😢 Your TravelSmarter Subscription Has Been Cancelled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 2.5em;">😢 Subscription Cancelled</h1>
        </div>
        <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 1.1em; color: #333;">Hi ${user.firstName || 'Traveler'},</p>
          <p style="color: #666; line-height: 1.6;">
            Your TravelSmarter subscription has been cancelled. You'll lose access to premium features.
          </p>

          <div style="margin-top: 30px; padding: 20px; background: white; border: 2px solid #d1d5db; border-radius: 8px;">
            <h3 style="color: #6b7280; margin-top: 0;">What Happens Next?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Your premium access will expire at the end of your current billing period</li>
              <li>You'll be downgraded to the Free tier automatically</li>
              <li>You can still access limited features with the Free plan</li>
            </ul>
          </div>

          <h3 style="color: #667eea; margin-top: 30px;">We'd Love Your Feedback!</h3>
          <p style="color: #666; line-height: 1.6;">
            If there's anything we can do to improve your experience, please let us know.
            We'd be happy to help! 💙
          </p>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/feedback"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
              Send Feedback
            </a>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #ede9fe; border-left: 4px solid #667eea; border-radius: 4px;">
            <p style="color: #5b21b6; font-weight: bold; margin: 0;">🌟 Come Back Anytime</p>
            <p style="color: #5b21b6; margin: 10px 0 0 0;">
              You can always resubscribe to TravelSmarter when you're ready to continue your travel hacking journey!
            </p>
          </div>

          <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 0.9em; text-align: center; margin-top: 20px;">
            Questions? We're here to help at support@travelsmarterapp.com
          </p>
        </div>
      </div>
    `
  })
};

// Helper function to get plan name from tier
const getPlanName = (tier) => {
  const plans = {
    'free': 'Free',
    'smart_traveler': 'Smart Traveler',
    'elite': 'Elite'
  };
  return plans[tier] || tier;
};

// Email sending functions
const emailService = {
  // Generic email sending function (used by email sequences)
  async sendEmail(msg) {
    try {
      console.log(`📨 Attempting to send email to ${msg.to}`);
      console.log(`🔑 SendGrid API Key status: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);

      // Ensure default from address if not provided
      if (!msg.from) {
        msg.from = process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com';
      }

      console.log(`📧 Sending email: ${msg.subject} to ${msg.to}`);
      await sgMail.send(msg);
      console.log(`✉️ Email sent successfully to ${msg.to}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send email to ${msg.to}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Full error:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send welcome email to new users
  async sendWelcomeEmail(user) {
    try {
      console.log(`📨 Attempting to send welcome email to ${user.email}`);
      console.log(`🔑 SendGrid API Key status: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);

      const msg = templates.welcomeEmail(user);
      console.log(`📧 Email template created for ${user.email}`);

      await sgMail.send(msg);
      console.log(`✉️ Welcome email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${user.email}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Full error:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send subscription confirmation
  async sendSubscriptionConfirmation(user, tier, nextBillingDate) {
    try {
      const subscription = {
        planName: getPlanName(tier),
        priceMonthly: tier === 'elite' ? 49 : tier === 'smart_traveler' ? 19 : 0,
        tier,
        nextBillingDate
      };
      const msg = templates.subscriptionConfirmation(user, subscription);
      await sgMail.send(msg);
      console.log(`✉️ Subscription confirmation sent to ${user.email} (${tier})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send subscription confirmation to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send payment successful email
  async sendPaymentSuccessful(user, amount, tier) {
    try {
      const payment = {
        amount: (amount / 100).toFixed(2), // Convert from cents
        tier: getPlanName(tier)
      };
      const msg = templates.paymentSuccessful(user, payment);
      await sgMail.send(msg);
      console.log(`✉️ Payment success email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send payment success email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send payment failed email
  async sendPaymentFailed(user, amount, tier) {
    try {
      const payment = {
        amount: (amount / 100).toFixed(2),
        tier: getPlanName(tier)
      };
      const msg = templates.paymentFailed(user, payment);
      await sgMail.send(msg);
      console.log(`⚠️ Payment failed email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send payment failed email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send subscription cancelled email
  async sendSubscriptionCancelled(user) {
    try {
      const msg = templates.subscriptionCancelled(user);
      await sgMail.send(msg);
      console.log(`✉️ Cancellation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send cancellation email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = emailService;
