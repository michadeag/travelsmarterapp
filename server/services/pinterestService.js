const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Infographic topics — each has a title template, bullet structure, and visual style hint
const INFOGRAPHIC_TOPICS = [
  {
    category: 'budget_flights',
    title: '5 Hacks to Fly for Way Less',
    promptTheme: 'flight deals and cheap airfare hacks',
    pins: [
      'Use Google Flights + flexible dates',
      'Book 6–8 weeks ahead for domestic',
      'Set fare alerts on Hopper or Kayak',
      'Fly Tue/Wed for the cheapest seats',
      'Check nearby airports for big savings'
    ]
  },
  {
    category: 'packing',
    title: 'The Perfect Carry-On Packing List',
    promptTheme: 'minimalist carry-on packing for any trip',
    pins: [
      '3-1-1 liquids in a clear zip bag',
      'Roll, don\'t fold — saves 30% space',
      'Pack a portable charger + cables',
      'One outfit per 2 days (mix & match)',
      'Compression cubes = game changer'
    ]
  },
  {
    category: 'points_miles',
    title: 'Earn Miles Without Flying',
    promptTheme: 'credit card points and airline miles strategy',
    pins: [
      'Sign-up bonuses = free business class',
      'Use miles card for everyday spend',
      'Transfer points to airline partners',
      'Shop through airline shopping portals',
      'Dining programs earn bonus miles'
    ]
  },
  {
    category: 'budget_destinations',
    title: 'Best Budget Countries in 2025',
    promptTheme: 'affordable travel destinations worldwide',
    pins: [
      'Vietnam — $30/day all-in',
      'Portugal — cheapest in Western Europe',
      'Colombia — stunning & underrated',
      'Georgia (Caucasus) — hidden gem',
      'Mexico — world-class food, low cost'
    ]
  },
  {
    category: 'airport_hacks',
    title: 'Airport Tricks Every Traveler Needs',
    promptTheme: 'airport productivity and travel hacks',
    pins: [
      'Skip bag check — always carry-on',
      'TSA PreCheck = worth every penny',
      'Free lounge access with right credit card',
      'Screenshot boarding pass offline',
      'Arrive 90 min early, not 3 hours'
    ]
  },
  {
    category: 'travel_safety',
    title: 'Stay Safe Anywhere in the World',
    promptTheme: 'travel safety tips and smart precautions',
    pins: [
      'Use a VPN on public WiFi',
      'Keep copies of all documents in email',
      'Share itinerary with someone at home',
      'Get travel insurance — always',
      'Use ATMs inside banks, not on streets'
    ]
  },
  {
    category: 'hotel_hacks',
    title: 'Get More from Every Hotel Stay',
    promptTheme: 'hotel booking hacks and loyalty tips',
    pins: [
      'Book direct for best rate + perks',
      'Ask for upgrades at check-in (politely)',
      'Loyalty programs unlock free nights fast',
      'Use hotel WiFi over cellular abroad',
      'Late check-out is often free if you ask'
    ]
  },
  {
    category: 'digital_nomad',
    title: 'Work Remotely from Anywhere',
    promptTheme: 'digital nomad lifestyle and remote work travel',
    pins: [
      'Coworking day pass = $10–20 anywhere',
      'Airbnb monthly = way cheaper than nightly',
      'Time zones: always be async-first',
      'Noise-cancelling headphones are essential',
      'Bali, Chiang Mai, Lisbon = nomad hubs'
    ]
  }
];

class PinterestService {
  constructor() {
    this.scheduler = null;
    this.isConfigured = false;
    this.credentials = {};
    this.postCounter = 0;
    this.topicIndex = 0; // rotate through topics in order
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'pinterest_%' OR key = 'ideogram_api_key'`
      );
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      this.credentials = {
        accessToken: settings.pinterest_access_token || '',
        boardId: settings.pinterest_board_id || '',
        ideogramKey: settings.ideogram_api_key || '',
        frequency: settings.pinterest_posting_frequency || 'daily',
        maxPosts: parseInt(settings.pinterest_max_posts_per_day || '1'),
        postingTime: settings.pinterest_posting_time || '20:00',
        autoPosting: settings.pinterest_auto_posting === 'true'
      };

      this.isConfigured = !!(
        this.credentials.accessToken &&
        this.credentials.boardId &&
        this.credentials.ideogramKey
      );

      const counterResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'pinterest_post_counter'`
      );
      if (counterResult.rows.length > 0) {
        this.postCounter = parseInt(counterResult.rows[0].value || '0');
      }

      const indexResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'pinterest_topic_index'`
      );
      if (indexResult.rows.length > 0) {
        this.topicIndex = parseInt(indexResult.rows[0].value || '0');
      }

      return this.isConfigured;
    } catch (err) {
      console.error('Pinterest: failed to load settings:', err.message);
      return false;
    }
  }

  // Build the Ideogram prompt for a travel infographic
  _buildIdeogramPrompt(topic, includeCTA) {
    const bullets = topic.pins.map((p, i) => `${i + 1}. ${p}`).join('  |  ');
    const ctaLine = includeCTA
      ? '  |  travelsmarterapp.com'
      : '';

    return [
      `Travel infographic Pinterest pin, portrait 2:3 format, clean modern design.`,
      `Bold headline at top: "${topic.title}"`,
      `Below: numbered list in readable sans-serif font: ${bullets}${ctaLine}`,
      `Color palette: warm coral and cream with navy accents. Travel theme icons.`,
      `High contrast text, white background sections, professional look.`,
      `Style: flat design infographic, no photographs, text-forward layout.`
    ].join(' ');
  }

  async generateImage(topic, includeCTA) {
    const prompt = this._buildIdeogramPrompt(topic, includeCTA);

    const response = await axios.post(
      'https://api.ideogram.ai/generate',
      {
        image_request: {
          prompt,
          model: 'V_2',
          resolution: 'RESOLUTION_1024_1536',
          style_type: 'DESIGN',
          magic_prompt_option: 'OFF'
        }
      },
      {
        headers: {
          'Api-Key': this.credentials.ideogramKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const imageUrl = response.data?.data?.[0]?.url;
    if (!imageUrl) throw new Error('Ideogram returned no image URL');
    return imageUrl;
  }

  async generateDescription(topic, includeCTA) {
    const prompt = `Write a Pinterest pin description for a travel infographic titled "${topic.title}" about ${topic.promptTheme}.

The description should:
- Be 2–3 sentences, conversational and inspiring
- Include 3–5 relevant hashtags at the end
- NOT be promotional or salesy
${includeCTA ? '- End with: "Find more travel deals at travelsmarterapp.com"' : ''}

Only return the description text, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text.trim();
  }

  async postToPinterest(imageUrl, title, description, link) {
    const body = {
      board_id: this.credentials.boardId,
      title,
      description,
      media_source: {
        source_type: 'image_url',
        url: imageUrl
      }
    };

    if (link) body.link = link;

    const response = await axios.post(
      'https://api.pinterest.com/v5/pins',
      body,
      {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data?.id || null;
  }

  async createAndPost() {
    if (!this.isConfigured) {
      throw new Error('Pinterest not configured — add credentials and Ideogram API key in Settings.');
    }

    // Rotate topics in order
    const topic = INFOGRAPHIC_TOPICS[this.topicIndex % INFOGRAPHIC_TOPICS.length];
    this.topicIndex++;

    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;

    // Generate image and description in parallel
    const [imageUrl, description] = await Promise.all([
      this.generateImage(topic, includeCTA),
      this.generateDescription(topic, includeCTA)
    ]);

    const link = includeCTA ? 'https://travelsmarterapp.com/welcome.html' : undefined;
    const pinId = await this.postToPinterest(imageUrl, topic.title, description, link);

    await this._logPost({
      title: topic.title,
      category: topic.category,
      imageUrl,
      description,
      pinId,
      includedCTA: includeCTA,
      status: 'posted'
    });

    return {
      title: topic.title,
      category: topic.category,
      imageUrl,
      pinId,
      includedCTA,
      description: description.substring(0, 100) + '…'
    };
  }

  async _logPost({ title, category, imageUrl, description, pinId, includedCTA, status }) {
    try {
      await pool.query(
        `INSERT INTO pinterest_posts (title, category, image_url, description, pin_id, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [title, category, imageUrl, description, pinId, includedCTA, status]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('pinterest_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('pinterest_topic_index', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.topicIndex)]
      );
    } catch (err) {
      console.error('Pinterest: failed to log post:', err.message);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT title, category, image_url, description, pin_id, included_cta, status, posted_at
         FROM pinterest_posts ORDER BY posted_at DESC LIMIT $1`,
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

    console.log(`📌 Pinterest scheduler started — interval: ${Math.round(intervalMs / 60000)} min`);

    this.scheduler = setInterval(async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ Pinterest: pinned "${result.title}" [${result.category}]`);
      } catch (err) {
        console.error('Pinterest scheduler error:', err.message);
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
      boardId: this.credentials.boardId || null,
      ideogramConfigured: !!this.credentials.ideogramKey,
      frequency: this.credentials.frequency,
      maxPosts: this.credentials.maxPosts,
      postingTime: this.credentials.postingTime,
      postCounter: this.postCounter,
      topicIndex: this.topicIndex,
      nextTopic: INFOGRAPHIC_TOPICS[this.topicIndex % INFOGRAPHIC_TOPICS.length]?.title || null,
      autoPosting: this.credentials.autoPosting
    };
  }

  getTopics() {
    return INFOGRAPHIC_TOPICS.map((t, i) => ({
      index: i,
      title: t.title,
      category: t.category,
      isNext: i === this.topicIndex % INFOGRAPHIC_TOPICS.length
    }));
  }
}

module.exports = new PinterestService();
