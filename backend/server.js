const startSimulator = require("./simulator");
const telemetryRoutes = require("./routes/telemetry");
const authRoutes = require("./routes/auth");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to WaterNet API",
    status: "running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    res.json({
      status: "connected",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error("Database check failed:", error.message);
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`WaterNet server running on port ${PORT}`);

  if (process.env.SIMULATOR_ENABLED === "true") {
    startSimulator();
  }
});
