const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect } = require('../middleware/auth');

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE wildcard /:id route!

// GET available programs list
router.get('/available-programs', async (req, res) => {
  try {
    const programs = [];

    // Add airline programs
    const airlines = ['United Airlines', 'American Airlines', 'Delta', 'Turkish Airlines', 'British Airways'];
    airlines.forEach(name => {
      programs.push({
        name,
        type: 'airline',
        icon: '✈️'
      });
    });

    // Add hotel programs
    const hotels = ['Marriott Bonvoy', 'Hilton Honors', 'IHG One Rewards'];
    hotels.forEach(name => {
      programs.push({
        name,
        type: 'hotel',
        icon: '🏨'
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

// GET airlines list
router.get('/list/airlines', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT airline_name FROM award_charts ORDER BY airline_name ASC'
    );

    res.json({
      success: true,
      data: result.rows.map(r => r.airline_name)
    });
  } catch (error) {
    console.error('Error fetching airlines:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching airlines',
      error: error.message
    });
  }
});

// GET cabin classes available
router.get('/list/cabins', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT cabin_class FROM award_charts ORDER BY cabin_class ASC'
    );

    res.json({
      success: true,
      data: result.rows.map(r => r.cabin_class)
    });
  } catch (error) {
    console.error('Error fetching cabin classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cabin classes',
      error: error.message
    });
  }
});

// GET program details including tiers and requirements
router.get('/program-details/:programName', async (req, res) => {
  try {
    const { programName } = req.params;

    // For now, return generic response
    // In production, this would fetch from a programs database
    const programs = {
      'United Airlines': {
        type: 'airline',
        icon: '✈️',
        tiers: [
          { name: 'Silver', miles: 25000 },
          { name: 'Gold', miles: 50000 },
          { name: 'Platinum', miles: 75000 },
          { name: '1K', miles: 100000 }
        ]
      },
      'American Airlines': {
        type: 'airline',
        icon: '✈️',
        tiers: [
          { name: 'Silver', miles: 30000 },
          { name: 'Gold', miles: 50000 },
          { name: 'Platinum', miles: 75000 },
          { name: 'Executive Platinum', miles: 120000 }
        ]
      }
    };

    if (programs[programName]) {
      res.json({
        success: true,
        data: {
          name: programName,
          ...programs[programName]
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
  } catch (error) {
    console.error('Error fetching program details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching program details',
      error: error.message
    });
  }
});

// GET all award charts or filter by route/airline
router.get('/search', async (req, res) => {
  try {
    const { origin, destination, cabin_class, airline } = req.query;

    let query = 'SELECT * FROM award_charts WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Build dynamic query based on filters
    if (origin) {
      query += ` AND UPPER(origin_airport) = UPPER($${paramCount})`;
      params.push(origin);
      paramCount++;
    }

    if (destination) {
      query += ` AND UPPER(destination_airport) = UPPER($${paramCount})`;
      params.push(destination);
      paramCount++;
    }

    if (cabin_class) {
      query += ` AND LOWER(cabin_class) = LOWER($${paramCount})`;
      params.push(cabin_class);
      paramCount++;
    }

    if (airline) {
      query += ` AND LOWER(airline_name) LIKE LOWER($${paramCount})`;
      params.push(`%${airline}%`);
      paramCount++;
    }

    // Order by best value (CPP) first
    query += ' ORDER BY value_cpp DESC, miles_required ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching award charts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching award charts',
      error: error.message
    });
  }
});

// ⚠️ WILDCARD ROUTE - MUST COME LAST!
// GET specific award chart by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM award_charts WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Award chart not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching award chart:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching award chart',
      error: error.message
    });
  }
});

// Admin: Add/Update award chart
router.post('/admin/upsert', protect, async (req, res) => {
  try {
    // Check if user is admin (can expand this check)
    const userResult = await pool.query(
      'SELECT subscription_tier FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].subscription_tier !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update award charts'
      });
    }

    const {
      airline_name,
      origin_airport,
      destination_airport,
      cabin_class,
      miles_required,
      cash_equivalent_eur,
      value_cpp,
      notes,
      source
    } = req.body;

    // Calculate CPP if not provided
    let finalCpp = value_cpp;
    if (!finalCpp && cash_equivalent_eur && miles_required) {
      finalCpp = (cash_equivalent_eur / miles_required * 100).toFixed(2);
    }

    const result = await pool.query(`
      INSERT INTO award_charts (
        airline_name, origin_airport, destination_airport, cabin_class,
        miles_required, cash_equivalent_eur, value_cpp, notes, source, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (airline_name, origin_airport, destination_airport, cabin_class)
      DO UPDATE SET
        miles_required = $5,
        cash_equivalent_eur = $6,
        value_cpp = $7,
        notes = $8,
        source = $9,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *;
    `, [
      airline_name,
      origin_airport.toUpperCase(),
      destination_airport.toUpperCase(),
      cabin_class,
      miles_required,
      cash_equivalent_eur,
      finalCpp,
      notes,
      source
    ]);

    res.json({
      success: true,
      message: 'Award chart updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error upserting award chart:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating award chart',
      error: error.message
    });
  }
});

// Admin: Bulk update award charts
router.post('/admin/bulk-upsert', protect, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT subscription_tier FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].subscription_tier !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update award charts'
      });
    }

    const charts = req.body.charts; // Array of chart objects

    if (!Array.isArray(charts) || charts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'charts must be a non-empty array'
      });
    }

    let upsertedCount = 0;

    for (const chart of charts) {
      const {
        airline_name,
        origin_airport,
        destination_airport,
        cabin_class,
        miles_required,
        cash_equivalent_eur,
        value_cpp,
        notes,
        source
      } = chart;

      // Calculate CPP if not provided
      let finalCpp = value_cpp;
      if (!finalCpp && cash_equivalent_eur && miles_required) {
        finalCpp = (cash_equivalent_eur / miles_required * 100).toFixed(2);
      }

      try {
        await pool.query(`
          INSERT INTO award_charts (
            airline_name, origin_airport, destination_airport, cabin_class,
            miles_required, cash_equivalent_eur, value_cpp, notes, source, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
          ON CONFLICT (airline_name, origin_airport, destination_airport, cabin_class)
          DO UPDATE SET
            miles_required = $5,
            cash_equivalent_eur = $6,
            value_cpp = $7,
            notes = $8,
            source = $9,
            last_updated = CURRENT_TIMESTAMP;
        `, [
          airline_name,
          origin_airport.toUpperCase(),
          destination_airport.toUpperCase(),
          cabin_class,
          miles_required,
          cash_equivalent_eur,
          finalCpp,
          notes,
          source
        ]);

        upsertedCount++;
      } catch (err) {
        console.error(`Error upserting chart for ${airline_name} ${origin_airport}->${destination_airport}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Successfully upserted ${upsertedCount} award charts`,
      upserted: upsertedCount,
      total: charts.length
    });
  } catch (error) {
    console.error('Error in bulk upsert:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk upsert',
      error: error.message
    });
  }
});

module.exports = router;
