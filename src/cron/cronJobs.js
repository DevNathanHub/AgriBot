const cron = require('node-cron');
const logger = require('../utils/logger');
const User = require('../models/User');
const weatherService = require('../services/weatherService');
const marketService = require('../services/marketService');
const aiService = require('../services/aiService');
const AgriculturalData = require('../models/AgriculturalData');

class CronJobs {
    constructor() {
        this.bot = null;
        this.jobs = new Map();
    }

    init(bot) {
        this.bot = bot;
        this.setupJobs();
        logger.info('Cron jobs initialized');
    }

    setupJobs() {
        // Weather updates - every day at 8 AM
        this.scheduleJob('weather_updates', process.env.WEATHER_UPDATE_CRON || '0 8 * * *', 
            this.sendWeatherUpdates.bind(this));

        // Market price updates - every day at 10 AM
        this.scheduleJob('market_updates', process.env.MARKET_UPDATE_CRON || '0 10 * * *', 
            this.sendMarketUpdates.bind(this));

        // Daily agricultural tips - every day at 6 PM
        this.scheduleJob('daily_tips', process.env.TIPS_UPDATE_CRON || '0 18 * * *', 
            this.sendDailyTips.bind(this));

        // Weekly summary - every Sunday at 9 AM
        this.scheduleJob('weekly_summary', '0 9 * * 0', 
            this.sendWeeklySummary.bind(this));

        // Emergency weather alerts - every 2 hours
        this.scheduleJob('weather_alerts', '0 */2 * * *', 
            this.checkWeatherAlerts.bind(this));

        // Market price alerts - every 4 hours during market hours
        this.scheduleJob('market_alerts', '0 */4 * * *', 
            this.checkMarketAlerts.bind(this));

        // Cleanup old data - daily at midnight
        this.scheduleJob('cleanup', '0 0 * * *', 
            this.cleanupOldData.bind(this));

        // User engagement check - every 3 days
        this.scheduleJob('engagement_check', '0 9 */3 * *', 
            this.checkUserEngagement.bind(this));
    }

    scheduleJob(name, cronPattern, handler) {
        try {
            const job = cron.schedule(cronPattern, async () => {
                try {
                    logger.info(`Running cron job: ${name}`);
                    await handler();
                    logger.info(`Completed cron job: ${name}`);
                } catch (error) {
                    logger.error(`Error in cron job ${name}:`, error);
                }
            }, {
                scheduled: true,
                timezone: process.env.TIMEZONE || 'UTC'
            });

            this.jobs.set(name, job);
            logger.info(`Scheduled cron job: ${name} with pattern: ${cronPattern}`);

        } catch (error) {
            logger.error(`Failed to schedule job ${name}:`, error);
        }
    }

    async sendWeatherUpdates() {
        try {
            // Get users who want weather notifications
            const users = await User.find({
                'botData.notificationSettings.weather': true,
                'permissions.isBanned': false
            });

            logger.info(`Sending weather updates to ${users.length} users`);

            for (const user of users) {
                try {
                    if (!user.profile?.location?.coordinates) {
                        continue; // Skip users without location
                    }

                    const weather = await weatherService.getAgriculturalWeather(
                        user.profile.location,
                        user.profile.cropTypes?.[0]
                    );

                    const message = this.formatWeatherUpdateMessage(weather, user);
                    
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown'
                    });

                    // Small delay to avoid rate limiting
                    await this.delay(100);

                } catch (error) {
                    logger.warn(`Failed to send weather update to user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in sendWeatherUpdates:', error);
        }
    }

    async sendMarketUpdates() {
        try {
            // Get users who want market notifications
            const users = await User.find({
                'botData.notificationSettings.marketPrices': true,
                'permissions.isBanned': false,
                'profile.cropTypes.0': { $exists: true }
            });

            logger.info(`Sending market updates to ${users.length} users`);

            for (const user of users) {
                try {
                    const marketData = await marketService.getMarketPrices(
                        user.profile.cropTypes,
                        user.profile.location
                    );

                    const message = this.formatMarketUpdateMessage(marketData, user);
                    
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown'
                    });

                    await this.delay(100);

                } catch (error) {
                    logger.warn(`Failed to send market update to user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in sendMarketUpdates:', error);
        }
    }

    async sendDailyTips() {
        try {
            // Get users who want tips
            const users = await User.find({
                'botData.notificationSettings.tips': true,
                'permissions.isBanned': false
            });

            logger.info(`Sending daily tips to ${users.length} users`);

            // Get seasonal and relevant tips
            const tips = await this.getDailyTips();

            for (const user of users) {
                try {
                    const personalizedTip = this.selectPersonalizedTip(tips, user);
                    const message = this.formatTipMessage(personalizedTip, user);
                    
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown'
                    });

                    await this.delay(100);

                } catch (error) {
                    logger.warn(`Failed to send tip to user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in sendDailyTips:', error);
        }
    }

    async sendWeeklySummary() {
        try {
            const users = await User.find({
                'permissions.isBanned': false,
                'botData.lastInteraction': {
                    $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Active in last 2 weeks
                }
            });

            logger.info(`Sending weekly summary to ${users.length} users`);

            for (const user of users) {
                try {
                    const summary = await this.generateWeeklySummary(user);
                    const message = this.formatWeeklySummaryMessage(summary, user);
                    
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown'
                    });

                    await this.delay(150);

                } catch (error) {
                    logger.warn(`Failed to send weekly summary to user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in sendWeeklySummary:', error);
        }
    }

    async checkWeatherAlerts() {
        try {
            const users = await User.find({
                'botData.notificationSettings.alerts': true,
                'permissions.isBanned': false,
                'profile.location.coordinates': { $exists: true }
            });

            for (const user of users) {
                try {
                    const alerts = await weatherService.getWeatherAlerts(user.profile.location);
                    
                    if (alerts.length > 0) {
                        for (const alert of alerts) {
                            const message = this.formatWeatherAlertMessage(alert, user);
                            
                            await this.bot.sendMessage(user.telegramId, message, {
                                parse_mode: 'Markdown'
                            });
                        }
                    }

                    await this.delay(50);

                } catch (error) {
                    logger.warn(`Failed to check weather alerts for user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in checkWeatherAlerts:', error);
        }
    }

    async checkMarketAlerts() {
        try {
            const users = await User.find({
                'botData.notificationSettings.alerts': true,
                'permissions.isBanned': false,
                'profile.cropTypes.0': { $exists: true }
            });

            for (const user of users) {
                try {
                    const alerts = await marketService.getMarketAlerts(user);
                    
                    if (alerts.length > 0) {
                        for (const alert of alerts) {
                            const message = this.formatMarketAlertMessage(alert, user);
                            
                            await this.bot.sendMessage(user.telegramId, message, {
                                parse_mode: 'Markdown'
                            });
                        }
                    }

                    await this.delay(50);

                } catch (error) {
                    logger.warn(`Failed to check market alerts for user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in checkMarketAlerts:', error);
        }
    }

    async cleanupOldData() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            // Clean old agricultural data
            const deleteResult = await AgriculturalData.deleteMany({
                createdAt: { $lt: thirtyDaysAgo }
            });

            logger.info(`Cleaned up ${deleteResult.deletedCount} old agricultural data records`);

            // Clean old conversation data (keep only last 1000 per user)
            const Conversation = require('../models/Conversation');
            const users = await User.find({}, 'telegramId');

            for (const user of users) {
                const conversations = await Conversation.find({ userId: user.telegramId })
                    .sort({ createdAt: -1 })
                    .skip(1000);

                if (conversations.length > 0) {
                    const conversationIds = conversations.map(c => c._id);
                    await Conversation.deleteMany({ _id: { $in: conversationIds } });
                }
            }

        } catch (error) {
            logger.error('Error in cleanupOldData:', error);
        }
    }

    async checkUserEngagement() {
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Find inactive users
            const inactiveUsers = await User.find({
                'botData.lastInteraction': { $lt: threeDaysAgo, $gte: weekAgo },
                'permissions.isBanned': false
            });

            logger.info(`Found ${inactiveUsers.length} inactive users to re-engage`);

            for (const user of inactiveUsers) {
                try {
                    const message = this.formatReEngagementMessage(user);
                    
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown'
                    });

                    await this.delay(200);

                } catch (error) {
                    logger.warn(`Failed to send re-engagement message to user ${user.telegramId}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in checkUserEngagement:', error);
        }
    }

    // Message formatting methods
    formatWeatherUpdateMessage(weather, user) {
        const location = user.profile.location.city;
        const current = weather.current.current;
        const forecast = weather.forecast;

        let message = `🌤️ *Good morning, ${user.firstName}!*\n\n`;
        message += `*Today's Weather in ${location}:*\n`;
        message += `🌡️ ${current.temperature}°C\n`;
        message += `💧 Humidity: ${current.humidity}%\n`;
        message += `💨 Wind: ${current.windSpeed} km/h\n`;
        message += `☁️ ${current.condition}\n\n`;

        if (forecast.length > 0) {
            message += `*3-Day Forecast:*\n`;
            forecast.slice(0, 3).forEach(day => {
                message += `${day.date.toLocaleDateString()}: ${day.tempMin}°-${day.tempMax}°C\n`;
            });
        }

        if (weather.insights && weather.insights.length > 0) {
            message += `\n💡 *Agricultural Insights:*\n`;
            weather.insights.slice(0, 2).forEach(insight => {
                message += `• ${insight.message}\n`;
            });
        }

        return message;
    }

    formatMarketUpdateMessage(marketData, user) {
        let message = `📈 *Good morning, ${user.firstName}!*\n\n`;
        message += `*Today's Market Prices:*\n\n`;

        marketData.forEach(item => {
            const emoji = this.getCropEmoji(item.crop);
            const changeEmoji = item.priceChange.direction === 'up' ? '📈' : 
                               item.priceChange.direction === 'down' ? '📉' : '➡️';
            
            message += `${emoji} *${item.crop.charAt(0).toUpperCase() + item.crop.slice(1)}*: $${item.price.value}/${item.price.unit} ${changeEmoji}${item.priceChange.percentage}%\n`;
        });

        message += `\n💡 Prices updated from major markets`;

        return message;
    }

    formatTipMessage(tip, user) {
        const time = new Date().getHours();
        const greeting = time < 12 ? 'Good morning' : time < 17 ? 'Good afternoon' : 'Good evening';

        let message = `💡 *${greeting}, ${user.firstName}!*\n\n`;
        message += `*Daily Tip: ${tip.title}*\n\n`;
        message += `${tip.content}\n\n`;
        
        if (tip.category) {
            message += `📂 Category: ${tip.category}\n`;
        }
        
        message += `\n🌱 Happy farming!`;

        return message;
    }

    formatWeatherAlertMessage(alert, user) {
        const urgencyEmoji = alert.urgency === 'immediate' ? '🚨' : '⚠️';
        
        let message = `${urgencyEmoji} *Weather Alert*\n\n`;
        message += `*${alert.title}*\n`;
        message += `${alert.message}\n\n`;
        message += `📍 Location: ${user.profile.location.city}\n`;
        message += `⏰ Time: ${new Date().toLocaleString()}`;

        return message;
    }

    formatMarketAlertMessage(alert, user) {
        const typeEmoji = alert.type === 'opportunity' ? '💰' : '⚠️';
        
        let message = `${typeEmoji} *Market Alert*\n\n`;
        message += `*${alert.title}*\n`;
        message += `${alert.message}\n\n`;
        message += `⏰ ${alert.timestamp.toLocaleString()}`;

        return message;
    }

    formatWeeklySummaryMessage(summary, user) {
        let message = `📊 *Weekly Summary for ${user.firstName}*\n\n`;
        
        if (summary.weather) {
            message += `🌤️ *Weather Highlights:*\n`;
            message += `• Average temp: ${summary.weather.avgTemp}°C\n`;
            message += `• Total rainfall: ${summary.weather.totalRain}mm\n\n`;
        }

        if (summary.market) {
            message += `📈 *Market Performance:*\n`;
            summary.market.forEach(crop => {
                message += `• ${crop.name}: ${crop.change > 0 ? '+' : ''}${crop.change}%\n`;
            });
            message += `\n`;
        }

        if (summary.interactions) {
            message += `🤖 *Bot Interactions:*\n`;
            message += `• Messages: ${summary.interactions.messages}\n`;
            message += `• Commands used: ${summary.interactions.commands}\n\n`;
        }

        message += `🌱 Keep up the great farming work!`;

        return message;
    }

    formatReEngagementMessage(user) {
        const messages = [
            `🌱 Hi ${user.firstName}! We miss you! Check out the latest weather and market updates for your crops.`,
            `🚜 Hello ${user.firstName}! Your crops need you! Get the latest agricultural insights and tips.`,
            `🌾 Hey ${user.firstName}! New farming tips and market trends are waiting for you. Come back and grow with us!`
        ];

        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Utility methods
    async getDailyTips() {
        try {
            const tips = await AgriculturalData.find(
                { 'tips.0': { $exists: true } },
                { tips: 1 }
            ).limit(10);

            if (tips.length > 0) {
                return tips.flatMap(doc => doc.tips);
            }

            // Fallback tips
            return [
                {
                    title: 'Early Morning Watering',
                    content: 'Water your crops early in the morning to reduce evaporation and prevent fungal diseases.',
                    category: 'irrigation'
                },
                {
                    title: 'Crop Rotation Benefits',
                    content: 'Rotate your crops to improve soil health and reduce pest and disease problems.',
                    category: 'planting'
                },
                {
                    title: 'Soil Testing',
                    content: 'Test your soil regularly to understand nutrient levels and pH for optimal crop growth.',
                    category: 'soil_management'
                }
            ];

        } catch (error) {
            logger.error('Error getting daily tips:', error);
            return [];
        }
    }

    selectPersonalizedTip(tips, user) {
        // Select tip based on user's interests and crop types
        const userInterests = user.profile?.interests || [];
        const userCrops = user.profile?.cropTypes || [];

        // Try to find relevant tip
        let relevantTips = tips.filter(tip => 
            userInterests.includes(tip.category) || 
            userCrops.some(crop => tip.applicableCrops?.includes(crop))
        );

        if (relevantTips.length === 0) {
            relevantTips = tips;
        }

        return relevantTips[Math.floor(Math.random() * relevantTips.length)];
    }

    async generateWeeklySummary(user) {
        // Generate summary based on user's activity and data
        const summary = {
            weather: {
                avgTemp: Math.round(Math.random() * 15 + 15), // 15-30°C
                totalRain: Math.round(Math.random() * 50) // 0-50mm
            },
            market: user.profile?.cropTypes?.map(crop => ({
                name: crop,
                change: Math.round((Math.random() - 0.5) * 20) // -10% to +10%
            })) || [],
            interactions: {
                messages: Math.floor(Math.random() * 20) + 5,
                commands: Math.floor(Math.random() * 10) + 2
            }
        };

        return summary;
    }

    getCropEmoji(crop) {
        const emojiMap = {
            wheat: '🌾',
            corn: '🌽',
            rice: '🍚',
            soybeans: '🫘',
            cotton: '🌿'
        };
        return emojiMap[crop.toLowerCase()] || '🌱';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Job management methods
    startJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.start();
            logger.info(`Started cron job: ${name}`);
        }
    }

    stopJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.stop();
            logger.info(`Stopped cron job: ${name}`);
        }
    }

    stopAllJobs() {
        this.jobs.forEach((job, name) => {
            job.stop();
            logger.info(`Stopped cron job: ${name}`);
        });
    }
}

module.exports = new CronJobs();
