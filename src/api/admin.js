const express = require('express');
const router = express.Router();
const { adminAuth, moderatorAuth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const AgriculturalData = require('../models/AgriculturalData');
const logger = require('../utils/logger');

// Apply admin authentication to all routes
router.use(adminAuth);
router.use(rateLimiter);

// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '7d';
        
        let startDate;
        switch (timeframe) {
            case '24h':
                startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }

        // User statistics
        const totalUsers = await User.countDocuments();
        const newUsers = await User.countDocuments({
            'botData.joinedAt': { $gte: startDate }
        });
        const activeUsers = await User.countDocuments({
            'botData.lastInteraction': { $gte: startDate }
        });
        const premiumUsers = await User.countDocuments({
            'subscription.type': { $in: ['premium', 'pro'] }
        });

        // Conversation statistics
        const totalConversations = await Conversation.countDocuments({
            createdAt: { $gte: startDate }
        });
        const avgResponseTime = await Conversation.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    'analytics.responseTime': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgResponseTime: { $avg: '$analytics.responseTime' }
                }
            }
        ]);

        // Intent distribution
        const intentStats = await Conversation.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    intent: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$intent',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // User growth over time
        const userGrowth = await User.aggregate([
            {
                $match: {
                    'botData.joinedAt': { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$botData.joinedAt'
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // Subscription distribution
        const subscriptionStats = await User.aggregate([
            {
                $group: {
                    _id: '$subscription.type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const dashboard = {
            timeframe,
            overview: {
                totalUsers,
                newUsers,
                activeUsers,
                premiumUsers,
                totalConversations,
                avgResponseTime: Math.round(avgResponseTime[0]?.avgResponseTime || 0)
            },
            charts: {
                intentDistribution: intentStats,
                userGrowth,
                subscriptionDistribution: subscriptionStats
            }
        };

        res.json({
            success: true,
            dashboard
        });

    } catch (error) {
        logger.error('Error getting admin dashboard:', error);
        res.status(500).json({
            error: 'Dashboard service unavailable',
            message: 'Unable to fetch dashboard data at this time'
        });
    }
});

// Get all users with pagination
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const subscription = req.query.subscription;
        const status = req.query.status;

        let query = {};

        // Apply filters
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { telegramId: parseInt(search) || 0 }
            ];
        }

        if (subscription) {
            query['subscription.type'] = subscription;
        }

        if (status === 'banned') {
            query['permissions.isBanned'] = true;
        } else if (status === 'active') {
            query['permissions.isBanned'] = false;
            query['botData.lastInteraction'] = {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            };
        }

        const users = await User.find(query)
            .sort({ 'botData.joinedAt': -1 })
            .skip(skip)
            .limit(limit)
            .select('telegramId username firstName lastName botData subscription permissions analytics');

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error getting users:', error);
        res.status(500).json({
            error: 'User service unavailable',
            message: 'Unable to fetch users at this time'
        });
    }
});

// Get specific user details
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ telegramId: parseInt(userId) });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with the specified ID'
            });
        }

        // Get user's conversation history
        const conversations = await Conversation.find({ userId: user.telegramId })
            .sort({ createdAt: -1 })
            .limit(50)
            .select('message botResponse intent createdAt analytics');

        res.json({
            success: true,
            user,
            conversations
        });

    } catch (error) {
        logger.error('Error getting user details:', error);
        res.status(500).json({
            error: 'User service unavailable',
            message: 'Unable to fetch user details at this time'
        });
    }
});

// Update user (ban/unban, change subscription, etc.)
router.put('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const user = await User.findOne({ telegramId: parseInt(userId) });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with the specified ID'
            });
        }

        // Update permissions
        if (updates.permissions) {
            if (updates.permissions.isBanned !== undefined) {
                user.permissions.isBanned = Boolean(updates.permissions.isBanned);
                if (user.permissions.isBanned) {
                    user.permissions.bannedAt = new Date();
                    user.permissions.banReason = updates.permissions.banReason || 'No reason provided';
                } else {
                    user.permissions.bannedAt = undefined;
                    user.permissions.banReason = undefined;
                }
            }

            if (updates.permissions.isAdmin !== undefined) {
                user.permissions.isAdmin = Boolean(updates.permissions.isAdmin);
            }

            if (updates.permissions.isModerator !== undefined) {
                user.permissions.isModerator = Boolean(updates.permissions.isModerator);
            }
        }

        // Update subscription
        if (updates.subscription) {
            if (updates.subscription.type) {
                const validTypes = ['free', 'premium', 'pro'];
                if (validTypes.includes(updates.subscription.type)) {
                    user.subscription.type = updates.subscription.type;
                    
                    if (updates.subscription.type !== 'free') {
                        // Set expiration date (default 1 month)
                        const expirationDate = new Date();
                        expirationDate.setMonth(expirationDate.getMonth() + 1);
                        user.subscription.expiresAt = updates.subscription.expiresAt || expirationDate;
                    } else {
                        user.subscription.expiresAt = undefined;
                    }
                }
            }
        }

        await user.save();

        logger.info(`User ${userId} updated by admin ${req.user.telegramId}`, {
            updates,
            adminId: req.user.telegramId
        });

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                telegramId: user.telegramId,
                permissions: user.permissions,
                subscription: user.subscription
            }
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({
            error: 'User update failed',
            message: 'Unable to update user at this time'
        });
    }
});

// Get system statistics
router.get('/stats/system', async (req, res) => {
    try {
        const stats = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error getting system stats:', error);
        res.status(500).json({
            error: 'System stats unavailable',
            message: 'Unable to fetch system statistics at this time'
        });
    }
});

// Get conversation analytics
router.get('/analytics/conversations', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '30d';
        
        let startDate;
        switch (timeframe) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        const analytics = await Conversation.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    totalConversations: { $sum: 1 },
                    avgResponseTime: { $avg: '$analytics.responseTime' },
                    avgConfidence: { $avg: '$aiProcessing.confidence' },
                    uniqueUsers: { $addToSet: '$userId' }
                }
            },
            {
                $addFields: {
                    uniqueUserCount: { $size: '$uniqueUsers' }
                }
            },
            {
                $project: {
                    uniqueUsers: 0
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        res.json({
            success: true,
            timeframe,
            analytics
        });

    } catch (error) {
        logger.error('Error getting conversation analytics:', error);
        res.status(500).json({
            error: 'Analytics service unavailable',
            message: 'Unable to fetch conversation analytics at this time'
        });
    }
});

// Broadcast message to users
router.post('/broadcast', async (req, res) => {
    try {
        const { message, target = 'all', subscription, location } = req.body;

        if (!message) {
            return res.status(400).json({
                error: 'Message required',
                message: 'Please provide a message to broadcast'
            });
        }

        let query = { 'permissions.isBanned': false };

        // Apply targeting filters
        if (target === 'premium') {
            query['subscription.type'] = { $in: ['premium', 'pro'] };
        } else if (target === 'active') {
            query['botData.lastInteraction'] = {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            };
        }

        if (subscription) {
            query['subscription.type'] = subscription;
        }

        if (location) {
            query['profile.location.country'] = location;
        }

        const users = await User.find(query).select('telegramId firstName');

        // This would typically be handled by a queue system for large broadcasts
        logger.info(`Broadcasting message to ${users.length} users`, {
            adminId: req.user.telegramId,
            target,
            messagePreview: message.substring(0, 100)
        });

        res.json({
            success: true,
            message: 'Broadcast initiated',
            targetUsers: users.length,
            broadcastId: Date.now() // In a real system, you'd return a proper broadcast ID
        });

    } catch (error) {
        logger.error('Error initiating broadcast:', error);
        res.status(500).json({
            error: 'Broadcast failed',
            message: 'Unable to initiate broadcast at this time'
        });
    }
});

// Get agricultural data management
router.get('/data/agricultural', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const dataType = req.query.type; // weather, market, crops, tips, news

        let query = {};
        let projection = {};

        // Filter by data type
        switch (dataType) {
            case 'weather':
                query['weather'] = { $exists: true };
                projection = { weather: 1, dataSource: 1, lastUpdated: 1 };
                break;
            case 'market':
                query['marketPrices'] = { $exists: true };
                projection = { marketPrices: 1, dataSource: 1, lastUpdated: 1 };
                break;
            case 'crops':
                query['crops'] = { $exists: true };
                projection = { crops: 1, dataSource: 1, lastUpdated: 1 };
                break;
            case 'tips':
                query['tips'] = { $exists: true };
                projection = { tips: 1, dataSource: 1, lastUpdated: 1 };
                break;
            case 'news':
                query['news'] = { $exists: true };
                projection = { news: 1, dataSource: 1, lastUpdated: 1 };
                break;
        }

        const data = await AgriculturalData.find(query, projection)
            .sort({ lastUpdated: -1 })
            .skip(skip)
            .limit(limit);

        const total = await AgriculturalData.countDocuments(query);

        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error getting agricultural data:', error);
        res.status(500).json({
            error: 'Data service unavailable',
            message: 'Unable to fetch agricultural data at this time'
        });
    }
});

// Delete old data (cleanup)
router.delete('/data/cleanup', async (req, res) => {
    try {
        const { days = 30, dataType } = req.body;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        let deleteQuery = { createdAt: { $lt: cutoffDate } };

        // Add data type filter if specified
        if (dataType === 'conversations') {
            const deleteResult = await Conversation.deleteMany(deleteQuery);
            res.json({
                success: true,
                message: `Cleaned up ${deleteResult.deletedCount} conversations older than ${days} days`
            });
        } else {
            const deleteResult = await AgriculturalData.deleteMany(deleteQuery);
            res.json({
                success: true,
                message: `Cleaned up ${deleteResult.deletedCount} agricultural data records older than ${days} days`
            });
        }

        logger.info(`Data cleanup performed by admin ${req.user.telegramId}`, {
            days,
            dataType,
            adminId: req.user.telegramId
        });

    } catch (error) {
        logger.error('Error cleaning up data:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            message: 'Unable to perform data cleanup at this time'
        });
    }
});

module.exports = router;
