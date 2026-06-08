/**
 * Hack Scraper Service
 * Searches the internet for new travel hacks from multiple sources
 */

const axios = require('axios');

/**
 * Search for new travel hacks from multiple sources
 * Returns array of raw hack content to be parsed by AI
 */
async function searchForNewHacks() {
  try {
    console.log('🔍 Starting hack search from multiple sources...');

    const hackSources = [];

    // Search 1: Reddit travel communities
    console.log('📱 Searching Reddit travel communities...');
    const redditHacks = await searchReddit();
    hackSources.push(...redditHacks);

    // Search 2: Travel blogs and news
    console.log('📰 Searching travel blogs and news...');
    const blogHacks = await searchTravelBlogs();
    hackSources.push(...blogHacks);

    // Search 3: Travel Twitter discussions
    console.log('🐦 Searching travel Twitter discussions...');
    const twitterHacks = await searchTwitter();
    hackSources.push(...twitterHacks);

    console.log(`✅ Found ${hackSources.length} potential hacks to analyze`);
    return hackSources;
  } catch (error) {
    console.error('❌ Error searching for hacks:', error);
    return [];
  }
}

/**
 * Search Reddit for travel hacks
 */
async function searchReddit() {
  try {
    const subreddits = ['travel', 'digitalnomad', 'flights', 'hotels'];
    const hacks = [];

    // Using Reddit JSON API (no auth required for public data)
    for (const sub of subreddits) {
      try {
        const response = await axios.get(
          `https://www.reddit.com/r/${sub}/top.json?t=week&limit=10`,
          {
            headers: {
              'User-Agent': 'TravelSmarter-HackCollector/1.0'
            },
            timeout: 5000
          }
        );

        if (response.data?.data?.children) {
          response.data.data.children.forEach(post => {
            const title = post.data.title;
            const text = post.data.selftext;
            const upvotes = post.data.ups;

            // Only include highly upvoted posts with substance
            if (upvotes > 100 && text && text.length > 50) {
              hacks.push({
                source: `reddit_r${sub}`,
                title,
                content: text,
                upvotes,
                url: `https://reddit.com${post.data.permalink}`
              });
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from r/${sub}:`, error.message);
      }
    }

    return hacks;
  } catch (error) {
    console.error('❌ Error searching Reddit:', error);
    return [];
  }
}

/**
 * Search travel blogs and news websites
 */
async function searchTravelBlogs() {
  try {
    const sources = [
      {
        name: 'The Points Guy',
        url: 'https://thepointsguy.com/latest/',
        selector: 'article'
      },
      {
        name: 'Skyscanner',
        url: 'https://www.skyscanner.com/news/'
      },
      {
        name: 'Travel Pulse',
        url: 'https://www.travelpulse.com/'
      }
    ];

    const hacks = [];

    // Note: These are placeholder URLs - in production, you'd need proper scraping
    // For now, return sample structure that will be used when APIs are available
    console.log('📚 Blog scraping requires dedicated API keys - using placeholder for now');

    return hacks;
  } catch (error) {
    console.error('❌ Error searching blogs:', error);
    return [];
  }
}

/**
 * Search Twitter for travel hack discussions
 */
async function searchTwitter() {
  try {
    // Twitter API requires authentication
    // For now, return placeholder
    console.log('🐦 Twitter search requires API authentication - using placeholder for now');

    return [];
  } catch (error) {
    console.error('❌ Error searching Twitter:', error);
    return [];
  }
}

/**
 * Fetch trending travel topics from Google Trends
 */
async function searchTrendingTopics() {
  try {
    const keywords = [
      'flight hack 2026',
      'travel deal today',
      'hotel booking trick',
      'credit card travel reward',
      'visa free travel',
      'travel insurance hack'
    ];

    const results = [];

    // This would integrate with Google Trends API in production
    // For now, return placeholder
    console.log('📊 Trending topics search placeholder');

    return results;
  } catch (error) {
    console.error('❌ Error searching trending topics:', error);
    return [];
  }
}

module.exports = {
  searchForNewHacks,
  searchReddit,
  searchTravelBlogs,
  searchTwitter,
  searchTrendingTopics
};
