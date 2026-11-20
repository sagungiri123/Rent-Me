const mongoose = require("mongoose");

let dbConnected = false;

const connectDB = async () => {
  mongoose.set("bufferCommands", false);
  mongoose.set("debug", false);
  mongoose.set("sanitizeFilter", true);
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI not configured — running RentMe with live in-memory store.");
    dbConnected = false;
    return false;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    dbConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch {
    dbConnected = false;
    console.warn("MongoDB unavailable — running RentMe with live in-memory store.");
    return false;
  }
};

const isDbConnected = () => dbConnected && mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
