const mongoose = require("mongoose");

let isConnecting = false;

const connectWithRetry = async (retryCount = 0) => {
  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;

  isConnecting = true;
  const connString =
    process.env.MONGO_CONN_STR || "mongodb://localhost:27017/kubepulse";

  const options = {
    user: process.env.MONGO_USERNAME || undefined,
    pass: process.env.MONGO_PASSWORD || undefined,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
  };

  try {
    await mongoose.connect(connString, options);
    console.log(
      JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        message: "Connected to MongoDB cluster successfully",
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        message: `Database connection attempt ${retryCount + 1} failed: ${error.message}`,
      })
    );
    // Exponential backoff up to 10s
    const backoff = Math.min(1000 * Math.pow(2, retryCount), 10000);
    setTimeout(() => {
      isConnecting = false;
      connectWithRetry(retryCount + 1);
    }, backoff);
  } finally {
    isConnecting = false;
  }
};

module.exports = connectWithRetry;
