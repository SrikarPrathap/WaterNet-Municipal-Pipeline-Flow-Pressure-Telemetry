
const pool = require("./db");

function randomBetween(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

async function generateReading() {
  const possibleLeak = Math.random() < 0.08;

  const flow_rate = possibleLeak
    ? randomBetween(25, 40)
    : randomBetween(10, 22);

  const pressure = possibleLeak
    ? randomBetween(0.7, 1.4)
    : randomBetween(2.0, 3.4);

  const turbidity = Math.random() < 0.05
    ? randomBetween(5.2, 8.0)
    : randomBetween(0.8, 4.0);

  try {
    const result = await pool.query(
      `INSERT INTO telemetry
       (flow_rate, pressure, turbidity, source)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [flow_rate, pressure, turbidity, "simulated"]
    );

    console.log("Simulated reading saved:", result.rows[0]);

    if (pressure < 1.5 && flow_rate > 20) {
      await pool.query(
        `INSERT INTO alerts (alert_type, message, severity)
         VALUES ($1, $2, $3)`,
        [
          "POSSIBLE_LEAK",
          `Possible pipeline leak: flow ${flow_rate} L/min, pressure ${pressure} bar.`,
          "HIGH",
        ]
      );
      console.log("Possible leak alert created.");
    }

    if (turbidity > 5) {
      await pool.query(
        `INSERT INTO alerts (alert_type, message, severity)
         VALUES ($1, $2, $3)`,
        [
          "HIGH_TURBIDITY",
          `High turbidity detected: ${turbidity} NTU.`,
          "MEDIUM",
        ]
      );
      console.log("High turbidity alert created.");
    }
  } catch (error) {
    console.error("Simulator error:", error.message);
  }
}

function startSimulator() {
  console.log("WaterNet simulator started.");

  generateReading();
  setInterval(generateReading, 30000);
}

module.exports = startSimulator;
