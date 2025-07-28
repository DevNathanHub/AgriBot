const express = require('express');
const router = express.Router();
const { telegramAuth, optionalAuth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

// Apply authentication middleware to all user routes
router.use(rateLimiter);

// Get user profile
router.get('/profile', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        
        res.json({
            success: true,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                profile: user.profile,
                botData: {
                    joinedAt: user.botData.joinedAt,
                    lastInteraction: user.botData.lastInteraction,
                    messageCount: user.botData.messageCount,
                    preferredLanguage: user.botData.preferredLanguage,
                    notificationSettings: user.botData.notificationSettings
                },
                subscription: user.subscription,
                analytics: user.analytics
            }
        });

    } catch (error) {
        logger.error('Error getting user profile:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: 'Internal server error'
        });
    }
});

// Update user profile
router.put('/profile', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const updates = req.body;

        // Validate and update profile fields
        if (updates.profile) {
            if (updates.profile.farmSize !== undefined) {
                user.profile.farmSize = Math.max(0, parseFloat(updates.profile.farmSize));
            }
            
            if (updates.profile.cropTypes && Array.isArray(updates.profile.cropTypes)) {
                const validCrops = ['wheat', 'corn', 'rice', 'soybeans', 'cotton', 'vegetables', 'fruits', 'other'];
                user.profile.cropTypes = updates.profile.cropTypes.filter(crop => validCrops.includes(crop));
            }
            
            if (updates.profile.farmingType) {
                const validTypes = ['organic', 'conventional', 'hydroponic', 'mixed'];
                if (validTypes.includes(updates.profile.farmingType)) {
                    user.profile.farmingType = updates.profile.farmingType;
                }
            }
            
            if (updates.profile.experience) {
                const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
                if (validLevels.includes(updates.profile.experience)) {
                    user.profile.experience = updates.profile.experience;
                }
            }
            
            if (updates.profile.location) {
                if (updates.profile.location.country) {
                    user.profile.location.country = updates.profile.location.country;
                }
                if (updates.profile.location.state) {
                    user.profile.location.state = updates.profile.location.state;
                }
                if (updates.profile.location.city) {
                    user.profile.location.city = updates.profile.location.city;
                }
                if (updates.profile.location.coordinates) {
                    user.profile.location.coordinates = {
                        latitude: parseFloat(updates.profile.location.coordinates.latitude),
                        longitude: parseFloat(updates.profile.location.coordinates.longitude)
                    };
                }
            }
            
            if (updates.profile.interests && Array.isArray(updates.profile.interests)) {
                const validInterests = ['weather', 'market_prices', 'pest_control', 'fertilizers', 'irrigation', 'technology', 'sustainability'];
                user.profile.interests = updates.profile.interests.filter(interest => validInterests.includes(interest));
            }
        }

        // Update notification settings
        if (updates.notificationSettings) {
            Object.keys(updates.notificationSettings).forEach(key => {
                if (user.botData.notificationSettings.hasOwnProperty(key)) {
                    user.botData.notificationSettings[key] = Boolean(updates.notificationSettings[key]);
                }
            });
        }

        // Update preferred language
        if (updates.preferredLanguage) {
            user.botData.preferredLanguage = updates.preferredLanguage;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                profile: user.profile,
                botData: {
                    notificationSettings: user.botData.notificationSettings,
                    preferredLanguage: user.botData.preferredLanguage
                }
            }
        });

    } catch (error) {
        logger.error('Error updating user profile:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: 'Internal server error'
        });
    }
});

// Get user conversation history
router.get('/conversations', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const conversations = await Conversation.find({ userId: user.telegramId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('message botResponse intent createdAt analytics');

        const total = await Conversation.countDocuments({ userId: user.telegramId });

        res.json({
            success: true,
            conversations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error getting conversation history:', error);
        res.status(500).json({
            error: 'Failed to get conversations',
            message: 'Internal server error'
        });
    }
});

// Get user analytics
router.get('/analytics', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d, 1y
        
        let startDate;
        switch (timeframe) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get conversation analytics
        const conversationStats = await Conversation.aggregate([
            {
                $match: {
                    userId: user.telegramId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalConversations: { $sum: 1 },
                    avgResponseTime: { $avg: '$analytics.responseTime' },
                    avgSatisfaction: { $avg: '$analytics.userSatisfaction' },
                    intents: { $push: '$intent' }
                }
            }
        ]);

        // Get command usage
        const commandUsage = user.botData.commandsUsed
            .filter(cmd => cmd.lastUsed >= startDate)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate engagement metrics
        const engagementMetrics = {
            totalSessions: user.analytics.totalSessions,
            averageSessionDuration: user.analytics.averageSessionDuration,
            lastActiveTime: user.analytics.lastActiveTime,
            messageCount: user.botData.messageCount,
            favoriteFeatures: user.analytics.favoriteFeatures.slice(0, 5)
        };

        res.json({
            success: true,
            timeframe,
            analytics: {
                conversations: conversationStats[0] || {
                    totalConversations: 0,
                    avgResponseTime: 0,
                    avgSatisfaction: 0,
                    intents: []
                },
                commands: commandUsage,
                engagement: engagementMetrics
            }
        });

    } catch (error) {
        logger.error('Error getting user analytics:', error);
        res.status(500).json({
            error: 'Failed to get analytics',
            message: 'Internal server error'
        });
    }
});

// Update notification settings
router.put('/notifications', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const { weather, marketPrices, tips, alerts } = req.body;

        // Update notification settings
        if (weather !== undefined) {
            user.botData.notificationSettings.weather = Boolean(weather);
        }
        if (marketPrices !== undefined) {
            user.botData.notificationSettings.marketPrices = Boolean(marketPrices);
        }
        if (tips !== undefined) {
            user.botData.notificationSettings.tips = Boolean(tips);
        }
        if (alerts !== undefined) {
            user.botData.notificationSettings.alerts = Boolean(alerts);
        }

        await user.save();

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            settings: user.botData.notificationSettings
        });

    } catch (error) {
        logger.error('Error updating notification settings:', error);
        res.status(500).json({
            error: 'Failed to update notifications',
            message: 'Internal server error'
        });
    }
});

// Get user preferences
router.get('/preferences', telegramAuth, async (req, res) => {
    try {
        const user = req.user;

        res.json({
            success: true,
            preferences: {
                language: user.botData.preferredLanguage,
                notifications: user.botData.notificationSettings,
                interests: user.profile?.interests || [],
                cropTypes: user.profile?.cropTypes || [],
                location: user.profile?.location || null
            }
        });

    } catch (error) {
        logger.error('Error getting user preferences:', error);
        res.status(500).json({
            error: 'Failed to get preferences',
            message: 'Internal server error'
        });
    }
});

// Update user preferences
router.put('/preferences', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const { language, interests, cropTypes } = req.body;

        if (language) {
            user.botData.preferredLanguage = language;
        }

        if (interests && Array.isArray(interests)) {
            const validInterests = ['weather', 'market_prices', 'pest_control', 'fertilizers', 'irrigation', 'technology', 'sustainability'];
            user.profile.interests = interests.filter(interest => validInterests.includes(interest));
        }

        if (cropTypes && Array.isArray(cropTypes)) {
            const validCrops = ['wheat', 'corn', 'rice', 'soybeans', 'cotton', 'vegetables', 'fruits', 'other'];
            user.profile.cropTypes = cropTypes.filter(crop => validCrops.includes(crop));
        }

        await user.save();

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: {
                language: user.botData.preferredLanguage,
                interests: user.profile.interests,
                cropTypes: user.profile.cropTypes
            }
        });

    } catch (error) {
        logger.error('Error updating user preferences:', error);
        res.status(500).json({
            error: 'Failed to update preferences',
            message: 'Internal server error'
        });
    }
});

// Delete user account
router.delete('/account', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const { confirmPassword } = req.body;

        // For additional security, you might want to require password confirmation
        // or send a confirmation email/message

        // Delete user's conversations
        await Conversation.deleteMany({ userId: user.telegramId });

        // Delete user account
        await User.findByIdAndDelete(user._id);

        logger.info(`User account deleted: ${user.telegramId}`);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting user account:', error);
        res.status(500).json({
            error: 'Failed to delete account',
            message: 'Internal server error'
        });
    }
});

// Export user data (GDPR compliance)
router.get('/export', telegramAuth, async (req, res) => {
    try {
        const user = req.user;

        // Get all user conversations
        const conversations = await Conversation.find({ userId: user.telegramId })
            .sort({ createdAt: -1 });

        // Prepare export data
        const exportData = {
            exportDate: new Date().toISOString(),
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                profile: user.profile,
                botData: user.botData,
                analytics: user.analytics,
                subscription: user.subscription
            },
            conversations: conversations.map(conv => ({
                date: conv.createdAt,
                message: conv.message,
                botResponse: conv.botResponse,
                intent: conv.intent
            }))
        };

        res.setHeader('Content-Disposition', `attachment; filename="agribot-data-${user.telegramId}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);

    } catch (error) {
        logger.error('Error exporting user data:', error);
        res.status(500).json({
            error: 'Failed to export data',
            message: 'Internal server error'
        });
    }
});

module.exports = router;
