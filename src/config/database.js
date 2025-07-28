const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            throw new Error('MONGODB_URI is required');
        }

        const conn = await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        throw error;
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error('MongoDB disconnection error:', error);
        throw error;
    }
};

module.exports = {
    connectDB,
    disconnectDB
};
