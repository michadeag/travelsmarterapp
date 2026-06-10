const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
  { title: 'The Ultimate Guide to Finding Cheap Flights: 12 Strategies That Actually Work', category: 'flights' },
  { title: 'How to Travel Europe on $50 a Day (Without Sacrificing Experience)', category: 'budget' },
  { title: 'Credit Card Points for Beginners: How to Fly Business Class for Free', category: 'points_miles' },
  { title: 'The Best Travel Apps Every Traveler Needs in 2025', category: 'tools' },
  { title: 'How to Pack a Carry-On for 2 Weeks: The Minimalist Packing List', category: 'packing' },
  { title: 'Digital Nomad Destinations: 10 Countries With Fast WiFi and Low Cost of Living', category: 'nomad' },
  { title: 'Travel Insurance Explained: What It Covers, What It Doesn\'t, and When You Need It', category: 'insurance' },
  { title: 'Airport Hacks Frequent Flyers Swear By (Most People Don\'t Know These)', category: 'airports' },
  { title: 'Hidden Gem Destinations: 8 Places to Visit Before They Get Overrun by Tourists', category: 'destinations' },
  { title: 'How Hotel Loyalty Programs Work — And How to Get Free Nights Faster', category: 'hotels' }
];

class BloggerService {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.refreshToken = null;
    this.blogId = null;
    this.frequencyHours = 48;
    this.autoPosting = false;
    this.postCounter = 0;
    this.schedulerInterval = null;
    this.redirectUri = null;
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key IN (
          'google_client_id','google_client_secret','google_refresh_token',
          'blogger_blog_id','blogger_frequency_hours','blogger_auto_posting',
          'blogger_post_counter','blogger_redirect_uri'
        )`
      );
      result.rows.forEach(({ key, value }) => {
        if (key === 'google_client_id') this.clientId = value;
        if (key === 'google_client_secret') this.clientSecret = value;
        if (key === 'google_refresh_token') this.refreshToken = value;
        if (key === 'blogger_blog_id') this.blogId = value;
        if (key === 'blogger_frequency_hours') this.frequencyHours = parseInt(value) || 48;
        if (key === 'blogger_auto_posting') this.autoPosting = value === 'true';
        if (key === 'blogger_post_counter') this.postCounter = parseInt(value) || 0;
        if (key === 'blogger_redirect_uri') this.redirectUri = value;
      });
    } catch (err) {
      console.error('Blogger: loadSettings error:', err.message);
    }
  }

  async getAccessToken() {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('Google OAuth2 credentials not configured. Connect your Google account first.');
    }
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });
    return response.data.access_token;
  }

  getAuthUrl() {
    if (!this.clientId) throw new Error('Google Client ID not configured.');
    const redirectUri = this.redirectUri || 'urn:ietf:wg:oauth:2.0:oob';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/blogger',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth2 credentials not configured.');
    }
    const redirectUri = this.redirectUri || 'urn:ietf:wg:oauth:2.0:oob';
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });
    const { refresh_token, access_token } = response.data;
    if (!refresh_token) throw new Error('No refresh_token returned — ensure access_type=offline and prompt=consent.');

    this.refreshToken = refresh_token;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('google_refresh_token', $1, 'text')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [refresh_token]
    );
    return { refresh_token, access_token };
  }

  async fetchBlogId(accessToken) {
    const response = await axios.get('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const blogs = response.data.items || [];
    if (blogs.length === 0) throw new Error('No Blogger blogs found for this Google account.');
    return blogs.map(b => ({ id: b.id, name: b.name, url: b.url }));
  }

  async generateArticle(topic, includeCTA) {
    const ctaSection = includeCTA
      ? `\n\n<p><em>One tool that makes all of this much easier: <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> — it's completely free and automatically tracks flight deals, travel hacks, and money-saving tips so you never miss out. Worth bookmarking before your next trip.</em></p>`
      : '';

    const prompt = `You are a travel expert writing a high-quality SEO blog post for Blogger.

Title: "${topic.title}"
Category: ${topic.category}

Write a complete blog post that:
- Opens with an engaging 2-3 sentence intro (no "In this article" or "Today we'll cover" phrases)
- Has 5–7 clear H2 sections, each with 150–200 words of useful, specific content
- Includes real examples, numbers, and actionable tips throughout
- Uses natural, conversational tone — not corporate or listicle-style
- Closes with a 2-3 sentence conclusion that encourages action
- Total length: 900–1200 words

Format as clean HTML using only these tags: <h2>, <p>, <ul>, <li>, <strong>, <em>, <a>
Do NOT include <html>, <head>, <body>, or <article> wrapper tags.
Do NOT add inline styles.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = response.content[0].text.trim() + ctaSection;
    return { title: topic.title, body, category: topic.category };
  }

  async publishPost(accessToken, title, body, labels) {
    if (!this.blogId) throw new Error('Blogger Blog ID not configured.');
    const response = await axios.post(
      `https://www.googleapis.com/blogger/v3/blogs/${this.blogId}/posts`,
      { title, content: body, labels },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return { id: response.data.id, url: response.data.url };
  }

  async createAndPost(topicIndex = null) {
    await this.loadSettings();
    const index = topicIndex !== null ? topicIndex : this.postCounter % TOPICS.length;
    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;
    const topic = TOPICS[index % TOPICS.length];

    const { title, body, category } = await this.generateArticle(topic, includeCTA);
    const accessToken = await this.getAccessToken();
    const { id, url } = await this.publishPost(accessToken, title, body, [category, 'travel', 'travel tips']);

    await this._logPost({ title, body, category, bloggerPostId: id, bloggerUrl: url, includedCTA: includeCTA });
    return { title, body, category, bloggerPostId: id, bloggerUrl: url, includedCTA: includeCTA };
  }

  async _logPost({ title, body, category, bloggerPostId, bloggerUrl, includedCTA }) {
    try {
      await pool.query(
        `INSERT INTO blogger_posts (title, body, category, blogger_post_id, blogger_url, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())`,
        [title, body, category, bloggerPostId, bloggerUrl, includedCTA]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('blogger_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('Blogger: failed to log post:', err.message);
    }
  }

  startScheduler() {
    if (this.schedulerInterval) return { started: false, reason: 'Scheduler already running' };
    if (!this.autoPosting) return { started: false, reason: 'Auto-posting is disabled' };
    if (!this.refreshToken) return { started: false, reason: 'Google account not connected' };
    if (!this.blogId) return { started: false, reason: 'Blog ID not configured' };

    const ms = this.frequencyHours * 60 * 60 * 1000;
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.createAndPost();
        console.log(`Blogger: scheduled post published`);
      } catch (err) {
        console.error('Blogger scheduler error:', err.message);
      }
    }, ms);

    console.log(`Blogger: scheduler started — every ${this.frequencyHours}h`);
    return { started: true, intervalHours: this.frequencyHours };
  }

  stopScheduler() {
    if (!this.schedulerInterval) return { stopped: false, reason: 'Scheduler not running' };
    clearInterval(this.schedulerInterval);
    this.schedulerInterval = null;
    return { stopped: true };
  }

  async getRecentPosts(limit = 20) {
    try {
      const result = await pool.query(
        `SELECT id, title, category, blogger_url, included_cta, status, posted_at
         FROM blogger_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch { return []; }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({ index: i, title: t.title, category: t.category }));
  }

  getStatus() {
    return {
      configured: !!(this.clientId && this.clientSecret && this.refreshToken && this.blogId),
      connected: !!this.refreshToken,
      schedulerRunning: !!this.schedulerInterval,
      autoPosting: this.autoPosting,
      frequencyHours: this.frequencyHours,
      postCounter: this.postCounter,
      blogId: this.blogId
    };
  }
}

module.exports = new BloggerService();
