const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect } = require('../middleware/auth');

// Elite program definitions with tier requirements
const ELITE_PROGRAMS = {
  airlines: {
    'United Airlines': {
      type: 'airline',
      tiers: [
        { name: 'Silver', miles: 25000, nights: 0, benefits: 'Priority boarding, +10% miles bonus' },
        { name: 'Gold', miles: 50000, nights: 10, benefits: 'Complimentary upgrades, lounge access' },
        { name: 'Platinum', miles: 75000, nights: 25, benefits: 'Guaranteed upgrades, premium lounge' },
        { name: '1K', miles: 100000, nights: 50, benefits: 'First class upgrades, Uber credits' }
      ]
    },
    'American Airlines': {
      type: 'airline',
      tiers: [
        { name: 'Silver', miles: 30000, nights: 0, benefits: 'Priority boarding, upgrades' },
        { name: 'Gold', miles: 50000, nights: 15, benefits: 'Guaranteed upgrades, lounge' },
        { name: 'Platinum', miles: 75000, nights: 30, benefits: 'Premium cabin upgrades' },
        { name: 'Executive Platinum', miles: 120000, nights: 60, benefits: 'Systemwide upgrades, concierge' }
      ]
    },
    'Delta': {
      type: 'airline',
      tiers: [
        { name: 'Silver', miles: 25000, nights: 0, benefits: 'Priority boarding, free bag' },
        { name: 'Gold', miles: 50000, nights: 10, benefits: 'Complimentary upgrades, lounge' },
        { name: 'Platinum', miles: 75000, nights: 25, benefits: 'Guaranteed upgrades' },
        { name: 'Diamond', miles: 125000, nights: 60, benefits: 'First class access, concierge' }
      ]
    },
    'Turkish Airlines': {
      type: 'airline',
      tiers: [
        { name: 'Silver', miles: 20000, nights: 0, benefits: 'Priority boarding, lounge' },
        { name: 'Gold', miles: 40000, nights: 5, benefits: 'Guaranteed upgrades, +25% miles' },
        { name: 'Platinum', miles: 80000, nights: 15, benefits: 'Premium lounge, high upgrades' },
        { name: 'Diamond', miles: 150000, nights: 30, benefits: 'All benefits maximized' }
      ]
    },
    'British Airways': {
      type: 'airline',
      tiers: [
        { name: 'Bronze', miles: 15000, nights: 0, benefits: 'Priority boarding' },
        { name: 'Silver', miles: 40000, nights: 10, benefits: 'Complimentary upgrades' },
        { name: 'Gold', miles: 80000, nights: 25, benefits: 'Guaranteed upgrades' },
        { name: 'Platinum', miles: 120000, nights: 50, benefits: 'First class upgrades' }
      ]
    }
  },
  hotels: {
    'Marriott Bonvoy': {
      type: 'hotel',
      tiers: [
        { name: 'Silver Elite', nights: 10, benefits: 'Free room upgrade, lounge access' },
        { name: 'Gold Elite', nights: 25, benefits: 'Guaranteed suite upgrade, breakfast' },
        { name: 'Platinum Elite', nights: 50, benefits: 'Premium room type upgrade' },
        { name: 'Diamond Elite', nights: 70, benefits: 'All benefits + personal concierge' }
      ]
    },
    'Hilton Honors': {
      type: 'hotel',
      tiers: [
        { name: 'Silver', nights: 10, benefits: 'Free room upgrade, free breakfast' },
        { name: 'Gold', nights: 25, benefits: 'Guaranteed upgrade, club lounge' },
        { name: 'Diamond', nights: 60, benefits: 'Suite upgrade, premium benefits' },
        { name: 'Diamond Elite', nights: 100, benefits: 'VIP services, $200 certificate' }
      ]
    },
    'IHG One Rewards': {
      type: 'hotel',
      tiers: [
        { name: 'Silver Elite', nights: 10, benefits: 'Free upgrade, continental breakfast' },
        { name: 'Gold Elite', nights: 25, benefits: 'Room upgrade, lounge access' },
        { name: 'Platinum Elite', nights: 50, benefits: 'Suite upgrade, $50 credit' },
        { name: 'Diamond Elite', nights: 80, benefits: 'Premium suite upgrade, concierge' }
      ]
    }
  }
};

// GET user's elite progress across all programs
router.get('/my-progress', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_elite_progress WHERE user_id = $1 ORDER BY program_type, program_name`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
      programs: ELITE_PROGRAMS
    });
  } catch (error) {
    console.error('Error fetching elite progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching elite progress',
      error: error.message
    });
  }
});

// GET specific program progress
router.get('/program/:programName', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_elite_progress WHERE user_id = $1 AND program_name = $2`,
      [req.user.id, req.params.programName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching program progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching program progress',
      error: error.message
    });
  }
});

// POST/UPDATE user's elite progress for a program
router.post('/update-progress', protect, async (req, res) => {
  try {
    const {
      program_name,
      program_type,
      current_tier,
      elite_nights,
      tier_miles,
      elite_night_certificates,
      status_expires_at,
      notes
    } = req.body;

    if (!program_name || !program_type) {
      return res.status(400).json({
        success: false,
        message: 'program_name and program_type are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO user_elite_progress (
        user_id, program_name, program_type, current_tier,
        elite_nights, tier_miles, elite_night_certificates,
        status_expires_at, notes, last_activity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, program_name)
      DO UPDATE SET
        program_type = $3,
        current_tier = $4,
        elite_nights = $5,
        tier_miles = $6,
        elite_night_certificates = $7,
        status_expires_at = $8,
        notes = $9,
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, [
      req.user.id,
      program_name,
      program_type,
      current_tier || 'Member',
      elite_nights || 0,
      tier_miles || 0,
      elite_night_certificates || 0,
      status_expires_at,
      notes
    ]);

    res.json({
      success: true,
      message: 'Elite progress updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating elite progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating elite progress',
      error: error.message
    });
  }
});

// DELETE program from user's tracking
router.delete('/remove-program/:programName', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM user_elite_progress WHERE user_id = $1 AND program_name = $2 RETURNING *`,
      [req.user.id, req.params.programName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      message: 'Program removed from tracking',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error removing program:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing program',
      error: error.message
    });
  }
});

// GET available programs list
router.get('/available-programs', async (req, res) => {
  try {
    const programs = [];

    // Add airline programs
    Object.entries(ELITE_PROGRAMS.airlines).forEach(([name, config]) => {
      programs.push({
        name,
        type: 'airline',
        icon: '✈️',
        tiers: config.tiers.map(t => t.name)
      });
    });

    // Add hotel programs
    Object.entries(ELITE_PROGRAMS.hotels).forEach(([name, config]) => {
      programs.push({
        name,
        type: 'hotel',
        icon: '🏨',
        tiers: config.tiers.map(t => t.name)
      });
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error('Error fetching available programs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available programs',
      error: error.message
    });
  }
});

// GET program details including tiers and requirements
router.get('/program-details/:programName', async (req, res) => {
  try {
    const { programName } = req.params;

    // Search in airlines
    const airlineProgram = ELITE_PROGRAMS.airlines[programName];
    if (airlineProgram) {
      return res.json({
        success: true,
        data: {
          name: programName,
          type: 'airline',
          icon: '✈️',
          tiers: airlineProgram.tiers
        }
      });
    }

    // Search in hotels
    const hotelProgram = ELITE_PROGRAMS.hotels[programName];
    if (hotelProgram) {
      return res.json({
        success: true,
        data: {
          name: programName,
          type: 'hotel',
          icon: '🏨',
          tiers: hotelProgram.tiers
        }
      });
    }

    res.status(404).json({
      success: false,
      message: 'Program not found'
    });
  } catch (error) {
    console.error('Error fetching program details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching program details',
      error: error.message
    });
  }
});

module.exports = router;
