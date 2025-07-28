const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./user');
const agriculturalRoutes = require('./agricultural');
const botRoutes = require('./bot');
const adminRoutes = require('./admin');

// Mount routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/agricultural', agriculturalRoutes);
router.use('/bot', botRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('../../package.json').version
    });
});

// API information endpoint
router.get('/', (req, res) => {
    res.json({
        name: 'AgriBot API',
        version: require('../../package.json').version,
        description: 'Intelligent Agricultural Telegram Bot API',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            user: '/api/user',
            agricultural: '/api/agricultural',
            bot: '/api/bot',
            admin: '/api/admin'
        },
        features: [
            'Telegram Bot Integration',
            'Weather Data',
            'Market Prices',
            'Agricultural Advice',
            'User Management',
            'Scheduled Updates',
            'Real-time Notifications'
        ]
    });
});

module.exports = router;
