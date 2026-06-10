const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Article topics and matching subreddits
const TOPIC_MAP = [
  {
    topic: 'budget travel tips and money-saving strategies for flights and accommodation',
    subreddits: ['travel', 'solotravel', 'budgettravel'],
    category: 'budget'
  },
  {
    topic: 'travel hacking with credit card points and airline miles to fly for free or cheap',
    subreddits: ['churning', 'awardtravel', 'travel'],
    category: 'points'
  },
  {
    topic: 'destination guide with hidden gems, local tips, and what to avoid as a tourist',
    subreddits: ['travel', 'solotravel', 'backpacking'],
    category: 'destination'
  },
  {
    topic: 'smart packing strategies and carry-on optimization for long trips',
    subreddits: ['onebag', 'travel', 'solotravel'],
    category: 'packing'
  },
  {
    topic: 'finding cheap flights using flexible dates, error fares, and booking strategies',
    subreddits: ['flights', 'travel', 'shoestring'],
    category: 'flights'
  },
  {
    topic: 'digital nomad tips for working remotely while traveling across different countries',
    subreddits: ['digitalnomad', 'solotravel', 'travel'],
    category: 'nomad'
  },
  {
    topic: 'visa tips, entry requirements, and navigating bureaucracy for popular destinations',
    subreddits: ['travel', 'solotravel', 'backpacking'],
    category: 'visa'
  },
  {
    topic: 'travel insurance: what actually matters, what to skip, and real claim experiences',
    subreddits: ['travel', 'solotravel', 'financialindependence'],
    category: 'insurance'
  }
];

class RedditService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.scheduler = null;
    this.isConfigured = false;
    this.credentials = {};
    this.postCounter = 0; // tracks total posts this session for CTA alternation
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'reddit_%'`
      );
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      this.credentials = {
        clientId: settings.reddit_client_id || '',
        clientSecret: settings.reddit_client_secret || '',
        username: settings.reddit_username || '',
        password: settings.reddit_password || '',
        frequency: settings.reddit_posting_frequency || 'daily',
        maxPosts: parseInt(settings.reddit_max_posts_per_day || '1'),
        subreddits: settings.reddit_subreddits || 'travel,solotravel,budgettravel',
        autoPosting: settings.reddit_auto_posting === 'true'
      };

      this.isConfigured = !!(
        this.credentials.clientId &&
        this.credentials.clientSecret &&
        this.credentials.username &&
        this.credentials.password
      );

      // Load persistent post counter from DB
      const counterResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'reddit_post_counter'`
      );
      if (counterResult.rows.length > 0) {
        this.postCounter = parseInt(counterResult.rows[0].value || '0');
      }

      return this.isConfigured;
    } catch (err) {
      console.error('Reddit: failed to load settings:', err.message);
      return false;
    }
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const { clientId, clientSecret, username, password } = this.credentials;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `TravelSmarter/1.0 by ${username}`
        }
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  async generateArticle(topicEntry, includeCTA) {
    const ctaText = includeCTA
      ? `\n\n---\n*P.S. I track flight deals and travel hacks with [TravelSmarter](https://travelsmarterapp.com/welcome.html) — completely free and surprisingly useful for finding cheap flights before they disappear.*`
      : '';

    const prompt = `You are an experienced traveler writing a genuinely helpful, value-packed Reddit post about: ${topicEntry.topic}

Write a Reddit post that:
- Has a compelling, specific title (not clickbait — Reddit users hate that)
- Provides real, actionable advice based on firsthand experience
- Uses a conversational, first-person tone as if sharing personal experience
- Includes specific examples, numbers, or destinations where relevant
- Is structured with short paragraphs and occasional markdown formatting (bold, lists) for readability
- Is 300–600 words — detailed enough to be useful, short enough to be read
- Ends naturally without a forced call-to-action

Format your response as JSON:
{
  "title": "the post title",
  "body": "the full post body in markdown"
}

Only output valid JSON, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.content[0].text.trim();
    const parsed = JSON.parse(raw);

    return {
      title: parsed.title,
      body: parsed.body + ctaText,
      category: topicEntry.category,
      subreddits: topicEntry.subreddits
    };
  }

  async postToReddit(title, body, subreddit) {
    const token = await this.getAccessToken();

    const response = await axios.post(
      'https://oauth.reddit.com/api/submit',
      new URLSearchParams({
        kind: 'self',
        sr: subreddit,
        title,
        text: body,
        nsfw: 'false',
        spoiler: 'false',
        resubmit: 'true'
      }).toString(),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `TravelSmarter/1.0 by ${this.credentials.username}`
        }
      }
    );

    const data = response.data?.json;
    if (data?.errors?.length > 0) {
      throw new Error(`Reddit API error: ${data.errors[0][1]}`);
    }

    return data?.data?.url || null;
  }

  async createAndPost(customSubreddit = null) {
    if (!this.isConfigured) {
      throw new Error('Reddit not configured — add credentials in Settings.');
    }

    // Pick a random topic
    const topicEntry = TOPIC_MAP[Math.floor(Math.random() * TOPIC_MAP.length)];

    // Every 2nd post gets the CTA
    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;

    const article = await this.generateArticle(topicEntry, includeCTA);

    // Determine target subreddit
    const configuredSubreddits = this.credentials.subreddits
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    let targetSubreddit;
    if (customSubreddit) {
      targetSubreddit = customSubreddit;
    } else {
      // Prefer overlap between topic subreddits and configured subreddits
      const overlap = article.subreddits.filter(s => configuredSubreddits.includes(s));
      const pool_ = overlap.length > 0 ? overlap : configuredSubreddits;
      targetSubreddit = pool_[Math.floor(Math.random() * pool_.length)];
    }

    const url = await this.postToReddit(article.title, article.body, targetSubreddit);

    // Persist counter and log post
    await this._logPost({
      title: article.title,
      body: article.body,
      subreddit: targetSubreddit,
      category: article.category,
      includedCTA: includeCTA,
      redditUrl: url,
      status: 'posted'
    });

    return {
      title: article.title,
      subreddit: targetSubreddit,
      url,
      category: article.category,
      includedCTA
    };
  }

  async _logPost({ title, body, subreddit, category, includedCTA, redditUrl, status }) {
    try {
      await pool.query(
        `INSERT INTO reddit_posts (title, body, subreddit, category, included_cta, reddit_url, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [title, body, subreddit, category, includedCTA, redditUrl, status]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('reddit_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('Reddit: failed to log post:', err.message);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT title, subreddit, category, included_cta, reddit_url, status, posted_at
         FROM reddit_posts ORDER BY posted_at DESC LIMIT $1`,
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

    // Build interval based on frequency
    let intervalMs;
    if (frequency === 'weekly') {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
    } else if (frequency === 'multiple_daily') {
      // Spread maxPosts across waking hours (8:00–22:00 = 14h)
      intervalMs = Math.floor((14 * 60 * 60 * 1000) / Math.max(maxPosts, 1));
    } else {
      // daily
      intervalMs = 24 * 60 * 60 * 1000;
    }

    console.log(`🤖 Reddit scheduler started — interval: ${Math.round(intervalMs / 60000)} min`);

    this.scheduler = setInterval(async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ Reddit: posted "${result.title}" to r/${result.subreddit}`);
      } catch (err) {
        console.error('Reddit scheduler error:', err.message);
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
    return {
      configured: this.isConfigured,
      schedulerRunning: !!this.scheduler,
      username: this.credentials.username || null,
      frequency: this.credentials.frequency,
      maxPosts: this.credentials.maxPosts,
      subreddits: this.credentials.subreddits,
      postCounter: this.postCounter,
      autoPosting: this.credentials.autoPosting
    };
  }
}

module.exports = new RedditService();
