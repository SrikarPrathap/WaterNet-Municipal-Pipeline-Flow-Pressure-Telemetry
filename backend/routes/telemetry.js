
const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Save a water telemetry reading
router.post("/", async (req, res) => {
  try {
    const { flow_rate, pressure, turbidity } = req.body;

    const flow = Number(flow_rate);
    const press = Number(pressure);
    const turb = Number(turbidity);

    if (
      flow_rate === undefined || flow_rate === null || flow_rate === "" ||
      pressure === undefined || pressure === null || pressure === "" ||
      turbidity === undefined || turbidity === null || turbidity === ""
    ) {
      return res.status(400).json({
        message: "Flow rate, pressure and turbidity are required",
      });
    }

    if (
      !Number.isFinite(flow) ||
      !Number.isFinite(press) ||
      !Number.isFinite(turb) ||
      flow < 0 || flow > 10000 ||
      press < 0 || press > 1000 ||
      turb < 0 || turb > 100000
    ) {
      return res.status(400).json({
        message: "Invalid sensor values",
      });
    }

    const result = await pool.query(
      `INSERT INTO telemetry (flow_rate, pressure, turbidity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [flow, press, turb]
    );

    const reading = result.rows[0];

    // Example demonstration thresholds; calibrate for your pipeline.
    const possibleLeak = press < 1.5 && flow > 20;
    const highTurbidity = turb > 5;

    const alerts = [];

    if (possibleLeak) {
      alerts.push({
        alert_type: "POSSIBLE_LEAK",
        message: "High flow and low pressure detected",
        severity: "high",
      });
    }

    if (highTurbidity) {
      alerts.push({
        alert_type: "HIGH_TURBIDITY",
        message: "Water turbidity exceeds the demo threshold",
        severity: "medium",
      });
    }

    for (const alert of alerts) {
      await pool.query(
        `INSERT INTO alerts (alert_type, message, severity)
         VALUES ($1, $2, $3)`,
        [alert.alert_type, alert.message, alert.severity]
      );
    }

    res.status(201).json({
      message: "Telemetry saved successfully",
      reading,
      alerts,
    });
  } catch (error) {
    console.error("Telemetry error:", error.message);
    res.status(500).json({
      message: "Unable to save telemetry",
    });
  }
});

// Retrieve recent readings
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM telemetry
       ORDER BY recorded_at DESC
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Readings error:", error.message);
    res.status(500).json({ message: "Unable to retrieve readings" });
  }
});

// Retrieve dashboard statistics
router.get("/summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_readings,
        COALESCE(ROUND(AVG(flow_rate), 2), 0) AS avg_flow_rate,
        COALESCE(ROUND(AVG(pressure), 2), 0) AS avg_pressure,
        COALESCE(ROUND(AVG(turbidity), 2), 0) AS avg_turbidity,
        COALESCE(ROUND(MAX(flow_rate), 2), 0) AS peak_flow_rate
      FROM telemetry
      WHERE recorded_at >= CURRENT_DATE
        AND recorded_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    const alerts = await pool.query(`
      SELECT COUNT(*) AS active_alerts
      FROM alerts
      WHERE resolved = FALSE
    `);

    res.json({
      ...result.rows[0],
      active_alerts: Number(alerts.rows[0].active_alerts),
    });
  } catch (error) {
    console.error("Summary error:", error.message);
    res.status(500).json({ message: "Unable to retrieve summary" });
  }
});

// Retrieve alerts
router.get("/alerts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM alerts
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Alerts error:", error.message);
    res.status(500).json({ message: "Unable to retrieve alerts" });
  }
});

module.exports = router;
