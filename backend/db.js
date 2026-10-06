const mongoose = require("mongoose");

module.exports = async () => {
  const connString =
    process.env.MONGO_CONN_STR || "mongodb://localhost:27017/kubepulse";

  const options = {
    user: process.env.MONGO_USERNAME || undefined,
    pass: process.env.MONGO_PASSWORD || undefined,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  };

  try {
    await mongoose.connect(connString, options);
    console.log("[Database] Connected successfully to MongoDB");
  } catch (error) {
    console.error("[Database] Connection failed:", error.message);
  }
};
