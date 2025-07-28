require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

// Import modules
const botHandler = require('./bot/botHandler');
const apiRoutes = require('./api');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const cronJobs = require('./cron/cronJobs');
const { rateLimiter } = require('./middleware/rateLimiter');

class AgriBot {
    constructor() {
        this.bot = null;
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.init();
    }

    async init() {
        try {
            // Connect to MongoDB
            await connectDB();
            logger.info('MongoDB connected successfully');

            // Initialize Telegram Bot
            this.initBot();

            // Initialize Express Server
            this.initExpress();

            // Initialize Cron Jobs
            this.initCronJobs();

            // Start server
            this.startServer();

        } catch (error) {
            logger.error('Failed to initialize AgriBot:', error);
            process.exit(1);
        }
    }

    initBot() {
        const token = process.env.BOT_TOKEN;
        if (!token) {
            throw new Error('BOT_TOKEN is required');
        }

        this.bot = new TelegramBot(token, { polling: true });
        
        // Initialize bot handlers
        botHandler.init(this.bot);
        
        logger.info('Telegram bot initialized successfully');
    }

    initExpress() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Rate limiting
        this.app.use(rateLimiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Static files
        this.app.use('/static', express.static('public'));

        // API routes
        this.app.use('/api', apiRoutes);

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: require('../package.json').version
            });
        });

        // Error handling
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });

        logger.info('Express server configured successfully');
    }

    initCronJobs() {
        if (process.env.ENABLE_CRON === 'true') {
            cronJobs.init(this.bot);
            logger.info('Cron jobs initialized successfully');
        }
    }

    startServer() {
        this.app.listen(this.port, () => {
            logger.info(`🚀 AgriBot server running on port ${this.port}`);
            logger.info(`🤖 Telegram bot is active`);
            logger.info(`🌱 Agricultural intelligence ready`);
        });
    }

    // Graceful shutdown
    shutdown() {
        logger.info('Shutting down AgriBot...');
        
        if (this.bot) {
            this.bot.stopPolling();
        }
        
        mongoose.connection.close();
        process.exit(0);
    }
}

// Handle shutdown signals
process.on('SIGINT', () => {
    logger.info('Received SIGINT signal');
    if (global.agriBot) {
        global.agriBot.shutdown();
    }
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal');
    if (global.agriBot) {
        global.agriBot.shutdown();
    }
});

// Start the application
const agriBot = new AgriBot();
global.agriBot = agriBot;

module.exports = agriBot;
