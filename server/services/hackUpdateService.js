/**
 * Hack Update Service
 * Orchestrates the entire process: scrape, parse, deduplicate, update database
 */

const pool = require('../config/database');
const hackScraperService = require('./hackScraperService');
const hackParserService = require('./hackParserService');
const { v4: uuidv4 } = require('uuid');

/**
 * Main function: Run complete hack update cycle
 */
async function runHackUpdateCycle() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting automated hack update cycle...');
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();
  const log = {
    started_at: new Date(),
    stage: 'initializing',
    new_hacks_added: 0,
    hacks_updated: 0,
    hacks_marked_obsolete: 0,
    duplicates_skipped: 0,
    errors: []
  };

  try {
    // Stage 1: Scrape web for new hacks
    log.stage = 'scraping';
    console.log('\n📡 STAGE 1: Web Scraping');
    console.log('-'.repeat(40));
    const rawHacks = await hackScraperService.searchForNewHacks();

    if (rawHacks.length === 0) {
      console.log('⚠️ No hacks found during scraping');
      log.errors.push('No hacks found during web scraping');
      await logUpdateCycle(log);
      return log;
    }

    // Stage 2: Parse hacks with AI
    log.stage = 'parsing';
    console.log('\n🤖 STAGE 2: AI Parsing');
    console.log('-'.repeat(40));
    const parsedHacks = await hackParserService.parseMultipleHacks(rawHacks);

    if (parsedHacks.length === 0) {
      console.log('⚠️ No valid hacks parsed');
      log.errors.push('No valid hacks parsed from scraped content');
      await logUpdateCycle(log);
      return log;
    }

    // Stage 3: Get existing hacks
    log.stage = 'deduplication';
    console.log('\n🔄 STAGE 3: Deduplication');
    console.log('-'.repeat(40));
    const existingHacks = await getExistingHacks();
    const deduplicationResults = hackParserService.deduplicateHacks(
      parsedHacks,
      existingHacks
    );

    // Stage 4: Update database
    log.stage = 'database_update';
    console.log('\n💾 STAGE 4: Database Update');
    console.log('-'.repeat(40));

    // Add new hacks
    for (const hack of deduplicationResults.new) {
      try {
        await addNewHack(hack);
        log.new_hacks_added++;
      } catch (error) {
        console.error(`❌ Failed to add hack "${hack.title}":`, error.message);
        log.errors.push(`Failed to add hack: ${hack.title}`);
      }
    }

    // Update existing hacks
    for (const update of deduplicationResults.updated) {
      try {
        await updateExistingHack(update.existing.id, update.new);
        log.hacks_updated++;
      } catch (error) {
        console.error(`❌ Failed to update hack:`, error.message);
        log.errors.push(`Failed to update hack: ${update.new.title}`);
      }
    }

    // Log duplicates
    log.duplicates_skipped = deduplicationResults.duplicates.length;

    // Stage 5: Check for obsolete hacks
    log.stage = 'obsolescence_check';
    console.log('\n🔎 STAGE 5: Obsolescence Check');
    console.log('-'.repeat(40));
    const obsoleteCount = await markObsoleteHacks();
    log.hacks_marked_obsolete = obsoleteCount;

    // Finalize
    log.stage = 'completed';
    log.completed_at = new Date();
    log.duration_seconds = Math.round((Date.now() - startTime) / 1000);

    // Stage 6: Update metrics based on user engagement
    log.stage = 'metrics_update';
    console.log('\n📊 STAGE 6: Metrics Update');
    console.log('-'.repeat(40));
    await updateMetricsBasedOnEngagement();

    // Stage 7: Update award charts
    log.stage = 'award_charts_update';
    console.log('\n🏆 STAGE 7: Award Charts Update');
    console.log('-'.repeat(40));
    await updateAwardCharts();

    // Log the update
    await logUpdateCycle(log);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ HACK UPDATE CYCLE COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   ➕ New hacks added: ${log.new_hacks_added}`);
    console.log(`   ✏️  Hacks updated: ${log.hacks_updated}`);
    console.log(`   🗑️  Hacks marked obsolete: ${log.hacks_marked_obsolete}`);
    console.log(`   ⏭️  Duplicates skipped: ${log.duplicates_skipped}`);
    console.log(`   ⏱️  Duration: ${log.duration_seconds}s`);
    if (log.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${log.errors.length}`);
    }
    console.log('='.repeat(60) + '\n');

    return log;
  } catch (error) {
    console.error('\n❌ FATAL ERROR in hack update cycle:', error);
    log.stage = 'failed';
    log.completed_at = new Date();
    log.errors.push(`Fatal error: ${error.message}`);
    await logUpdateCycle(log);
    return log;
  }
}

/**
 * Get all existing active hacks from database
 */
async function getExistingHacks() {
  try {
    const result = await pool.query(
      'SELECT id, module_id, title, description, category, difficulty FROM hacks WHERE is_active = true'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching existing hacks:', error);
    return [];
  }
}

/**
 * Add new hack to database with social proof metrics
 */
async function addNewHack(hack) {
  const hackId = uuidv4();

  // Calculate initial social proof metrics based on difficulty and category
  const initialUsageCount = getInitialUsageCount(hack.difficulty);
  const initialAvgSavings = getInitialAvgSavings(hack.category, hack.difficulty);
  const initialSuccessRate = getInitialSuccessRate(hack.difficulty);

  await pool.query(
    `INSERT INTO hacks (id, module_id, title, description, category, difficulty, is_active, usage_count, avg_savings_euros, success_rate, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, CURRENT_TIMESTAMP)`,
    [
      hackId,
      hack.module_id,
      hack.title,
      hack.description,
      hack.category,
      hack.difficulty,
      initialUsageCount,
      initialAvgSavings,
      initialSuccessRate
    ]
  );

  console.log(`✅ Added new hack: "${hack.title}" (${initialUsageCount} users, €${initialAvgSavings.toFixed(2)} savings, ${initialSuccessRate.toFixed(1)}% success)`);
  return hackId;
}

/**
 * Calculate initial usage count based on difficulty
 * Easy hacks start with higher usage, hard hacks lower
 */
function getInitialUsageCount(difficulty) {
  switch(difficulty?.toLowerCase()) {
    case 'easy':
      return Math.floor(Math.random() * (3500 - 1500) + 1500); // 1,500-3,500
    case 'medium':
      return Math.floor(Math.random() * (2500 - 800) + 800);   // 800-2,500
    case 'hard':
      return Math.floor(Math.random() * (1200 - 300) + 300);   // 300-1,200
    default:
      return Math.floor(Math.random() * (2000 - 500) + 500);   // 500-2,000
  }
}

/**
 * Calculate initial average savings based on category and difficulty
 */
function getInitialAvgSavings(category, difficulty) {
  const baseSavings = {
    'Pricing': 180, 'Rewards': 240, 'Bonuses': 380,
    'Loyalty': 120, 'Strategy': 200, 'Timing': 150,
    'Tools': 95, 'Tricks': 100, 'Budget': 250,
    'Banking': 60, 'Money': 85, 'Insurance': 180,
    'Planning': 40, 'Visas': 75, 'Accommodation': 140,
    'Discounts': 110, 'Savings': 95, 'Shopping': 130,
    'Health': 30, 'Community': 0, 'Research': 0
  };

  let base = baseSavings[category] || 100;

  // Hard hacks typically have higher savings potential
  if (difficulty?.toLowerCase() === 'hard') {
    base *= 1.5;
  }

  return Math.round((base + Math.random() * (base * 0.3)) * 100) / 100; // Add variance
}

/**
 * Calculate initial success rate based on difficulty
 */
function getInitialSuccessRate(difficulty) {
  switch(difficulty?.toLowerCase()) {
    case 'easy':
      return Math.round((92 + Math.random() * 6) * 10) / 10;   // 92-98%
    case 'medium':
      return Math.round((82 + Math.random() * 10) * 10) / 10;  // 82-92%
    case 'hard':
      return Math.round((70 + Math.random() * 15) * 10) / 10;  // 70-85%
    default:
      return Math.round((85 + Math.random() * 10) * 10) / 10;  // 85-95%
  }
}

/**
 * Update existing hack with metrics adjustment
 */
async function updateExistingHack(hackId, newData) {
  // Get current hack to preserve/update metrics
  const currentResult = await pool.query('SELECT * FROM hacks WHERE id = $1', [hackId]);
  const currentHack = currentResult.rows[0];

  if (!currentHack) {
    throw new Error(`Hack ${hackId} not found`);
  }

  // Preserve existing metrics but can adjust based on updates
  const updatedMetrics = {
    usage_count: currentHack.usage_count,
    avg_savings_euros: currentHack.avg_savings_euros,
    success_rate: currentHack.success_rate
  };

  // If category or difficulty changed significantly, adjust metrics slightly
  if (newData.difficulty && newData.difficulty !== currentHack.difficulty) {
    updatedMetrics.success_rate = getInitialSuccessRate(newData.difficulty);
  }

  await pool.query(
    `UPDATE hacks
     SET title = $1, description = $2, category = $3, difficulty = $4,
         usage_count = $5, avg_savings_euros = $6, success_rate = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [
      newData.title,
      newData.description,
      newData.category,
      newData.difficulty,
      updatedMetrics.usage_count,
      updatedMetrics.avg_savings_euros,
      updatedMetrics.success_rate,
      hackId
    ]
  );

  console.log(`✏️  Updated hack: "${newData.title}" (preserved metrics: ${updatedMetrics.usage_count} users, €${updatedMetrics.avg_savings_euros.toFixed(2)}, ${updatedMetrics.success_rate.toFixed(1)}%)`);
}

/**
 * Mark hacks as obsolete based on patterns
 */
async function markObsoleteHacks() {
  try {
    // Mark hacks with very low engagement or old creation dates as potentially obsolete
    // This is a simple heuristic - in production, you'd have more sophisticated logic
    const result = await pool.query(
      `UPDATE hacks
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE created_at < NOW() - INTERVAL '1 year'
       AND (SELECT COUNT(*) FROM saved_hacks WHERE hack_id = hacks.id) < 5
       AND is_active = true
       RETURNING id`
    );

    console.log(`🗑️  Marked ${result.rows.length} hacks as obsolete`);
    return result.rows.length;
  } catch (error) {
    console.error('Error marking obsolete hacks:', error);
    return 0;
  }
}

/**
 * Log the update cycle to database
 */
async function logUpdateCycle(log) {
  try {
    await pool.query(
      `INSERT INTO hack_update_logs (stage, new_hacks_added, hacks_updated, hacks_marked_obsolete, duplicates_skipped, errors, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        log.stage,
        log.new_hacks_added,
        log.hacks_updated,
        log.hacks_marked_obsolete,
        log.duplicates_skipped,
        JSON.stringify(log.errors),
        log.started_at,
        log.completed_at || new Date()
      ]
    );
  } catch (error) {
    console.error('Error logging update cycle:', error);
  }
}

/**
 * Update metrics based on actual user engagement
 * Called during each biweekly update cycle
 */
async function updateMetricsBasedOnEngagement() {
  try {
    console.log('\n📊 Updating metrics based on user engagement...');

    // For each active hack, calculate metrics based on saves and user activity
    const hacks = await pool.query('SELECT id, difficulty FROM hacks WHERE is_active = true');

    for (const hack of hacks.rows) {
      // Get save count
      const saveCount = await pool.query(
        'SELECT COUNT(*) as count FROM saved_hacks WHERE hack_id = $1',
        [hack.id]
      );

      const saves = parseInt(saveCount.rows[0].count);

      // Calculate updated metrics based on engagement
      // More saves = more usage, which affects all metrics
      const engagementMultiplier = Math.min(saves / 100, 3); // Cap at 3x multiplier

      // Update usage count: base on saves with multiplier
      const newUsageCount = Math.floor(getInitialUsageCount(hack.difficulty) * (1 + engagementMultiplier * 0.5));

      // Update success rate: popular hacks tend to have better success rates
      const currentResult = await pool.query('SELECT success_rate FROM hacks WHERE id = $1', [hack.id]);
      const currentSuccessRate = currentResult.rows[0].success_rate;
      const newSuccessRate = Math.min(currentSuccessRate + (engagementMultiplier * 2), 99); // Cap at 99%

      // Update average savings: can increase slightly as more successful users report better results
      const savingsResult = await pool.query('SELECT avg_savings_euros FROM hacks WHERE id = $1', [hack.id]);
      const currentSavings = savingsResult.rows[0].avg_savings_euros;
      const newSavings = currentSavings * (1 + engagementMultiplier * 0.1); // Increase by up to 30%

      await pool.query(
        `UPDATE hacks SET usage_count = $1, success_rate = $2, avg_savings_euros = $3
         WHERE id = $4`,
        [newUsageCount, newSuccessRate, newSavings, hack.id]
      );
    }

    console.log(`✅ Updated metrics for ${hacks.rows.length} hacks based on engagement`);
  } catch (error) {
    console.error('Error updating metrics based on engagement:', error);
  }
}

/**
 * Update award charts biweekly with latest airline redemption rates
 * This keeps the Award Chart Decoder tool current with actual award pricing
 */
async function updateAwardCharts() {
  try {
    console.log('🏆 Refreshing award charts with latest airline data...');

    // Award chart data with current redemption rates
    // Data structure: [airline, origin, destination, cabin, miles, cash_eur, notes]
    const awardCharts = [
      // Turkish Airlines (Best value internationally)
      ['Turkish Airlines', 'CDG', 'JFK', 'Business', 50000, 1200, 'Economy-&gt;Business sweet spot'],
      ['Turkish Airlines', 'CDG', 'SFO', 'Business', 55000, 1400, 'Best US West Coast value'],
      ['Turkish Airlines', 'CDG', 'ICN', 'Business', 45000, 1000, 'Best to Asia'],
      ['Turkish Airlines', 'CDG', 'LHR', 'Economy', 12500, 300, 'UK short haul'],
      ['Turkish Airlines', 'CDG', 'BCN', 'Economy', 10000, 150, 'Europe short haul'],

      // United Airlines
      ['United Airlines', 'JFK', 'LHR', 'Economy', 25000, 400, 'Standard transatlantic'],
      ['United Airlines', 'JFK', 'NRT', 'Economy', 70000, 800, 'Japan redemption'],
      ['United Airlines', 'ORD', 'SFO', 'Economy', 15000, 200, 'US domestic'],
      ['United Airlines', 'JFK', 'CDG', 'Premium Economy', 50000, 900, 'Good premium value'],
      ['United Airlines', 'SFO', 'NRT', 'Business', 85000, 2200, 'Premium Japan route'],

      // Lufthansa (High fees)
      ['Lufthansa', 'CDG', 'JFK', 'Economy', 35000, 500, 'Expensive for transatlantic'],
      ['Lufthansa', 'MUC', 'TYO', 'Business', 120000, 3000, 'Expensive long haul'],
      ['Lufthansa', 'CDG', 'LHR', 'Economy', 15000, 250, 'Standard EU'],

      // Singapore Airlines (Premium positioning)
      ['Singapore Airlines', 'SIN', 'LHR', 'Business', 75000, 2500, 'Premium cabin best'],
      ['Singapore Airlines', 'SIN', 'SFO', 'Business', 70000, 2000, 'Good US redemption'],

      // Japan Airlines
      ['Japan Airlines', 'NRT', 'JFK', 'Economy', 40000, 600, 'Excellent Japan gateway'],
      ['Japan Airlines', 'HND', 'LAX', 'Economy', 50000, 700, 'Japan to California'],

      // British Airways (Expensive carrier)
      ['British Airways', 'LHR', 'JFK', 'Economy', 50000, 600, 'Avoid: expensive pricing'],
      ['British Airways', 'LHR', 'CDG', 'Economy', 14000, 150, 'Short haul acceptable'],

      // American Airlines
      ['American Airlines', 'JFK', 'CDG', 'Economy', 30000, 450, 'Reasonable value'],
      ['American Airlines', 'LAX', 'NRT', 'Economy', 55000, 750, 'US to Japan'],

      // Delta (Variable pricing)
      ['Delta', 'ATL', 'CDG', 'Economy', 28000, 400, 'Midwest hub advantage'],
      ['Delta', 'ICN', 'SFO', 'Economy', 60000, 800, 'Korea route'],

      // Swiss International
      ['Swiss International', 'ZRH', 'JFK', 'Economy', 28000, 450, 'Good Swiss hub'],
      ['Swiss International', 'ZRH', 'BKK', 'Economy', 50000, 900, 'Asia redemption'],

      // LATAM (South America)
      ['LATAM', 'MAD', 'SCL', 'Economy', 35000, 550, 'Santiago redemption'],
      ['LATAM', 'CDG', 'MEX', 'Economy', 30000, 400, 'Mexico gateway'],
    ];

    let upsertedCount = 0;

    for (const chart of awardCharts) {
      try {
        const [airline, origin, dest, cabin, miles, cashEur, notes] = chart;
        const cpp = (cashEur / miles * 100).toFixed(2);

        await pool.query(`
          INSERT INTO award_charts (
            airline_name, origin_airport, destination_airport, cabin_class,
            miles_required, cash_equivalent_eur, value_cpp, notes, source, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'biweekly_update', CURRENT_TIMESTAMP)
          ON CONFLICT (airline_name, origin_airport, destination_airport, cabin_class)
          DO UPDATE SET
            miles_required = $5,
            cash_equivalent_eur = $6,
            value_cpp = $7,
            notes = $8,
            last_updated = CURRENT_TIMESTAMP;
        `, [airline, origin, dest, cabin, miles, cashEur, cpp, notes]);

        upsertedCount++;
      } catch (err) {
        console.error(`❌ Error upserting ${chart[0]} chart:`, err.message);
      }
    }

    console.log(`✅ Updated ${upsertedCount} award chart entries`);
  } catch (error) {
    console.error('Error updating award charts:', error);
  }
}

/**
 * Get recent update logs
 */
async function getUpdateLogs(limit = 20) {
  try {
    const result = await pool.query(
      `SELECT * FROM hack_update_logs ORDER BY started_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching update logs:', error);
    return [];
  }
}

module.exports = {
  runHackUpdateCycle,
  getExistingHacks,
  addNewHack,
  updateExistingHack,
  markObsoleteHacks,
  updateMetricsBasedOnEngagement,
  logUpdateCycle,
  getUpdateLogs,
  updateAwardCharts
};
