/**
 * Seed script to populate hacks into the database
 * Run: node seeds/seedHacks.js
 */

require('dotenv').config({ path: '.env' });
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function seedHacks() {
  try {
    console.log('🌱 Starting hack seeding...\n');

    // Check if hacks already exist
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM hacks');
    const hackCount = parseInt(existingCount.rows[0].count);

    if (hackCount > 0) {
      console.log(`⚠️  Database already contains ${hackCount} hacks.`);
      console.log('💡 To reset, run: DELETE FROM hacks;');
      console.log('   Then run this script again.\n');
      process.exit(0);
    }

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'hacks.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing seed SQL...');
    await pool.query(sql);

    // Verify insertion
    const result = await pool.query('SELECT COUNT(*) as count FROM hacks');
    const insertedCount = parseInt(result.rows[0].count);

    console.log(`✅ Successfully inserted ${insertedCount} travel hacks!\n`);

    // Show breakdown by module
    const breakdown = await pool.query(`
      SELECT module_id, COUNT(*) as hack_count
      FROM hacks
      GROUP BY module_id
      ORDER BY module_id
    `);

    console.log('📊 Hacks by Module:');
    const moduleNames = {
      1: 'Flight Hacks',
      2: 'Credit Cards',
      3: 'Hotel Hacks',
      4: 'Timing Intelligence',
      5: 'Airport & Transit',
      6: 'Destinations',
      7: 'Car Rentals',
      8: 'Community',
      9: 'Travel Money',
      10: 'Travel Insurance',
      11: 'Visa & Immigration',
      12: 'Accommodations',
      13: 'Ground Transport',
      14: 'Travel Bookings',
      15: 'Food & Dining',
      16: 'Shopping & VAT'
    };

    breakdown.rows.forEach(row => {
      const name = moduleNames[row.module_id];
      console.log(`   Module ${row.module_id}: ${name.padEnd(25)} - ${row.hack_count} hacks`);
    });

    console.log('\n✨ Seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding hacks:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedHacks();
