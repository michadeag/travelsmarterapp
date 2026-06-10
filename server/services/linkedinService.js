const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
  {
    topic: 'how business travelers can use credit card points and airline miles to reduce company travel costs',
    category: 'points'
  },
  {
    topic: 'productivity tips for professionals who travel frequently — staying focused, beating jet lag, and keeping work on track',
    category: 'productivity'
  },
  {
    topic: 'how remote work has changed business travel and what hybrid travelers need to know in 2025',
    category: 'remote_work'
  },
  {
    topic: 'smart strategies for booking business travel to maximize comfort while minimizing cost',
    category: 'budget'
  },
  {
    topic: 'travel hacking for entrepreneurs and freelancers — flying business class for less',
    category: 'hacks'
  },
  {
    topic: 'how to choose the right airport lounge access strategy for frequent business travelers',
    category: 'lounges'
  },
  {
    topic: 'lessons learned from traveling to 20+ countries for work — what nobody tells you',
    category: 'insights'
  },
  {
    topic: 'building a travel-friendly lifestyle: balancing professional obligations with exploring the world',
    category: 'lifestyle'
  }
];

class LinkedInService {
  constructor() {
    this.scheduler = null;
    this.isConfigured = false;
    this.credentials = {};
    this.postCounter = 0;
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'linkedin_%'`
      );
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      this.credentials = {
        accessToken: settings.linkedin_access_token || '',
        orgId: settings.linkedin_org_id || '',
        frequency: settings.linkedin_posting_frequency || 'daily',
        maxPosts: parseInt(settings.linkedin_max_posts_per_day || '1'),
        postingTime: settings.linkedin_posting_time || '09:00',
        autoPosting: settings.linkedin_auto_posting === 'true'
      };

      this.isConfigured = !!(this.credentials.accessToken && this.credentials.orgId);

      const counterResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'linkedin_post_counter'`
      );
      if (counterResult.rows.length > 0) {
        this.postCounter = parseInt(counterResult.rows[0].value || '0');
      }

      return this.isConfigured;
    } catch (err) {
      console.error('LinkedIn: failed to load settings:', err.message);
      return false;
    }
  }

  async generatePost(topicEntry, includeCTA) {
    const ctaText = includeCTA
      ? `\n\n---\nI personally track flight deals and travel hacks with [TravelSmarter](https://travelsmarterapp.com/welcome.html) — it's completely free and surprisingly useful for finding cheap flights before they disappear.`
      : '';

    const prompt = `You are a travel industry professional writing a LinkedIn post about: ${topicEntry.topic}

Write a LinkedIn post that:
- Opens with a strong hook (a surprising stat, bold statement, or short story)
- Shares genuine, actionable insight from professional experience
- Uses a confident, direct tone appropriate for LinkedIn — not corporate fluff
- Includes 2–4 short paragraphs with line breaks for readability
- Ends with a thought-provoking question or clear takeaway
- Is 150–300 words — punchy enough for LinkedIn
- Do NOT add hashtags (we'll let LinkedIn handle that)

Format your response as JSON:
{
  "text": "the full post text"
}

Only output valid JSON, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.content[0].text.trim();
    const parsed = JSON.parse(raw);

    return {
      text: parsed.text + ctaText,
      category: topicEntry.category
    };
  }

  async postToLinkedIn(text) {
    const { accessToken, orgId } = this.credentials;
    const authorUrn = `urn:li:organization:${orgId}`;

    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    return response.data?.id || null;
  }

  async createAndPost() {
    if (!this.isConfigured) {
      throw new Error('LinkedIn not configured — add credentials in Settings.');
    }

    const topicEntry = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;

    const post = await this.generatePost(topicEntry, includeCTA);
    const postId = await this.postToLinkedIn(post.text);

    await this._logPost({
      body: post.text,
      category: post.category,
      includedCTA: includeCTA,
      linkedinPostId: postId,
      status: 'posted'
    });

    return {
      category: post.category,
      includedCTA: includeCTA,
      postId,
      preview: post.text.substring(0, 120) + '…'
    };
  }

  async _logPost({ body, category, includedCTA, linkedinPostId, status }) {
    try {
      await pool.query(
        `INSERT INTO linkedin_posts (body, category, included_cta, linkedin_post_id, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [body, category, includedCTA, linkedinPostId, status]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('linkedin_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('LinkedIn: failed to log post:', err.message);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT body, category, included_cta, linkedin_post_id, status, posted_at
         FROM linkedin_posts ORDER BY posted_at DESC LIMIT $1`,
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

    console.log(`💼 LinkedIn scheduler started — interval: ${Math.round(intervalMs / 60000)} min`);

    this.scheduler = setInterval(async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ LinkedIn: posted [${result.category}] — CTA: ${result.includedCTA}`);
      } catch (err) {
        console.error('LinkedIn scheduler error:', err.message);
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
      orgId: this.credentials.orgId || null,
      frequency: this.credentials.frequency,
      maxPosts: this.credentials.maxPosts,
      postingTime: this.credentials.postingTime,
      postCounter: this.postCounter,
      autoPosting: this.credentials.autoPosting
    };
  }
}

module.exports = new LinkedInService();
