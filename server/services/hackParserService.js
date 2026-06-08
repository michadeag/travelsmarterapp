/**
 * Hack Parser Service
 * Uses Claude AI to parse and extract travel hack data from raw content
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

/**
 * Parse raw hack content using Claude AI
 * Extracts: title, description, category, difficulty, module
 */
async function parseHackContent(rawContent) {
  try {
    const prompt = `
You are a travel hacking expert. Analyze the following travel hack content and extract structured information.

CONTENT TO ANALYZE:
${rawContent.title ? `Title: ${rawContent.title}\n` : ''}
${rawContent.content ? `Content: ${rawContent.content}\n` : ''}

Extract and return ONLY a JSON object (no markdown, no explanation) with:
{
  "title": "Clear, actionable hack title (under 80 chars)",
  "description": "Detailed explanation of the hack (100-300 words)",
  "category": "One of: Pricing, Strategy, Timing, Booking, Rewards, Insurance, Visa, Accommodation, Transportation",
  "difficulty": "One of: easy, medium, hard",
  "moduleId": "1-16 (1=Flight, 2=Credit Cards, 3=Hotel, 4=Timing, 5=Airport, 6=Destinations, 7=CarRental, 8=Community, 9=Money, 10=Insurance, 11=Visa, 12=Accommodation, 13=Transport, 14=Bookings, 15=Food, 16=Shopping)",
  "validity": "One of: current (still valid), seasonal (only certain times), deprecated (no longer works)",
  "estimatedSavings": "Rough annual savings in euros (e.g., 500, 1000, etc)",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

IMPORTANT:
- Only return valid JSON
- If content is not about travel hacking, return {"skip": true}
- Be strict about validity - only include hacks that actually work
- Match moduleId to the primary focus of the hack
`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from response
    const responseText = message.content[0].text.trim();

    // Try to parse JSON
    try {
      const parsed = JSON.parse(responseText);

      if (parsed.skip) {
        console.log('⏭️ Skipping non-travel-hack content');
        return null;
      }

      // Validate required fields
      if (!parsed.title || !parsed.description || !parsed.category || !parsed.difficulty) {
        console.warn('⚠️ Incomplete hack data:', parsed);
        return null;
      }

      console.log(`✅ Parsed hack: ${parsed.title}`);
      return {
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        difficulty: parsed.difficulty,
        module_id: parseInt(parsed.moduleId),
        validity: parsed.validity || 'current',
        estimated_savings: parsed.estimatedSavings || 0,
        keywords: parsed.keywords || [],
        source: rawContent.source || 'web_scrape'
      };
    } catch (parseError) {
      console.error('❌ Failed to parse JSON from Claude response:', parseError);
      console.log('Response was:', responseText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error parsing hack with Claude:', error);
    return null;
  }
}

/**
 * Parse multiple hacks in batch
 */
async function parseMultipleHacks(rawHacks) {
  console.log(`🤖 Parsing ${rawHacks.length} hacks with Claude AI...`);

  const parsedHacks = [];

  for (const hack of rawHacks) {
    try {
      const parsed = await parseHackContent(hack);
      if (parsed) {
        parsedHacks.push(parsed);
      }

      // Rate limiting - 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error parsing individual hack:', error);
      continue;
    }
  }

  console.log(`✅ Successfully parsed ${parsedHacks.length} hacks`);
  return parsedHacks;
}

/**
 * Calculate similarity between two hacks (0-100)
 * Used for deduplication
 */
function calculateSimilarity(hack1, hack2) {
  let score = 0;

  // Title similarity (40 points)
  if (hack1.title.toLowerCase().includes(hack2.title.toLowerCase()) ||
      hack2.title.toLowerCase().includes(hack1.title.toLowerCase())) {
    score += 40;
  }

  // Category match (30 points)
  if (hack1.category === hack2.category) {
    score += 30;
  }

  // Module match (20 points)
  if (hack1.module_id === hack2.module_id) {
    score += 20;
  }

  // Difficulty match (10 points)
  if (hack1.difficulty === hack2.difficulty) {
    score += 10;
  }

  return score;
}

/**
 * Deduplicate hacks by comparing with existing ones
 */
function deduplicateHacks(newHacks, existingHacks) {
  console.log(`🔍 Deduplicating ${newHacks.length} new hacks against ${existingHacks.length} existing hacks...`);

  const results = {
    new: [],
    updated: [],
    duplicates: []
  };

  for (const newHack of newHacks) {
    let bestMatch = null;
    let bestScore = 0;

    // Find best matching existing hack
    for (const existingHack of existingHacks) {
      const similarity = calculateSimilarity(newHack, existingHack);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = existingHack;
      }
    }

    // Threshold for considering it a duplicate/update
    if (bestScore >= 70) {
      // Check if content is significantly different
      const contentDifference =
        newHack.description.length !== bestMatch.description.length &&
        Math.abs(newHack.description.length - bestMatch.description.length) > 100;

      if (contentDifference) {
        results.updated.push({
          new: newHack,
          existing: bestMatch,
          similarity: bestScore
        });
      } else {
        results.duplicates.push({
          hack: newHack,
          duplicate_of: bestMatch.id,
          similarity: bestScore
        });
      }
    } else {
      results.new.push(newHack);
    }
  }

  console.log(`📊 Deduplication results: ${results.new.length} new, ${results.updated.length} updates, ${results.duplicates.length} duplicates`);
  return results;
}

module.exports = {
  parseHackContent,
  parseMultipleHacks,
  calculateSimilarity,
  deduplicateHacks
};
