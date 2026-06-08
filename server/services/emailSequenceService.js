const pool = require('../config/database');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

/**
 * Default 10-Day Welcome Email Sequence
 * Used only for seeding the database on first run
 */
const defaultEmailSequence = [
  {
    day: 0,
    subject: '🎉 Welcome to TravelSmarter - Your Travel Hacking Journey Starts Now!',
    html: `<h2>Welcome to TravelSmarter!</h2><p>Hi {firstName},</p><p>Thank you for joining TravelSmarter! You've just unlocked access to 87 proven travel hacks that could save you thousands of euros on your next adventure.</p><p><strong>Here's what you get:</strong></p><ul><li>✈️ Flight hacking strategies used by travel experts</li><li>🏨 Hotel booking secrets nobody talks about</li><li>💳 Credit card optimization for maximum rewards</li><li>🌍 Destination guides with insider tips</li></ul><p>Start exploring now and find your first travel hack!</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Explore Travel Hacks</a></p><p>Happy travels!<br>The TravelSmarter Team</p>`
  },
  {
    day: 1,
    subject: '✈️ Day 1: The 3 Flight Hacks That Save €500+ Per Year',
    html: `<h2>The 3 Flight Hacks That Save €500+ Per Year</h2><p>Hi {firstName},</p><p>Most people pay full price for flights. Not anymore.</p><p><strong>Here are 3 simple hacks that could save you €500+ annually:</strong></p><ol><li><strong>The Tuesday Trick:</strong> Airlines release deals on Tuesday evenings (UTC). Set a calendar reminder and book then.</li><li><strong>The Incognito Hack:</strong> Clear your cookies before searching for flights. Airlines track repeat searches and raise prices.</li><li><strong>The Stopover Strategy:</strong> Flying A→B→C is often cheaper than A→B. Use our module to find hidden stopovers.</li></ol><p>Ready to save? Check out our Flight Hacks module for more strategies.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Flight Hacks</a></p><p>Cheers,<br>The TravelSmarter Team</p>`
  },
  {
    day: 2,
    subject: '🏨 Day 2: How to Get 5-Star Hotels for 3-Star Prices',
    html: `<h2>How to Get 5-Star Hotels for 3-Star Prices</h2><p>Hi {firstName},</p><p>Hotel hacking is the quickest way to upgrade your travel lifestyle.</p><p><strong>Our favorite hotel tricks:</strong></p><ul><li>💎 Join loyalty programs (free!) to get upgrades and free breakfast</li><li>📞 Call the hotel directly 24 hours before arrival - they'll often give you a better room</li><li>⏰ Book at off-peak times (July = expensive, September = bargains)</li><li>🤝 Use our rate comparison tool to find the best deal across 50+ sites</li></ul><p>Want the full hotel hacking playbook? It's in our Hotel Hacks module.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Master Hotel Hacks</a></p><p>Sweet dreams,<br>The TravelSmarter Team</p>`
  },
  {
    day: 3,
    subject: '💳 Day 3: The Credit Card Secret That Pays You To Travel',
    html: `<h2>The Credit Card Secret That Pays You To Travel</h2><p>Hi {firstName},</p><p>Here's the truth: smart travelers get paid to fly.</p><p><strong>The credit card travel hack:</strong></p><p>Premium travel credit cards offer:</p><ul><li>💰 5-10% cashback on flights and hotels</li><li>✈️ Free flights from sign-up bonuses (€500+ value)</li><li>🎫 Lounge access, travel insurance, seat upgrades</li><li>🛡️ Purchase protection on all bookings</li></ul><p>Example: Sign up for a premium card, spend €5,000 in 3 months, get €500-1,000 in travel rewards. Repeat 2-3x per year = 2+ free vacations annually.</p><p>Explore our Credit Cards module to find the best cards for YOUR travel style.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Credit Card Guide</a></p><p>Get rewarded,<br>The TravelSmarter Team</p>`
  },
  {
    day: 4,
    subject: '⏰ Day 4: Timing Intelligence - When To Book for Maximum Savings',
    html: `<h2>Timing Intelligence: When To Book for Maximum Savings</h2><p>Hi {firstName},</p><p>Timing is everything in travel hacking.</p><p><strong>The timing rules most people don't know:</strong></p><ul><li>✈️ <strong>Flights:</strong> Book 1-3 months in advance, on Tuesday evenings (22:00-23:59 UTC)</li><li>🏨 <strong>Hotels:</strong> Book 2-3 weeks before for weekends, 1 week for weekdays</li><li>🚗 <strong>Car rentals:</strong> Last-minute deals appear 1-5 days before pickup</li><li>📅 <strong>Seasons:</strong> Travel in shoulder seasons (April-May, Sept-Oct) for 30-50% savings</li></ul><p>Pro tip: Set price alerts 3 months before your dream trip and watch for dips.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Timing Intelligence Module</a></p><p>Perfect timing,<br>The TravelSmarter Team</p>`
  },
  {
    day: 5,
    subject: '🌍 Day 5: Destination Hacks - Live Like a Local, Not a Tourist',
    html: `<h2>Destination Hacks: Live Like a Local, Not a Tourist</h2><p>Hi {firstName},</p><p>The best travel experiences aren't in guidebooks.</p><p><strong>Our destination hacking strategy:</strong></p><ul><li>🍽️ Eat where locals eat (small family restaurants, market stalls)</li><li>🗺️ Take public transport instead of taxis (90% cheaper, 100% more authentic)</li><li>🏠 Stay in residential neighborhoods, not tourist zones</li><li>🎭 Learn 10 phrases in the local language (opens doors, amazing deals)</li><li>📱 Use local apps (Grab in Asia, Bolt in Europe, etc.)</li></ul><p>Result: 50% cheaper, infinitely better memories.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Explore Destinations</a></p><p>Wander wisely,<br>The TravelSmarter Team</p>`
  },
  {
    day: 6,
    subject: '🛂 Day 6: Visa & Immigration Hacks (Yes, They Exist)',
    html: `<h2>Visa & Immigration Hacks (Yes, They Exist)</h2><p>Hi {firstName},</p><p>Visa costs, processing times, and restrictions frustrate travelers. But there are ways around them.</p><p><strong>Smart visa strategies:</strong></p><ul><li>🛂 <strong>Visa-free routes:</strong> Some countries let you enter with just a passport</li><li>⏱️ <strong>Visa runs:</strong> Leave and re-enter to reset your stay limit (90+90 days)</li><li>💼 <strong>Digital nomad visas:</strong> Portugal, Spain, Estonia offer 1-2 year visas for remote workers</li><li>🎓 <strong>Student visas:</strong> Study a cheap course abroad, travel visa-free for 6+ months</li><li>📋 <strong>Slow travel:</strong> Some countries have 10-year tourist visas (Japan, Thailand)</li></ul><p>The visa module has country-by-country guides for maximum flexibility.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Visa Guides</a></p><p>Travel freely,<br>The TravelSmarter Team</p>`
  },
  {
    day: 7,
    subject: '💰 Day 7: Money Hacks - Convert Currencies Like a Pro',
    html: `<h2>Money Hacks: Convert Currencies Like a Pro</h2><p>Hi {firstName},</p><p>Currency exchange is where most travelers lose 10-20% of their money. Not you.</p><p><strong>The travel money strategy:</strong></p><ul><li>🏦 <strong>Never use airport/ATM exchange rates:</strong> They're 5-10% worse</li><li>💳 <strong>Use no-fee travel cards:</strong> Wise, N26, Revolut (0% fees, real rates)</li><li>💵 <strong>Get local currency before you travel:</strong> Best rates are at your home bank</li><li>🤐 <strong>Avoid currency exchange shops:</strong> They're a tourist trap (20%+ markup)</li><li>📊 <strong>Time your conversions:</strong> Convert when rates are favorable</li></ul><p>With Wise Card: €1,000 becomes €950 with a tourist trap, but €985 with Wise. That's €35 saved on one transaction!</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Travel Money Guides</a></p><p>Keep your money,<br>The TravelSmarter Team</p>`
  },
  {
    day: 8,
    subject: '🎒 Day 8: Packing Hacks & Travel Insurance Secrets',
    html: `<h2>Packing Hacks & Travel Insurance Secrets</h2><p>Hi {firstName},</p><p>Smart packing saves time, money, and baggage fees. Smart insurance saves thousands.</p><p><strong>Packing like a pro:</strong></p><ul><li>🧳 Carry-on only = €100+ in baggage fees saved</li><li>👔 Pack capsule wardrobe (5 tops, 2 bottoms, same color palette)</li><li>🎒 Ultralight backpack (40L) vs luggage = freedom</li><li>📱 Use packing cubes to organize and compress</li></ul><p><strong>Travel insurance that actually protects you:</strong></p><ul><li>✅ Get annual travel insurance (€100/year) vs per-trip (€20/trip)</li><li>✅ Make sure it covers high-risk activities (hiking, skiing)</li><li>✅ Check if your credit card includes travel insurance</li></ul><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Packing & Insurance Guide</a></p><p>Travel smart,<br>The TravelSmarter Team</p>`
  },
  {
    day: 9,
    subject: '🚀 Day 9: Your Travel Hacking Blueprint (The Complete System)',
    html: `<h2>Your Travel Hacking Blueprint (The Complete System)</h2><p>Hi {firstName},</p><p>You've learned 9 travel hacks. Now let's put them together into a complete system.</p><p><strong>The TravelSmarter System:</strong></p><ol><li>📅 <strong>Plan 3 months ahead:</strong> Pick destination, set price alerts</li><li>💳 <strong>Use credit cards:</strong> Sign up 3 months before trip, get bonus points</li><li>✈️ <strong>Book flights:</strong> Tuesday evening, 1-3 months out</li><li>🏨 <strong>Book hotels:</strong> Using loyalty points or last-minute deals</li><li>💰 <strong>Exchange money:</strong> With no-fee card, real rates</li><li>🎒 <strong>Pack light:</strong> Carry-on only, no baggage fees</li><li>🌍 <strong>Travel like local:</strong> Eat local, use public transport</li><li>📸 <strong>Enjoy the adventure:</strong> You just saved 50%!</li></ol><p><strong>Result: Same trips, half the cost, twice the memories.</strong></p><p>You're ready. Start with your next trip.</p><p><a href="{appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Build Your Trip</a></p><p>Happy travels!<br>The TravelSmarter Team</p>`
  },
  {
    day: 10,
    subject: '🎁 Day 10: Exclusive Offer Inside - Upgrade Your Travel Game',
    html: `<h2>🎁 Your Exclusive Member-Only Offer</h2><p>Hi {firstName},</p><p>Over the last 10 days, you've learned the travel hacking secrets most people never discover.</p><p>But the real power comes from using these hacks consistently, on every trip.</p><p><strong>This week only, you get:</strong></p><ul><li>✨ <strong>Smart Traveler Plan:</strong> €9.99/month (instead of €19)</li><li>🏆 <strong>Elite Plan:</strong> €39/month (instead of €49) </li><li>📚 <strong>Lifetime access</strong> to all 87 hacks</li><li>📧 <strong>Weekly deals</strong> - we find deals and send them to you</li><li>🎯 <strong>Personalized recommendations</strong> - based on your travel style</li></ul><p>With Smart Traveler, your €150/year membership pays for itself on your first trip.</p><p><strong>Upgrade now with your exclusive new-member discount:</strong></p><p><a href="{appUrl}/pricing" style="background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">Claim Your Discount</a></p><p style="margin-top: 20px; font-size: 12px; color: #999;">Offer expires in 7 days. Your discount code is automatically applied at checkout.</p><p>Enjoy the journey,<br>The TravelSmarter Team</p>`
  }
];

/**
 * Seed the database with default email templates on first run
 */
async function seedEmailSequence() {
  try {
    // Check if "Welcome Email Sequence" already exists
    const existing = await pool.query(
      `SELECT id FROM email_sequences WHERE name = $1`,
      ['Welcome Email Sequence']
    );

    if (existing.rows.length > 0) {
      console.log('✅ Email sequence already seeded');
      return existing.rows[0].id;
    }

    // Create the sequence
    const sequenceId = uuidv4();
    await pool.query(
      `INSERT INTO email_sequences (id, name, description, is_active, trigger_event, created_at)
       VALUES ($1, $2, $3, true, 'signup', CURRENT_TIMESTAMP)`,
      [sequenceId, 'Welcome Email Sequence', '10-day automated welcome sequence for new users']
    );

    // Add all 10 email templates
    for (const email of defaultEmailSequence) {
      await pool.query(
        `INSERT INTO email_templates (id, sequence_id, day, subject, content, html_content, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)`,
        [
          uuidv4(),
          sequenceId,
          email.day,
          email.subject,
          email.html.replace(/<[^>]*>/g, ''), // Plain text version (strip HTML)
          email.html
        ]
      );
    }

    console.log('✅ Default email sequence seeded with 10 templates');
    return sequenceId;
  } catch (error) {
    console.error('❌ Error seeding email sequence:', error);
    throw error;
  }
}

/**
 * Initialize email sequence for new user
 * Creates scheduled_emails records for all templates in the default sequence
 */
async function initializeEmailSequence(userId, userEmail, firstName) {
  try {
    console.log(`📧 Initializing email sequence for user ${userId} (${userEmail})`);

    // Get the default "Welcome Email Sequence"
    const sequenceResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = $1 AND is_active = true LIMIT 1`,
      ['Welcome Email Sequence']
    );

    if (sequenceResult.rows.length === 0) {
      console.warn('⚠️ No active email sequence found, skipping email scheduling');
      return { success: false, message: 'No active email sequence configured' };
    }

    const sequenceId = sequenceResult.rows[0].id;
    console.log(`📬 Found email sequence: ${sequenceId}`);

    // Get all templates for this sequence ordered by day
    const templatesResult = await pool.query(
      `SELECT id, day, subject FROM email_templates
       WHERE sequence_id = $1 AND is_active = true
       ORDER BY day ASC`,
      [sequenceId]
    );

    if (templatesResult.rows.length === 0) {
      console.warn('⚠️ No email templates found for the sequence');
      return { success: false, message: 'No email templates found' };
    }

    console.log(`📧 Found ${templatesResult.rows.length} email templates`);

    // Schedule all templates for this user
    let scheduledCount = 0;
    for (const template of templatesResult.rows) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + template.day);
      scheduledAt.setHours(9, 0, 0, 0); // 9 AM

      try {
        await pool.query(
          `INSERT INTO scheduled_emails (user_id, template_id, scheduled_at, status, created_at)
           VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)`,
          [userId, template.id, scheduledAt]
        );
        scheduledCount++;
        console.log(`✅ Scheduled email Day ${template.day} for ${userEmail} at ${scheduledAt}`);
      } catch (insertError) {
        console.error(`❌ Failed to schedule Day ${template.day} email:`, insertError.message);
      }
    }

    console.log(`✅ Email sequence initialized for ${userEmail} (${scheduledCount}/${templatesResult.rows.length} emails scheduled)`);
    return { success: true, message: `${scheduledCount} emails scheduled`, scheduledCount };
  } catch (error) {
    console.error('❌ Error initializing email sequence:', error);
    throw error;
  }
}

/**
 * Send pending emails (call this periodically via cron job)
 * Reads templates from the database
 */
async function sendPendingEmails() {
  try {
    console.log('🔄 Checking for pending emails to send...');

    // Check if tables exist first
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_emails')`
    );

    if (!tableCheck.rows[0].exists) {
      console.warn('⚠️ scheduled_emails table does not exist yet, skipping');
      return { sent: 0 };
    }

    // Find emails that are due to be sent
    const result = await pool.query(`
      SELECT se.id, se.user_id, se.template_id, u.email, u.first_name,
             et.day, et.subject, et.html_content
      FROM scheduled_emails se
      JOIN users u ON se.user_id = u.id
      JOIN email_templates et ON se.template_id = et.id
      WHERE se.status = 'pending'
      AND se.scheduled_at <= NOW()
      AND et.is_active = true
      ORDER BY se.scheduled_at ASC
    `);

    if (result.rows.length === 0) {
      console.log('✅ No pending emails to send');
      return { sent: 0 };
    }

    let sentCount = 0;

    for (const row of result.rows) {
      try {
        // Replace placeholders in the HTML template
        const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
        const emailHtml = row.html_content
          .replace(/{firstName}/g, row.first_name || 'Traveler')
          .replace(/{appUrl}/g, appUrl);

        // Send email using existing emailService
        await emailService.sendEmail({
          to: row.email,
          subject: row.subject,
          html: `
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="100%" maxwidth="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px;">
                    <tr>
                      <td style="padding: 40px; color: #1f2937; line-height: 1.6;">
                        ${emailHtml}
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
                        <p style="font-size: 12px; color: #9ca3af;">
                          You received this email because you signed up for TravelSmarter.<br>
                          <a href="${appUrl}/settings" style="color: #667eea; text-decoration: none;">Manage preferences</a> |
                          <a href="${appUrl}/unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `
        });

        // Mark as sent
        await pool.query(
          `UPDATE scheduled_emails SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [row.id]
        );

        sentCount++;
        console.log(`✅ Sent day ${row.day} email to ${row.email}`);
      } catch (error) {
        console.error(`❌ Error sending email for scheduled_email ${row.id}:`, error);
        // Mark as failed but don't stop the process
        await pool.query(
          `UPDATE scheduled_emails SET status = 'failed' WHERE id = $1`,
          [row.id]
        );
      }
    }

    console.log(`✅ Sent ${sentCount} emails`);
    return { sent: sentCount };
  } catch (error) {
    console.error('❌ Error sending pending emails:', error);
    throw error;
  }
}

module.exports = {
  initializeEmailSequence,
  sendPendingEmails,
  seedEmailSequence
};
