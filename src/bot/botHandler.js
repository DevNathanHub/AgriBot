const User = require('../models/User');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const weatherService = require('../services/weatherService');
const marketService = require('../services/marketService');
const { generateInlineKeyboard, generateReplyKeyboard } = require('../utils/keyboards');

class BotHandler {
    constructor() {
        this.bot = null;
        this.commandHandlers = new Map();
        this.callbackHandlers = new Map();
        this.init();
    }

    init() {
        this.setupCommandHandlers();
        this.setupCallbackHandlers();
    }

    setBot(bot) {
        this.bot = bot;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle all messages
        this.bot.on('message', this.handleMessage.bind(this));
        
        // Handle callback queries (inline keyboard buttons)
        this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
        
        // Handle errors
        this.bot.on('polling_error', (error) => {
            logger.error('Polling error:', error);
        });

        logger.info('Bot event listeners set up successfully');
    }

    setupCommandHandlers() {
        this.commandHandlers.set('/start', this.handleStart.bind(this));
        this.commandHandlers.set('/help', this.handleHelp.bind(this));
        this.commandHandlers.set('/weather', this.handleWeather.bind(this));
        this.commandHandlers.set('/market', this.handleMarket.bind(this));
        this.commandHandlers.set('/news', this.handleNews.bind(this));
        this.commandHandlers.set('/advice', this.handleAdvice.bind(this));
        this.commandHandlers.set('/profile', this.handleProfile.bind(this));
        this.commandHandlers.set('/settings', this.handleSettings.bind(this));
        this.commandHandlers.set('/subscribe', this.handleSubscribe.bind(this));
        this.commandHandlers.set('/feedback', this.handleFeedback.bind(this));
    }

    setupCallbackHandlers() {
        this.callbackHandlers.set('setup_profile', this.handleSetupProfile.bind(this));
        this.callbackHandlers.set('toggle_notifications', this.handleToggleNotifications.bind(this));
        this.callbackHandlers.set('select_crops', this.handleSelectCrops.bind(this));
        this.callbackHandlers.set('weather_location', this.handleWeatherLocation.bind(this));
        this.callbackHandlers.set('market_crop', this.handleMarketCrop.bind(this));
        this.callbackHandlers.set('news_crops', this.handleNewsCategory.bind(this, 'crops'));
        this.callbackHandlers.set('news_market', this.handleNewsCategory.bind(this, 'market'));
        this.callbackHandlers.set('news_technology', this.handleNewsCategory.bind(this, 'technology'));
        this.callbackHandlers.set('news_sustainability', this.handleNewsCategory.bind(this, 'sustainability'));
        this.callbackHandlers.set('news_general', this.handleNewsCategory.bind(this, 'general'));
        this.callbackHandlers.set('news_refresh', this.handleNewsRefresh.bind(this));
    }

    async handleMessage(msg) {
        try {
            const startTime = Date.now();
            
            // Get or create user
            const user = await this.getOrCreateUser(msg.from);
            
            // Track interaction
            await user.incrementMessageCount();
            
            // Log conversation
            const conversation = new Conversation({
                userId: msg.from.id,
                chatId: msg.chat.id,
                messageId: msg.message_id,
                message: {
                    text: msg.text || msg.caption || '',
                    type: this.getMessageType(msg)
                }
            });

            // Handle commands
            if (msg.text && msg.text.startsWith('/')) {
                const command = msg.text.split(' ')[0];
                if (this.commandHandlers.has(command)) {
                    await user.trackCommand(command);
                    await this.commandHandlers.get(command)(msg, user);
                } else {
                    await this.handleUnknownCommand(msg, user);
                }
            } else {
                // Handle regular messages with AI
                await this.handleAIResponse(msg, user);
            }

            // Calculate response time
            const responseTime = Date.now() - startTime;
            conversation.analytics.responseTime = responseTime;
            await conversation.save();

        } catch (error) {
            logger.error('Error handling message:', error);
            await this.bot.sendMessage(msg.chat.id, 
                'Sorry, I encountered an error processing your message. Please try again.');
        }
    }

    async handleCallbackQuery(query) {
        try {
            const action = query.data.split(':')[0];
            
            if (this.callbackHandlers.has(action)) {
                await this.callbackHandlers.get(action)(query);
            }
            
            // Answer callback query to remove loading state
            await this.bot.answerCallbackQuery(query.id);
            
        } catch (error) {
            logger.error('Error handling callback query:', error);
            await this.bot.answerCallbackQuery(query.id, {
                text: 'Sorry, something went wrong!',
                show_alert: true
            });
        }
    }

    // Command Handlers
    async handleStart(msg, user) {
        const welcomeMessage = `
🌱 *Welcome to AgriBot!* 

Hi ${user.firstName}! I'm your intelligent agricultural assistant. I can help you with:

🌤️ Weather forecasts and alerts
📈 Market prices and trends  
🌾 Crop advice and best practices
🐛 Pest and disease management
💧 Irrigation guidance
🌿 Sustainable farming tips

Let's start by setting up your profile for personalized assistance!
        `;

        const keyboard = generateInlineKeyboard([
            [{ text: '🔧 Set Up Profile', callback_data: 'setup_profile' }],
            [{ text: '☁️ Get Weather', callback_data: 'weather' }],
            [{ text: '📊 Market Prices', callback_data: 'market' }],
            [{ text: '❓ Help', callback_data: 'help' }]
        ]);

        await this.bot.sendMessage(msg.chat.id, welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleHelp(msg, user) {
        const helpMessage = `
🤖 *AgriBot Help Guide*

*Available Commands:*
/start - Get started with AgriBot
/weather - Get weather forecast
/market - Check market prices
/news - Latest agricultural news
/advice - Get agricultural advice
/profile - View/edit your profile
/settings - Notification settings
/subscribe - Upgrade subscription
/feedback - Send feedback

*Features:*
🌤️ Real-time weather data
📈 Live market prices
📰 Latest agricultural news
🌾 Crop-specific advice
🤖 AI-powered assistance
📱 Telegram mini-app integration
⏰ Scheduled updates

*Getting Started:*
1. Set up your profile (/profile)
2. Enable notifications (/settings)
3. Ask me anything about farming!

Need specific help? Just type your question naturally!
        `;

        await this.bot.sendMessage(msg.chat.id, helpMessage, {
            parse_mode: 'Markdown'
        });
    }

    async handleWeather(msg, user) {
        try {
            let location = user.profile?.location;
            
            if (!location?.coordinates) {
                const keyboard = generateInlineKeyboard([
                    [{ text: '📍 Share Location', callback_data: 'weather_location' }],
                    [{ text: '⌨️ Enter City', callback_data: 'weather_city' }]
                ]);
                
                await this.bot.sendMessage(msg.chat.id, 
                    'I need your location to provide accurate weather information.', {
                        reply_markup: keyboard
                    });
                return;
            }

            // Get weather data
            const weatherData = await weatherService.getCurrentWeather(location);
            const forecast = await weatherService.getForecast(location, 5);

            const weatherMessage = this.formatWeatherMessage(weatherData, forecast);
            
            await this.bot.sendMessage(msg.chat.id, weatherMessage, {
                parse_mode: 'Markdown'
            });

        } catch (error) {
            logger.error('Error getting weather:', error);
            await this.bot.sendMessage(msg.chat.id, 
                'Sorry, I couldn\'t get weather information right now. Please try again later.');
        }
    }

    async handleMarket(msg, user) {
        try {
            const crops = user.profile?.cropTypes || ['wheat', 'corn', 'rice', 'soybeans'];
            const location = user.profile?.location;

            const marketData = await marketService.getMarketPrices(crops, location);
            const message = this.formatMarketMessage(marketData);

            const keyboard = generateInlineKeyboard([
                [{ text: '🌾 Wheat', callback_data: 'market_crop:wheat' }],
                [{ text: '🌽 Corn', callback_data: 'market_crop:corn' }],
                [{ text: '🍚 Rice', callback_data: 'market_crop:rice' }],
                [{ text: '🫘 Soybeans', callback_data: 'market_crop:soybeans' }]
            ]);

            await this.bot.sendMessage(msg.chat.id, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            logger.error('Error getting market data:', error);
            await this.bot.sendMessage(msg.chat.id, 
                'Sorry, I couldn\'t get market information right now. Please try again later.');
        }
    }

    async handleNews(msg, user) {
        try {
            const newsService = require('../services/newsService');
            
            await this.bot.sendMessage(msg.chat.id, '📰 Fetching latest agricultural news...');
            
            const newsResult = await newsService.getLatestAgriculturalNews();
            
            if (newsResult.success && newsResult.articles.length > 0) {
                const formattedNews = newsService.formatNewsForTelegram(newsResult.articles, 5);
                
                const keyboard = this.keyboardGenerator.generateInlineKeyboard([
                    [
                        { text: '🌾 Crop News', callback_data: 'news_crops' },
                        { text: '💰 Market News', callback_data: 'news_market' }
                    ],
                    [
                        { text: '🔬 Tech News', callback_data: 'news_technology' },
                        { text: '🌱 Sustainability', callback_data: 'news_sustainability' }
                    ],
                    [
                        { text: '🔄 Refresh', callback_data: 'news_refresh' },
                        { text: '🏠 Menu', callback_data: 'main_menu' }
                    ]
                ]);

                await this.bot.sendMessage(msg.chat.id, formattedNews, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard,
                    disable_web_page_preview: true
                });
            } else {
                await this.bot.sendMessage(msg.chat.id, 
                    `📰 *Agricultural News*\n\nSorry, I couldn't fetch the latest news right now. ${newsResult.error || 'Please try again later.'}\n\nYou can still ask me about:\n• Crop advice\n• Weather updates\n• Market prices\n• Farming techniques`,
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            logger.error('Error getting news:', error);
            await this.bot.sendMessage(msg.chat.id, 
                'Sorry, I couldn\'t get the latest agricultural news right now. Please try again later.');
        }
    }

    async handleAdvice(msg, user) {
        const adviceMessage = `
🌱 *Agricultural Advice*

What would you like advice about?

Select a category or ask me directly:
        `;

        const keyboard = generateInlineKeyboard([
            [
                { text: '🌾 Crops', callback_data: 'advice:crops' },
                { text: '🐛 Pests', callback_data: 'advice:pests' }
            ],
            [
                { text: '💧 Irrigation', callback_data: 'advice:irrigation' },
                { text: '🌿 Fertilizers', callback_data: 'advice:fertilizers' }
            ],
            [
                { text: '🌱 Planting', callback_data: 'advice:planting' },
                { text: '🌾 Harvesting', callback_data: 'advice:harvesting' }
            ]
        ]);

        await this.bot.sendMessage(msg.chat.id, adviceMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleProfile(msg, user) {
        const profileMessage = this.formatProfileMessage(user);
        
        const keyboard = generateInlineKeyboard([
            [{ text: '✏️ Edit Profile', callback_data: 'edit_profile' }],
            [{ text: '🌾 Update Crops', callback_data: 'select_crops' }],
            [{ text: '📍 Update Location', callback_data: 'update_location' }]
        ]);

        await this.bot.sendMessage(msg.chat.id, profileMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleSettings(msg, user) {
        const settingsMessage = this.formatSettingsMessage(user);
        
        const keyboard = generateInlineKeyboard([
            [{ text: '🔔 Toggle Notifications', callback_data: 'toggle_notifications' }],
            [{ text: '🌐 Language', callback_data: 'change_language' }],
            [{ text: '⏰ Update Times', callback_data: 'update_times' }]
        ]);

        await this.bot.sendMessage(msg.chat.id, settingsMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async handleAIResponse(msg, user) {
        try {
            // Show typing indicator
            await this.bot.sendChatAction(msg.chat.id, 'typing');

            // Get AI response
            const response = await aiService.processMessage(msg.text, user);
            
            // Send response
            await this.bot.sendMessage(msg.chat.id, response.text, {
                parse_mode: 'Markdown',
                reply_markup: response.keyboard
            });

            // Log conversation with AI data
            const conversation = new Conversation({
                userId: msg.from.id,
                chatId: msg.chat.id,
                messageId: msg.message_id,
                message: {
                    text: msg.text,
                    type: 'text'
                },
                botResponse: {
                    text: response.text,
                    type: response.keyboard ? 'inline_keyboard' : 'text'
                },
                intent: response.intent,
                entities: response.entities,
                aiProcessing: {
                    processed: true,
                    confidence: response.confidence,
                    model: response.model
                }
            });
            
            await conversation.save();

        } catch (error) {
            logger.error('Error processing AI response:', error);
            await this.bot.sendMessage(msg.chat.id, 
                'I\'m having trouble understanding your message. Could you please rephrase it?');
        }
    }

    // Utility Methods
    async getOrCreateUser(telegramUser) {
        try {
            let user = await User.findOne({ telegramId: telegramUser.id });
            
            if (!user) {
                user = new User({
                    telegramId: telegramUser.id,
                    username: telegramUser.username,
                    firstName: telegramUser.first_name,
                    lastName: telegramUser.last_name,
                    languageCode: telegramUser.language_code,
                    isBot: telegramUser.is_bot || false,
                    isPremium: telegramUser.is_premium || false
                });
                
                await user.save();
                logger.info(`New user created: ${telegramUser.id}`);
            } else {
                // Update user info if changed
                let updated = false;
                if (user.username !== telegramUser.username) {
                    user.username = telegramUser.username;
                    updated = true;
                }
                if (user.firstName !== telegramUser.first_name) {
                    user.firstName = telegramUser.first_name;
                    updated = true;
                }
                if (updated) {
                    await user.save();
                }
            }
            
            return user;
        } catch (error) {
            logger.error('Error getting/creating user:', error);
            throw error;
        }
    }

    getMessageType(msg) {
        if (msg.photo) return 'photo';
        if (msg.document) return 'document';
        if (msg.voice) return 'voice';
        if (msg.video) return 'video';
        if (msg.location) return 'location';
        if (msg.contact) return 'contact';
        if (msg.sticker) return 'sticker';
        return 'text';
    }

    formatWeatherMessage(current, forecast) {
        return `
🌤️ *Current Weather*

📍 ${current.location.city}, ${current.location.state}
🌡️ Temperature: ${current.current.temperature}°C
💧 Humidity: ${current.current.humidity}%
💨 Wind: ${current.current.windSpeed} km/h
☁️ Condition: ${current.current.condition}

*5-Day Forecast:*
${forecast.map(day => 
    `${day.date.toLocaleDateString()}: ${day.tempMin}°-${day.tempMax}° ${day.condition}`
).join('\n')}
        `;
    }

    formatMarketMessage(marketData) {
        return `
📈 *Market Prices Today*

${marketData.map(item => 
    `🌾 ${item.crop}: $${item.price.value}/${item.price.unit} ${item.priceChange.direction === 'up' ? '📈' : item.priceChange.direction === 'down' ? '📉' : '➡️'} ${item.priceChange.percentage}%`
).join('\n')}

💡 *Tip:* Prices updated hourly from major markets
        `;
    }

    formatProfileMessage(user) {
        return `
👤 *Your Profile*

Name: ${user.fullName}
Username: @${user.username || 'Not set'}
Location: ${user.profile?.location?.city || 'Not set'}
Farm Size: ${user.profile?.farmSize || 'Not set'} acres
Crops: ${user.profile?.cropTypes?.join(', ') || 'Not set'}
Experience: ${user.profile?.experience || 'Not set'}
Joined: ${user.botData.joinedAt.toLocaleDateString()}
Messages: ${user.botData.messageCount}
        `;
    }

    formatSettingsMessage(user) {
        const notifications = user.botData.notificationSettings;
        return `
⚙️ *Notification Settings*

🌤️ Weather Updates: ${notifications.weather ? '✅' : '❌'}
📈 Market Prices: ${notifications.marketPrices ? '✅' : '❌'}
💡 Daily Tips: ${notifications.tips ? '✅' : '❌'}
🚨 Alerts: ${notifications.alerts ? '✅' : '❌'}

Language: ${user.botData.preferredLanguage}
        `;
    }

    async handleSubscribe(chatId, messageId) {
        try {
            await this.bot.sendMessage(chatId, 
                '📋 *Subscription Management*\n\n' +
                'Choose your subscription preferences:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌤️ Weather Updates', callback_data: 'toggle_weather' },
                                { text: '📈 Market Prices', callback_data: 'toggle_market' }
                            ],
                            [
                                { text: '💡 Daily Tips', callback_data: 'toggle_tips' },
                                { text: '🚨 Alerts', callback_data: 'toggle_alerts' }
                            ],
                            [
                                { text: '⚙️ Settings', callback_data: 'settings' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleSubscribe:', error);
            await this.bot.sendMessage(chatId, 'Sorry, there was an error managing subscriptions.');
        }
    }

    async handleFeedback(chatId, messageId) {
        try {
            await this.bot.sendMessage(chatId, 
                '💬 *Feedback & Support*\n\n' +
                'We value your feedback! Please choose an option:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '⭐ Rate the Bot', callback_data: 'rate_bot' },
                                { text: '🐛 Report Bug', callback_data: 'report_bug' }
                            ],
                            [
                                { text: '💡 Suggest Feature', callback_data: 'suggest_feature' },
                                { text: '❓ Get Help', callback_data: 'get_help' }
                            ],
                            [
                                { text: '📞 Contact Support', callback_data: 'contact_support' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleFeedback:', error);
            await this.bot.sendMessage(chatId, 'Sorry, there was an error accessing feedback options.');
        }
    }

    async handleSetupProfile(query) {
        try {
            const chatId = query.message.chat.id;
            await this.bot.sendMessage(chatId, 
                '🌾 *Profile Setup*\n\n' +
                'Let\'s set up your agricultural profile:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌱 Select Crops', callback_data: 'select_crops' },
                                { text: '📍 Set Location', callback_data: 'weather_location' }
                            ],
                            [
                                { text: '🔔 Notifications', callback_data: 'toggle_notifications' },
                                { text: '✅ Complete Setup', callback_data: 'complete_setup' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleSetupProfile:', error);
        }
    }

    async handleToggleNotifications(query) {
        try {
            const chatId = query.message.chat.id;
            const userId = query.from.id;
            
            const user = await User.findOne({ userId });
            if (user) {
                user.botData.notifications.weather = !user.botData.notifications.weather;
                await user.save();
            }

            await this.bot.editMessageText(
                '🔔 Notifications updated successfully!',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⚙️ More Settings', callback_data: 'settings' }]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleToggleNotifications:', error);
        }
    }

    async handleSelectCrops(query) {
        try {
            const chatId = query.message.chat.id;
            await this.bot.editMessageText(
                '🌾 *Select Your Crops*\n\nChoose the crops you\'re interested in:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌽 Corn', callback_data: 'crop_corn' },
                                { text: '🌾 Wheat', callback_data: 'crop_wheat' }
                            ],
                            [
                                { text: '🍎 Apples', callback_data: 'crop_apples' },
                                { text: '🥔 Potatoes', callback_data: 'crop_potatoes' }
                            ],
                            [
                                { text: '✅ Done', callback_data: 'crop_selection_done' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleSelectCrops:', error);
        }
    }

    async handleWeatherLocation(query) {
        try {
            const chatId = query.message.chat.id;
            await this.bot.editMessageText(
                '📍 *Set Your Location*\n\nPlease share your location or type your city name:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📱 Share Location', callback_data: 'request_location' }],
                            [{ text: '⬅️ Back', callback_data: 'setup_profile' }]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleWeatherLocation:', error);
        }
    }

    async handleMarketCrop(query) {
        try {
            const chatId = query.message.chat.id;
            await this.bot.editMessageText(
                '📈 *Market Prices*\n\nSelect a crop to view current market prices:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌽 Corn Prices', callback_data: 'market_corn' },
                                { text: '🌾 Wheat Prices', callback_data: 'market_wheat' }
                            ],
                            [
                                { text: '🍎 Apple Prices', callback_data: 'market_apples' },
                                { text: '🥔 Potato Prices', callback_data: 'market_potatoes' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            logger.error('Error in handleMarketCrop:', error);
        }
    }

    async handleNewsCategory(category, query) {
        try {
            const newsService = require('../services/newsService');
            const chatId = query.message.chat.id;
            
            await this.bot.editMessageText('📰 Loading news...', {
                chat_id: chatId,
                message_id: query.message.message_id
            });
            
            const newsResult = await newsService.getNewsByCategory(category);
            
            if (newsResult.success && newsResult.articles.length > 0) {
                const formattedNews = newsService.formatNewsForTelegram(newsResult.articles, 4);
                
                await this.bot.editMessageText(formattedNews, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌾 Crops', callback_data: 'news_crops' },
                                { text: '💰 Market', callback_data: 'news_market' }
                            ],
                            [
                                { text: '🔬 Tech', callback_data: 'news_technology' },
                                { text: '🌱 Sustainability', callback_data: 'news_sustainability' }
                            ],
                            [
                                { text: '🔄 Refresh', callback_data: 'news_refresh' }
                            ]
                        ]
                    }
                });
            } else {
                await this.bot.editMessageText(
                    `📰 *${category.charAt(0).toUpperCase() + category.slice(1)} News*\n\nNo recent news available for this category. ${newsResult.error || 'Please try again later.'}`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🔄 Try Again', callback_data: `news_${category}` },
                                    { text: '🏠 Menu', callback_data: 'main_menu' }
                                ]
                            ]
                        }
                    }
                );
            }
        } catch (error) {
            logger.error('Error in handleNewsCategory:', error);
        }
    }

    async handleNewsRefresh(query) {
        try {
            const newsService = require('../services/newsService');
            const chatId = query.message.chat.id;
            
            await this.bot.editMessageText('📰 Refreshing latest news...', {
                chat_id: chatId,
                message_id: query.message.message_id
            });
            
            const newsResult = await newsService.getLatestAgriculturalNews();
            
            if (newsResult.success && newsResult.articles.length > 0) {
                const formattedNews = newsService.formatNewsForTelegram(newsResult.articles, 5);
                
                await this.bot.editMessageText(formattedNews, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌾 Crop News', callback_data: 'news_crops' },
                                { text: '💰 Market News', callback_data: 'news_market' }
                            ],
                            [
                                { text: '🔬 Tech News', callback_data: 'news_technology' },
                                { text: '🌱 Sustainability', callback_data: 'news_sustainability' }
                            ],
                            [
                                { text: '🔄 Refresh', callback_data: 'news_refresh' }
                            ]
                        ]
                    }
                });
            } else {
                await this.bot.editMessageText(
                    `📰 *Latest Agricultural News*\n\nSorry, I couldn't fetch the latest news right now. ${newsResult.error || 'Please try again later.'}`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🔄 Try Again', callback_data: 'news_refresh' },
                                    { text: '🏠 Menu', callback_data: 'main_menu' }
                                ]
                            ]
                        }
                    }
                );
            }
        } catch (error) {
            logger.error('Error in handleNewsRefresh:', error);
        }
    }
}

const botHandler = new BotHandler();

module.exports = {
    init: (bot) => {
        botHandler.setBot(bot);
    },
    handler: botHandler
};
