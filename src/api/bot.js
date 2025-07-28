const express = require('express');
const router = express.Router();
const { telegramAuth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// Apply rate limiting
router.use(rateLimiter);

// Send message to bot (simulate bot interaction via API)
router.post('/message', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const { message, type = 'text' } = req.body;

        if (!message) {
            return res.status(400).json({
                error: 'Message required',
                message: 'Please provide a message to send to the bot'
            });
        }

        // Process message with AI service
        const aiResponse = await aiService.processMessage(message, user);

        // Create conversation record
        const conversation = new Conversation({
            userId: user.telegramId,
            chatId: user.telegramId, // Use user's telegram ID as chat ID for API
            messageId: Date.now(), // Generate unique message ID
            message: {
                text: message,
                type: type
            },
            botResponse: {
                text: aiResponse.text,
                type: aiResponse.keyboard ? 'inline_keyboard' : 'text',
                inlineKeyboard: aiResponse.keyboard
            },
            intent: aiResponse.intent,
            entities: aiResponse.entities,
            aiProcessing: {
                processed: true,
                confidence: aiResponse.confidence,
                processingTime: aiResponse.processingTime,
                model: aiResponse.model
            }
        });

        await conversation.save();

        // Update user interaction count
        await user.incrementMessageCount();

        res.json({
            success: true,
            response: {
                text: aiResponse.text,
                intent: aiResponse.intent,
                confidence: aiResponse.confidence,
                keyboard: aiResponse.keyboard,
                conversationId: conversation._id
            }
        });

    } catch (error) {
        logger.error('Error processing bot message:', error);
        res.status(500).json({
            error: 'Bot service unavailable',
            message: 'Unable to process message at this time'
        });
    }
});

// Get bot statistics for user
router.get('/stats', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
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

        // Get conversation statistics
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
                    averageResponseTime: { $avg: '$analytics.responseTime' },
                    averageConfidence: { $avg: '$aiProcessing.confidence' },
                    intentDistribution: {
                        $push: '$intent'
                    }
                }
            }
        ]);

        // Process intent distribution
        let intentCounts = {};
        if (conversationStats.length > 0 && conversationStats[0].intentDistribution) {
            conversationStats[0].intentDistribution.forEach(intent => {
                if (intent) {
                    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
                }
            });
        }

        // Get command usage
        const commandUsage = user.botData.commandsUsed
            .filter(cmd => cmd.lastUsed >= startDate)
            .sort((a, b) => b.count - a.count);

        const stats = {
            timeframe,
            overview: {
                totalMessages: user.botData.messageCount,
                totalConversations: conversationStats[0]?.totalConversations || 0,
                averageResponseTime: Math.round(conversationStats[0]?.averageResponseTime || 0),
                averageConfidence: Math.round((conversationStats[0]?.averageConfidence || 0) * 100),
                joinedDate: user.botData.joinedAt,
                lastInteraction: user.botData.lastInteraction
            },
            intents: intentCounts,
            commands: commandUsage,
            preferences: {
                language: user.botData.preferredLanguage,
                notifications: user.botData.notificationSettings
            }
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error getting bot stats:', error);
        res.status(500).json({
            error: 'Stats service unavailable',
            message: 'Unable to fetch bot statistics at this time'
        });
    }
});

// Get available bot commands
router.get('/commands', async (req, res) => {
    try {
        const commands = [
            {
                command: '/start',
                description: 'Start interacting with AgriBot',
                category: 'basic'
            },
            {
                command: '/help',
                description: 'Get help and available commands',
                category: 'basic'
            },
            {
                command: '/weather',
                description: 'Get weather forecast and agricultural insights',
                category: 'weather'
            },
            {
                command: '/market',
                description: 'Check market prices and trends',
                category: 'market'
            },
            {
                command: '/advice',
                description: 'Get agricultural advice and tips',
                category: 'agricultural'
            },
            {
                command: '/profile',
                description: 'View and edit your farming profile',
                category: 'profile'
            },
            {
                command: '/settings',
                description: 'Manage notification settings',
                category: 'settings'
            },
            {
                command: '/subscribe',
                description: 'Upgrade to premium subscription',
                category: 'subscription'
            },
            {
                command: '/feedback',
                description: 'Send feedback about the bot',
                category: 'support'
            }
        ];

        res.json({
            success: true,
            commands
        });

    } catch (error) {
        logger.error('Error getting bot commands:', error);
        res.status(500).json({
            error: 'Commands service unavailable',
            message: 'Unable to fetch bot commands at this time'
        });
    }
});

// Submit feedback
router.post('/feedback', telegramAuth, async (req, res) => {
    try {
        const user = req.user;
        const { rating, comment, category = 'general' } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                error: 'Invalid rating',
                message: 'Rating must be between 1 and 5'
            });
        }

        // Store feedback (you might want to create a Feedback model)
        const feedback = {
            userId: user.telegramId,
            rating: parseInt(rating),
            comment: comment || '',
            category,
            timestamp: new Date(),
            userInfo: {
                subscription: user.subscription.type,
                experience: user.profile?.experience,
                cropTypes: user.profile?.cropTypes
            }
        };

        logger.info('User feedback received:', feedback);

        // You could save this to a database or send to analytics service
        // await Feedback.create(feedback);

        res.json({
            success: true,
            message: 'Thank you for your feedback!',
            feedback: {
                rating: feedback.rating,
                category: feedback.category,
                timestamp: feedback.timestamp
            }
        });

    } catch (error) {
        logger.error('Error submitting feedback:', error);
        res.status(500).json({
            error: 'Feedback service unavailable',
            message: 'Unable to submit feedback at this time'
        });
    }
});

// Get bot capabilities
router.get('/capabilities', async (req, res) => {
    try {
        const capabilities = {
            ai: {
                intents: [
                    'greeting',
                    'weather_query',
                    'crop_advice',
                    'market_prices',
                    'pest_control',
                    'irrigation',
                    'fertilizer',
                    'disease_diagnosis',
                    'general_agriculture',
                    'help'
                ],
                languages: ['en', 'es', 'fr', 'de', 'hi', 'zh'],
                confidenceThreshold: 0.7
            },
            features: {
                weather: {
                    current: true,
                    forecast: true,
                    alerts: true,
                    agricultural_insights: true
                },
                market: {
                    prices: true,
                    trends: true,
                    news: true,
                    alerts: true
                },
                crops: {
                    information: true,
                    advice: true,
                    disease_diagnosis: true,
                    pest_management: true
                },
                notifications: {
                    scheduled: true,
                    alerts: true,
                    customizable: true
                }
            },
            integrations: {
                telegram: true,
                web_api: true,
                mini_app: true,
                webhooks: false
            },
            subscription_tiers: {
                free: {
                    daily_requests: 50,
                    features: ['basic_weather', 'basic_market', 'basic_advice']
                },
                premium: {
                    daily_requests: 200,
                    features: ['advanced_weather', 'market_trends', 'personalized_advice', 'priority_support']
                },
                pro: {
                    daily_requests: 500,
                    features: ['all_features', 'api_access', 'custom_integrations', 'dedicated_support']
                }
            }
        };

        res.json({
            success: true,
            capabilities
        });

    } catch (error) {
        logger.error('Error getting bot capabilities:', error);
        res.status(500).json({
            error: 'Capabilities service unavailable',
            message: 'Unable to fetch bot capabilities at this time'
        });
    }
});

// Test bot response (for debugging)
router.post('/test', telegramAuth, async (req, res) => {
    try {
        const { message, intent } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Message required',
                message: 'Please provide a test message'
            });
        }

        // Process with AI service
        const response = await aiService.processMessage(message, req.user);

        res.json({
            success: true,
            test: {
                input: message,
                expectedIntent: intent || null,
                detectedIntent: response.intent,
                confidence: response.confidence,
                response: response.text,
                processingTime: response.processingTime
            }
        });

    } catch (error) {
        logger.error('Error testing bot response:', error);
        res.status(500).json({
            error: 'Test service unavailable',
            message: 'Unable to test bot response at this time'
        });
    }
});

module.exports = router;
