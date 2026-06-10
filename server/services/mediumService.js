const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MEDIUM_API = 'https://api.medium.com/v1';

const TOPICS = [
  {
    title: 'The Complete Guide to Flying Business Class for Less Than Economy',
    angle: 'how to use credit card points, airline miles, and upgrade strategies to fly business class at a fraction of the cost',
    tags: ['travel', 'travel hacks', 'points and miles', 'budget travel', 'airlines'],
    category: 'points_miles'
  },
  {
    title: 'I Traveled 30 Countries on $40 a Day — Here\'s Exactly How',
    angle: 'detailed breakdown of budget travel strategies: accommodation, food, transport, and activity hacks that actually work',
    tags: ['budget travel', 'travel tips', 'backpacking', 'travel hacks', 'solo travel'],
    category: 'budget'
  },
  {
    title: 'The One-Bag Travel Method That Changed How I See the World',
    angle: 'carry-on only travel philosophy: what to pack, what to leave, and why most people drastically overpack',
    tags: ['packing tips', 'carry on', 'minimalist travel', 'travel hacks', 'travel'],
    category: 'packing'
  },
  {
    title: 'How to Find Cheap Flights That Nobody Else Knows About',
    angle: 'advanced flight search strategies: error fares, hidden city ticketing, positioning flights, flexible date tools, and fare alert systems',
    tags: ['cheap flights', 'travel hacks', 'budget travel', 'flight deals', 'travel tips'],
    category: 'flights'
  },
  {
    title: 'The Digital Nomad Reality Check: What Nobody Tells You Before You Go',
    angle: 'honest account of working remotely while traveling — the logistics, the challenges, visa realities, tax considerations, and what actually makes it work',
    tags: ['digital nomad', 'remote work', 'travel', 'work travel', 'location independent'],
    category: 'nomad'
  },
  {
    title: '10 Countries Where Your Money Goes Furthest in 2025',
    angle: 'data-driven guide to the best value destinations right now — cost breakdowns, what you get for your money, and practical entry tips',
    tags: ['budget travel', 'travel destinations', 'travel tips', 'travel', 'world travel'],
    category: 'destinations'
  },
  {
    title: 'The Airport Lounge Guide: How to Get In Without Paying $600/Year',
    angle: 'comprehensive breakdown of lounge access options: credit card benefits, day passes, airline status, Priority Pass alternatives — ranked by value',
    tags: ['airport lounge', 'travel hacks', 'credit cards', 'travel tips', 'airlines'],
    category: 'airports'
  },
  {
    title: 'Travel Insurance: What You Actually Need (And What\'s a Waste of Money)',
    angle: 'practical guide to travel insurance — what policies actually cover, what credit cards already provide, real claim experiences, and how to not get burned',
    tags: ['travel insurance', 'travel tips', 'travel planning', 'budget travel', 'travel'],
    category: 'insurance'
  },
  {
    title: 'How Hotel Loyalty Programs Actually Work — And How to Maximize Them',
    angle: 'inside look at hotel points programs: which chains deliver the most value, status matching tricks, and how to get free nights faster than you think',
    tags: ['hotel hacks', 'travel rewards', 'points and miles', 'travel tips', 'travel'],
    category: 'hotels'
  },
  {
    title: 'The Visa Game: How to Travel More Countries With Less Hassle',
    angle: 'strategic guide to passport power, visa-on-arrival countries, e-visa processes, and how to plan trips around entry requirements efficiently',
    tags: ['travel visa', 'travel planning', 'international travel', 'travel tips', 'travel'],
    category: 'visas'
  }
];

class MediumService {
  constructor() {
    this.scheduler = null;
    this.isConfigured = false;
    this.credentials = {};
    this.userId = null;
    this.postCounter = 0;
    this.topicIndex = 0;
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'medium_%'`
      );
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      this.credentials = {
        integrationToken: settings.medium_integration_token || '',
        publicationId: settings.medium_publication_id || '',
        frequency: settings.medium_posting_frequency || 'daily',
        autoPosting: settings.medium_auto_posting === 'true'
      };

      this.isConfigured = !!this.credentials.integrationToken;

      const counterResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'medium_post_counter'`
      );
      if (counterResult.rows.length > 0) {
        this.postCounter = parseInt(counterResult.rows[0].value || '0');
      }

      const indexResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'medium_topic_index'`
      );
      if (indexResult.rows.length > 0) {
        this.topicIndex = parseInt(indexResult.rows[0].value || '0');
      }

      // Resolve userId if we have a token
      if (this.isConfigured && !this.userId) {
        await this._resolveUserId();
      }

      return this.isConfigured;
    } catch (err) {
      console.error('Medium: failed to load settings:', err.message);
      return false;
    }
  }

  async _resolveUserId() {
    try {
      const res = await axios.get(`${MEDIUM_API}/me`, {
        headers: { Authorization: `Bearer ${this.credentials.integrationToken}` }
      });
      this.userId = res.data?.data?.id || null;
    } catch (err) {
      console.warn('Medium: could not resolve user ID:', err.message);
    }
  }

  async generateArticle(topic, includeCTA) {
    const ctaSection = includeCTA
      ? `\n\n---\n\n*If you want a free tool that tracks flight deals and travel hacks automatically, I've been using [TravelSmarter](https://travelsmarterapp.com/welcome.html). It's completely free and genuinely useful for catching cheap flights before they disappear.*`
      : '';

    const prompt = `You are an experienced travel writer creating a high-quality Medium article.

Topic: ${topic.angle}
Working title: "${topic.title}"

Write a complete, publish-ready Medium article that:
- Opens with a compelling hook (personal anecdote, surprising statistic, or bold claim)
- Has clear H2 subheadings (use ## in markdown) dividing the content into 4–6 logical sections
- Provides genuinely useful, specific, actionable advice — not generic tips
- Uses first-person voice and a conversational but authoritative tone
- Includes concrete examples, specific numbers, and real tools/resources where relevant
- Ends with a clear takeaway or call-to-action (e.g. a question, a challenge, a summary)
- Is 900–1300 words — long enough to rank, short enough to read

Format: Markdown only. Start directly with the article content (no meta-commentary).`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = response.content[0].text.trim() + ctaSection;
    return { title: topic.title, body, tags: topic.tags, category: topic.category };
  }

  async publishToMedium(title, body, tags) {
    if (!this.userId) await this._resolveUserId();
    if (!this.userId) throw new Error('Could not resolve Medium user ID — check your Integration Token');

    const endpoint = this.credentials.publicationId
      ? `${MEDIUM_API}/publications/${this.credentials.publicationId}/posts`
      : `${MEDIUM_API}/users/${this.userId}/posts`;

    const response = await axios.post(
      endpoint,
      {
        title,
        contentFormat: 'markdown',
        content: `# ${title}\n\n${body}`,
        tags: tags.slice(0, 5),
        publishStatus: 'public'
      },
      {
        headers: {
          Authorization: `Bearer ${this.credentials.integrationToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      id: response.data?.data?.id,
      url: response.data?.data?.url
    };
  }

  async createAndPost() {
    if (!this.isConfigured) {
      throw new Error('Medium not configured — add Integration Token in Settings.');
    }

    const topic = TOPICS[this.topicIndex % TOPICS.length];
    this.topicIndex++;

    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;

    const article = await this.generateArticle(topic, includeCTA);
    const { id, url } = await this.publishToMedium(article.title, article.body, article.tags);

    await this._logPost({
      title: article.title,
      body: article.body,
      category: article.category,
      tags: article.tags.join(','),
      mediumId: id,
      mediumUrl: url,
      includedCTA: includeCTA,
      status: 'published'
    });

    return {
      title: article.title,
      category: article.category,
      url,
      includedCTA,
      wordCount: article.body.split(/\s+/).length
    };
  }

  async _logPost({ title, body, category, tags, mediumId, mediumUrl, includedCTA, status }) {
    try {
      await pool.query(
        `INSERT INTO medium_posts (title, body, category, tags, medium_id, medium_url, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [title, body, category, tags, mediumId, mediumUrl, includedCTA, status]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('medium_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('medium_topic_index', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.topicIndex)]
      );
    } catch (err) {
      console.error('Medium: failed to log post:', err.message);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT title, category, tags, medium_url, included_cta, status, posted_at,
                length(body) as body_length
         FROM medium_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  startScheduler() {
    if (this.scheduler) return { started: false, reason: 'Scheduler already running' };

    const { frequency } = this.credentials;

    // Medium is best at 1–2 articles per day max — quality over quantity
    const intervalMs = frequency === 'weekly'
      ? 7 * 24 * 60 * 60 * 1000
      : frequency === 'twice_daily'
        ? 12 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

    console.log(`📝 Medium scheduler started — interval: ${Math.round(intervalMs / 3600000)}h`);

    this.scheduler = setInterval(async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ Medium: published "${result.title}" (${result.wordCount} words)`);
      } catch (err) {
        console.error('Medium scheduler error:', err.message);
      }
    }, intervalMs);

    return { started: true, intervalHours: Math.round(intervalMs / 3600000), frequency };
  }

  stopScheduler() {
    if (!this.scheduler) return { stopped: false, reason: 'No scheduler running' };
    clearInterval(this.scheduler);
    this.scheduler = null;
    return { stopped: true };
  }

  getStatus() {
    const nextTopic = TOPICS[this.topicIndex % TOPICS.length];
    return {
      configured: this.isConfigured,
      schedulerRunning: !!this.scheduler,
      userId: this.userId,
      publicationId: this.credentials.publicationId || null,
      frequency: this.credentials.frequency,
      postCounter: this.postCounter,
      nextTopic: nextTopic?.title || null,
      autoPosting: this.credentials.autoPosting
    };
  }

  getTopics() {
    return TOPICS.map((t, i) => ({
      index: i,
      title: t.title,
      category: t.category,
      tags: t.tags,
      isNext: i === this.topicIndex % TOPICS.length
    }));
  }
}

module.exports = new MediumService();
