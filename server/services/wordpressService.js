const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
  { title: 'The Ultimate Guide to Finding Cheap Flights: 12 Strategies That Actually Work', category: 'flights', tags: ['cheap flights', 'travel hacks', 'budget travel'] },
  { title: 'How to Travel Europe on $50 a Day (Without Sacrificing Experience)', category: 'budget', tags: ['budget travel', 'Europe', 'backpacking'] },
  { title: 'Credit Card Points for Beginners: How to Fly Business Class for Free', category: 'points_miles', tags: ['points and miles', 'business class', 'travel rewards'] },
  { title: 'The Best Travel Apps Every Traveler Needs in 2025', category: 'tools', tags: ['travel apps', 'travel tools', 'travel tips'] },
  { title: 'How to Pack a Carry-On for 2 Weeks: The Minimalist Packing List', category: 'packing', tags: ['packing tips', 'carry-on', 'minimalist travel'] },
  { title: 'Digital Nomad Destinations: 10 Countries With Fast WiFi and Low Cost of Living', category: 'nomad', tags: ['digital nomad', 'remote work', 'travel destinations'] },
  { title: 'Travel Insurance Explained: What It Covers, What It Doesn\'t, and When You Need It', category: 'insurance', tags: ['travel insurance', 'travel planning', 'travel tips'] },
  { title: 'Airport Hacks Frequent Flyers Swear By (Most People Don\'t Know These)', category: 'airports', tags: ['airport hacks', 'frequent flyer', 'travel tips'] },
  { title: 'Hidden Gem Destinations: 8 Places to Visit Before They Get Overrun by Tourists', category: 'destinations', tags: ['hidden gems', 'travel destinations', 'off the beaten path'] },
  { title: 'How Hotel Loyalty Programs Work — And How to Get Free Nights Faster', category: 'hotels', tags: ['hotel loyalty', 'free nights', 'travel rewards'] }
];

const WP_API_BASE = 'https://public-api.wordpress.com';

class WordPressService {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.accessToken = null;
    this.siteId = null;
    this.frequencyHours = 48;
    this.autoPosting = false;
    this.postCounter = 0;
    this.schedulerInterval = null;
    this.redirectUri = 'https://localhost';
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key IN (
          'wordpress_client_id','wordpress_client_secret','wordpress_access_token',
          'wordpress_site_id','wordpress_frequency_hours','wordpress_auto_posting',
          'wordpress_post_counter'
        )`
      );
      result.rows.forEach(({ key, value }) => {
        if (key === 'wordpress_client_id') this.clientId = value;
        if (key === 'wordpress_client_secret') this.clientSecret = value;
        if (key === 'wordpress_access_token') this.accessToken = value;
        if (key === 'wordpress_site_id') this.siteId = value;
        if (key === 'wordpress_frequency_hours') this.frequencyHours = parseInt(value) || 48;
        if (key === 'wordpress_auto_posting') this.autoPosting = value === 'true';
        if (key === 'wordpress_post_counter') this.postCounter = parseInt(value) || 0;
      });
    } catch (err) {
      console.error('WordPress: loadSettings error:', err.message);
    }
  }

  getAuthUrl() {
    if (!this.clientId) throw new Error('WordPress Client ID nicht konfiguriert.');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'posts'
    });
    return `${WP_API_BASE}/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('WordPress OAuth2 Credentials nicht konfiguriert.');
    }
    const response = await axios.post(`${WP_API_BASE}/oauth2/token`, new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const { access_token, blog_id, blog_url } = response.data;
    if (!access_token) throw new Error('Kein access_token zurückgegeben.');

    this.accessToken = access_token;
    if (blog_id) this.siteId = String(blog_id);

    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('wordpress_access_token', $1, 'text')
       ON CONFLICT (key) DO UPDATE SET value = $1`, [access_token]
    );
    if (blog_id) {
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('wordpress_site_id', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`, [String(blog_id)]
      );
    }

    return { access_token, blog_id, blog_url };
  }

  async fetchSites() {
    if (!this.accessToken) throw new Error('Nicht verbunden. Bitte zuerst WordPress-Konto verbinden.');
    const response = await axios.get(`${WP_API_BASE}/rest/v1.1/me/sites`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    return (response.data.sites || []).map(s => ({ id: s.ID, name: s.name, url: s.URL }));
  }

  async generateArticle(topic, includeCTA) {
    const ctaSection = includeCTA
      ? `\n\n<p><em>One tool that makes all of this much easier: <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> — it\'s completely free and automatically tracks flight deals, travel hacks, and money-saving tips so you never miss out. Worth bookmarking before your next trip.</em></p>`
      : '';

    const prompt = `You are a travel expert writing a high-quality SEO blog post for WordPress.

Title: "${topic.title}"
Category: ${topic.category}

Write a complete blog post that:
- Opens with an engaging 2-3 sentence intro (no "In this article" or "Today we'll cover" phrases)
- Has 5-7 clear H2 sections, each with 150-200 words of useful, specific content
- Includes real examples, numbers, and actionable tips throughout
- Uses natural, conversational tone — not corporate or listicle-style
- Closes with a 2-3 sentence conclusion that encourages action
- Total length: 900-1200 words

Format as clean HTML using only: <h2>, <p>, <ul>, <li>, <strong>, <em>, <a>
Do NOT include <html>, <head>, <body> wrapper tags. No inline styles.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = response.content[0].text.trim() + ctaSection;
    return { title: topic.title, body, category: topic.category, tags: topic.tags };
  }

  async publishPost(title, body, tags) {
    if (!this.accessToken) throw new Error('Nicht verbunden.');
    if (!this.siteId) throw new Error('WordPress Site ID nicht konfiguriert.');

    const response = await axios.post(
      `${WP_API_BASE}/rest/v1.1/sites/${this.siteId}/posts/new`,
      { title, content: body, status: 'publish', tags: tags.join(',') },
      { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
    );

    return { id: String(response.data.ID), url: response.data.URL };
  }

  async createAndPost(topicIndex = null) {
    await this.loadSettings();
    const index = topicIndex !== null ? topicIndex : this.postCounter % TOPICS.length;
    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;
    const topic = TOPICS[index % TOPICS.length];

    const { title, body, category, tags } = await this.generateArticle(topic, includeCTA);
    const { id, url } = await this.publishPost(title, body, tags);

    await this._logPost({ title, body, category, wpPostId: id, wpUrl: url, includedCTA: includeCTA });
    return { title, category, wpPostId: id, wpUrl: url, includedCTA: includeCTA };
  }

  async _logPost({ title, body, category, wpPostId, wpUrl, includedCTA }) {
    try {
      await pool.query(
        `INSERT INTO wordpress_posts (title, body, category, wp_post_id, wp_url, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())`,
        [title, body, category, wpPostId, wpUrl, includedCTA]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('wordpress_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('WordPress: failed to log post:', err.message);
    }
  }

  startScheduler() {
    if (this.schedulerInterval) return { started: false, reason: 'Scheduler läuft bereits' };
    if (!this.autoPosting) return { started: false, reason: 'Auto-Posting ist deaktiviert' };
    if (!this.accessToken) return { started: false, reason: 'WordPress-Konto nicht verbunden' };
    if (!this.siteId) return { started: false, reason: 'Site ID nicht konfiguriert' };

    const ms = this.frequencyHours * 60 * 60 * 1000;
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.createAndPost();
        console.log('WordPress: scheduled post published');
      } catch (err) {
        console.error('WordPress scheduler error:', err.message);
      }
    }, ms);

    console.log(`WordPress: scheduler started — every ${this.frequencyHours}h`);
    return { started: true, intervalHours: this.frequencyHours };
  }

  stopScheduler() {
    if (!this.schedulerInterval) return { stopped: false, reason: 'Scheduler läuft nicht' };
    clearInterval(this.schedulerInterval);
    this.schedulerInterval = null;
    return { stopped: true };
  }

  async getRecentPosts(limit = 20) {
    try {
      const result = await pool.query(
        `SELECT id, title, category, wp_url, included_cta, status, posted_at
         FROM wordpress_posts ORDER BY posted_at DESC LIMIT $1`, [limit]
      );
      return result.rows;
    } catch { return []; }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({ index: i, title: t.title, category: t.category }));
  }

  getStatus() {
    return {
      configured: !!(this.clientId && this.clientSecret && this.accessToken && this.siteId),
      connected: !!this.accessToken,
      schedulerRunning: !!this.schedulerInterval,
      autoPosting: this.autoPosting,
      frequencyHours: this.frequencyHours,
      postCounter: this.postCounter,
      siteId: this.siteId
    };
  }
}

module.exports = new WordPressService();
