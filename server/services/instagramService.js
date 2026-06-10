const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
// Reuse Pinterest's Ideogram image generation and topic list
const pinterestService = require('./pinterestService');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GRAPH_API = 'https://graph.facebook.com/v19.0';

class InstagramService {
  constructor() {
    this.scheduler = null;
    this.isConfigured = false;
    this.credentials = {};
    this.postCounter = 0;
    this.topicIndex = 0;
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'instagram_%' OR key = 'ideogram_api_key'`
      );
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      this.credentials = {
        accessToken: settings.instagram_access_token || '',
        accountId: settings.instagram_account_id || '',
        ideogramKey: settings.ideogram_api_key || '',
        frequency: settings.instagram_posting_frequency || 'daily',
        maxPosts: parseInt(settings.instagram_max_posts_per_day || '1'),
        postingHours: settings.instagram_posting_hours || '11,18',
        autoPosting: settings.instagram_auto_posting === 'true'
      };

      this.isConfigured = !!(
        this.credentials.accessToken &&
        this.credentials.accountId &&
        this.credentials.ideogramKey
      );

      const counterResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'instagram_post_counter'`
      );
      if (counterResult.rows.length > 0) {
        this.postCounter = parseInt(counterResult.rows[0].value || '0');
      }

      const indexResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'instagram_topic_index'`
      );
      if (indexResult.rows.length > 0) {
        this.topicIndex = parseInt(indexResult.rows[0].value || '0');
      }

      // Sync ideogram key into pinterestService credentials so generateImage works
      pinterestService.credentials.ideogramKey = this.credentials.ideogramKey;

      return this.isConfigured;
    } catch (err) {
      console.error('Instagram: failed to load settings:', err.message);
      return false;
    }
  }

  async generateCaption(topic, includeCTA) {
    const ctaLine = includeCTA
      ? '\n\n🔗 Find more travel deals for free → travelsmarterapp.com (link in bio)'
      : '';

    const prompt = `Write an Instagram caption for a travel infographic titled "${topic.title}" about ${topic.promptTheme}.

The caption should:
- Start with 1–2 hook sentences (surprising fact or bold statement)
- Be energetic and conversational — Instagram tone, not corporate
- Use 3–5 relevant emojis naturally throughout
- End with a question to drive comments
- Include 10–15 relevant hashtags on a new line at the end
- Total length: 100–180 words

Only return the caption text, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text.trim() + ctaLine;
  }

  async publishToInstagram(imageUrl, caption) {
    const { accessToken, accountId } = this.credentials;

    // Step 1: create media container
    const containerRes = await axios.post(
      `${GRAPH_API}/${accountId}/media`,
      null,
      {
        params: {
          image_url: imageUrl,
          caption,
          access_token: accessToken
        }
      }
    );

    const creationId = containerRes.data?.id;
    if (!creationId) throw new Error('Instagram: no creation_id returned');

    // Step 2: publish container
    const publishRes = await axios.post(
      `${GRAPH_API}/${accountId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken
        }
      }
    );

    return publishRes.data?.id || null;
  }

  async createAndPost() {
    if (!this.isConfigured) {
      throw new Error('Instagram not configured — add credentials and Ideogram API key in Settings.');
    }

    const topic = this._getTopic(this.topicIndex);
    this.topicIndex++;

    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;

    // Generate image (reuse Pinterest's Ideogram call) and caption in parallel
    const [imageUrl, caption] = await Promise.all([
      pinterestService.generateImage(topic, includeCTA),
      this.generateCaption(topic, includeCTA)
    ]);

    const postId = await this.publishToInstagram(imageUrl, caption);

    await this._logPost({
      title: topic.title,
      category: topic.category,
      imageUrl,
      caption,
      postId,
      includedCTA: includeCTA,
      status: 'posted'
    });

    return {
      title: topic.title,
      category: topic.category,
      imageUrl,
      postId,
      includedCTA,
      captionPreview: caption.substring(0, 100) + '…'
    };
  }

  // Mirror of Pinterest's topic list — keeps services independent but images identical
  _getTopic(index) {
    const TOPICS = [
      { category: 'budget_flights', title: '5 Hacks to Fly for Way Less', promptTheme: 'flight deals and cheap airfare hacks', pins: ['Use Google Flights + flexible dates', 'Book 6–8 weeks ahead for domestic', 'Set fare alerts on Hopper or Kayak', 'Fly Tue/Wed for the cheapest seats', 'Check nearby airports for big savings'] },
      { category: 'packing', title: 'The Perfect Carry-On Packing List', promptTheme: 'minimalist carry-on packing for any trip', pins: ['3-1-1 liquids in a clear zip bag', 'Roll, don\'t fold — saves 30% space', 'Pack a portable charger + cables', 'One outfit per 2 days (mix & match)', 'Compression cubes = game changer'] },
      { category: 'points_miles', title: 'Earn Miles Without Flying', promptTheme: 'credit card points and airline miles strategy', pins: ['Sign-up bonuses = free business class', 'Use miles card for everyday spend', 'Transfer points to airline partners', 'Shop through airline shopping portals', 'Dining programs earn bonus miles'] },
      { category: 'budget_destinations', title: 'Best Budget Countries in 2025', promptTheme: 'affordable travel destinations worldwide', pins: ['Vietnam — $30/day all-in', 'Portugal — cheapest in Western Europe', 'Colombia — stunning & underrated', 'Georgia (Caucasus) — hidden gem', 'Mexico — world-class food, low cost'] },
      { category: 'airport_hacks', title: 'Airport Tricks Every Traveler Needs', promptTheme: 'airport productivity and travel hacks', pins: ['Skip bag check — always carry-on', 'TSA PreCheck = worth every penny', 'Free lounge access with right credit card', 'Screenshot boarding pass offline', 'Arrive 90 min early, not 3 hours'] },
      { category: 'travel_safety', title: 'Stay Safe Anywhere in the World', promptTheme: 'travel safety tips and smart precautions', pins: ['Use a VPN on public WiFi', 'Keep copies of all documents in email', 'Share itinerary with someone at home', 'Get travel insurance — always', 'Use ATMs inside banks, not on streets'] },
      { category: 'hotel_hacks', title: 'Get More from Every Hotel Stay', promptTheme: 'hotel booking hacks and loyalty tips', pins: ['Book direct for best rate + perks', 'Ask for upgrades at check-in (politely)', 'Loyalty programs unlock free nights fast', 'Use hotel WiFi over cellular abroad', 'Late check-out is often free if you ask'] },
      { category: 'digital_nomad', title: 'Work Remotely from Anywhere', promptTheme: 'digital nomad lifestyle and remote work travel', pins: ['Coworking day pass = $10–20 anywhere', 'Airbnb monthly = way cheaper than nightly', 'Time zones: always be async-first', 'Noise-cancelling headphones are essential', 'Bali, Chiang Mai, Lisbon = nomad hubs'] }
    ];
    return TOPICS[index % TOPICS.length];
  }

  async _logPost({ title, category, imageUrl, caption, postId, includedCTA, status }) {
    try {
      await pool.query(
        `INSERT INTO instagram_posts (title, category, image_url, caption, post_id, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [title, category, imageUrl, caption, postId, includedCTA, status]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('instagram_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('instagram_topic_index', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.topicIndex)]
      );
    } catch (err) {
      console.error('Instagram: failed to log post:', err.message);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT title, category, image_url, caption, post_id, included_cta, status, posted_at
         FROM instagram_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  startScheduler() {
    if (this.scheduler) return { started: false, reason: 'Scheduler already running' };

    const { frequency, maxPosts } = this.credentials;

    let intervalMs;
    if (frequency === 'weekly') {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
    } else if (frequency === 'multiple_daily') {
      intervalMs = Math.floor((14 * 60 * 60 * 1000) / Math.max(maxPosts, 1));
    } else {
      intervalMs = 24 * 60 * 60 * 1000;
    }

    console.log(`📸 Instagram scheduler started — interval: ${Math.round(intervalMs / 60000)} min`);

    this.scheduler = setInterval(async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ Instagram: posted "${result.title}" [${result.category}]`);
      } catch (err) {
        console.error('Instagram scheduler error:', err.message);
      }
    }, intervalMs);

    return { started: true, intervalMinutes: Math.round(intervalMs / 60000), frequency };
  }

  stopScheduler() {
    if (!this.scheduler) return { stopped: false, reason: 'No scheduler running' };
    clearInterval(this.scheduler);
    this.scheduler = null;
    return { stopped: true };
  }

  getStatus() {
    const nextTopic = this._getTopic(this.topicIndex);
    return {
      configured: this.isConfigured,
      schedulerRunning: !!this.scheduler,
      accountId: this.credentials.accountId || null,
      ideogramConfigured: !!this.credentials.ideogramKey,
      frequency: this.credentials.frequency,
      maxPosts: this.credentials.maxPosts,
      postCounter: this.postCounter,
      nextTopic: nextTopic?.title || null,
      autoPosting: this.credentials.autoPosting
    };
  }
}

module.exports = new InstagramService();
