const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const QUESTIONS = [
  {
    question: 'What is the best way to travel Europe on a tight budget?',
    category: 'budget',
    tags: ['budget travel', 'Europe', 'backpacking']
  },
  {
    question: 'How do I use credit card points to fly business class for free or cheap?',
    category: 'points_miles',
    tags: ['points and miles', 'business class', 'travel hacks']
  },
  {
    question: 'What are the best countries to visit as a digital nomad in 2025?',
    category: 'nomad',
    tags: ['digital nomad', 'remote work', 'travel destinations']
  },
  {
    question: 'How do you find cheap flights that most people don\'t know about?',
    category: 'flights',
    tags: ['cheap flights', 'travel hacks', 'flight deals']
  },
  {
    question: 'Is travel insurance worth it? When should you buy it and what does it actually cover?',
    category: 'insurance',
    tags: ['travel insurance', 'travel tips', 'travel planning']
  },
  {
    question: 'What are the most underrated travel destinations that aren\'t overrun by tourists?',
    category: 'destinations',
    tags: ['hidden gems', 'travel destinations', 'off the beaten path']
  },
  {
    question: 'How do you pack a carry-on bag for a two-week trip?',
    category: 'packing',
    tags: ['packing tips', 'carry-on', 'minimalist travel']
  },
  {
    question: 'What travel hacks do frequent travelers use that most people don\'t know?',
    category: 'hacks',
    tags: ['travel hacks', 'travel tips', 'frequent traveler']
  },
  {
    question: 'How do hotel loyalty programs work and are they worth joining?',
    category: 'hotels',
    tags: ['hotel loyalty', 'travel rewards', 'hotel hacks']
  },
  {
    question: 'What should every solo traveler know before their first trip abroad?',
    category: 'solo_travel',
    tags: ['solo travel', 'travel tips', 'first time traveler']
  },
  {
    question: 'How can I get airport lounge access without paying for an expensive membership?',
    category: 'airports',
    tags: ['airport lounge', 'travel perks', 'credit cards']
  },
  {
    question: 'What are the best travel credit cards and how do you maximize their benefits?',
    category: 'credit_cards',
    tags: ['travel credit cards', 'points and miles', 'travel rewards']
  },
  {
    question: 'What is the cheapest time of year to travel internationally?',
    category: 'timing',
    tags: ['cheap travel', 'travel planning', 'budget travel']
  },
  {
    question: 'How do you avoid tourist traps and find authentic local experiences?',
    category: 'local',
    tags: ['local travel', 'authentic experiences', 'travel tips']
  },
  {
    question: 'What do you wish you knew before your first long-term backpacking trip?',
    category: 'backpacking',
    tags: ['backpacking', 'long-term travel', 'travel lessons']
  }
];

class QuoraService {
  constructor() {
    this.answerCounter = 0;
  }

  async loadSettings() {
    try {
      const result = await pool.query(
        `SELECT value FROM settings WHERE key = 'quora_answer_counter'`
      );
      if (result.rows.length > 0) {
        this.answerCounter = parseInt(result.rows[0].value || '0');
      }
    } catch {
      // non-blocking
    }
  }

  async generateAnswer(questionIndex, includeCTA) {
    const entry = QUESTIONS[questionIndex % QUESTIONS.length];

    const ctaSection = includeCTA
      ? `\n\n---\n\n*One tool I've found genuinely useful for this: [TravelSmarter](https://travelsmarterapp.com/welcome.html) — it's completely free and tracks flight deals and travel hacks automatically. Worth bookmarking.*`
      : '';

    const prompt = `You are an experienced traveler writing a high-quality Quora answer.

Question: "${entry.question}"

Write a Quora answer that:
- Opens with a direct, confident statement that immediately addresses the question (no "Great question!" filler)
- Uses first-person voice — share real experience, specific examples, actual numbers
- Is structured clearly: main answer first, then supporting details and tips
- Uses short paragraphs (2–4 sentences each) for readability on mobile
- Includes a concrete, actionable takeaway or recommendation
- Is 300–500 words — detailed enough to be the top answer, tight enough to hold attention
- Sounds like a real person, not an AI or a content farm

Format: plain text with paragraph breaks. No markdown headers. No bullet point lists unless they genuinely help.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = response.content[0].text.trim() + ctaSection;

    return {
      question: entry.question,
      answer: body,
      category: entry.category,
      tags: entry.tags,
      includedCTA: includeCTA,
      questionIndex: questionIndex % QUESTIONS.length
    };
  }

  async generateAndLog(questionIndex = null) {
    const index = questionIndex !== null
      ? questionIndex
      : this.answerCounter % QUESTIONS.length;

    this.answerCounter++;
    const includeCTA = this.answerCounter % 2 === 0;

    const result = await this.generateAnswer(index, includeCTA);

    await this._logAnswer(result);
    return result;
  }

  async generateBatch(count = 5) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const index = (this.answerCounter) % QUESTIONS.length;
      this.answerCounter++;
      const includeCTA = this.answerCounter % 2 === 0;
      const result = await this.generateAnswer(index, includeCTA);
      await this._logAnswer(result);
      results.push(result);
    }
    return results;
  }

  async _logAnswer({ question, answer, category, includedCTA }) {
    try {
      await pool.query(
        `INSERT INTO quora_answers (question, answer, category, included_cta, posted_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [question, answer, category, includedCTA]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('quora_answer_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.answerCounter)]
      );
    } catch (err) {
      console.error('Quora: failed to log answer:', err.message);
    }
  }

  async getRecentAnswers(limit = 20) {
    try {
      const result = await pool.query(
        `SELECT id, question, answer, category, included_cta, posted_at
         FROM quora_answers ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  getQuestions() {
    return QUESTIONS.map((q, i) => ({
      index: i,
      question: q.question,
      category: q.category,
      tags: q.tags
    }));
  }

  getStatus() {
    return {
      totalQuestions: QUESTIONS.length,
      answerCounter: this.answerCounter,
      nextQuestion: QUESTIONS[this.answerCounter % QUESTIONS.length]?.question || null
    };
  }
}

module.exports = new QuoraService();
