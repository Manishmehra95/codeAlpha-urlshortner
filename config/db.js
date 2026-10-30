const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses connection string from environment variables and caches connection for serverless
 */
const connectDB = async () => {
    // If already connected or connecting, reuse the existing connection
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
    }
};

module.exports = connectDB;