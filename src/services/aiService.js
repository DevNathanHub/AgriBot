const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const newsService = require('./newsService');

class AIService {
    constructor() {
        // Initialize Gemini AI
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

        this.intents = {
            greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
            weather: ['weather', 'temperature', 'rain', 'sunny', 'cloudy', 'forecast'],
            crops: ['crop', 'plant', 'grow', 'seed', 'harvest', 'farming'],
            market: ['price', 'market', 'sell', 'buy', 'cost', 'rate'],
            pest: ['pest', 'insect', 'bug', 'disease', 'infection', 'treatment'],
            irrigation: ['water', 'irrigation', 'watering', 'drought', 'moisture'],
            fertilizer: ['fertilizer', 'nutrient', 'manure', 'compost', 'nitrogen'],
            news: ['news', 'latest', 'headlines', 'updates', 'article'],
            help: ['help', 'assist', 'support', 'guide', 'how to']
        };

        this.cropDatabase = {
            wheat: {
                plantingTime: 'October-December',
                harvestTime: 'March-May',
                waterRequirement: 'Moderate',
                commonDiseases: ['Rust', 'Smut', 'Blight'],
                tips: 'Plant in well-drained soil with pH 6.0-7.5'
            },
            corn: {
                plantingTime: 'April-June',
                harvestTime: 'August-October',
                waterRequirement: 'High',
                commonDiseases: ['Corn Borer', 'Leaf Blight'],
                tips: 'Requires warm weather and regular watering'
            },
            rice: {
                plantingTime: 'June-July',
                harvestTime: 'October-December',
                waterRequirement: 'Very High',
                commonDiseases: ['Blast', 'Bacterial Blight'],
                tips: 'Grows best in flooded fields'
            }
        };
    }

    async processMessage(text, user) {
        try {
            const startTime = Date.now();
            
            // Detect intent
            const intent = this.detectIntent(text);
            
            // Extract entities
            const entities = this.extractEntities(text);
            
            // Generate response based on intent
            const response = await this.generateResponse(intent, entities, text, user);
            
            const processingTime = Date.now() - startTime;
            
            return {
                text: response.text,
                keyboard: response.keyboard,
                intent: intent,
                entities: entities,
                confidence: response.confidence,
                model: 'agribot-gemini-v1',
                processingTime: processingTime
            };
            
        } catch (error) {
            logger.error('Error processing AI message:', error);
            return {
                text: 'I apologize, but I\'m having trouble processing your request right now. Please try again.',
                confidence: 0,
                intent: 'error'
            };
        }
    }

    detectIntent(text) {
        const lowercaseText = text.toLowerCase();
        
        for (const [intent, keywords] of Object.entries(this.intents)) {
            if (keywords.some(keyword => lowercaseText.includes(keyword))) {
                return intent;
            }
        }
        
        return 'general';
    }

    extractEntities(text) {
        const entities = [];
        const lowercaseText = text.toLowerCase();
        
        // Extract crop mentions
        const crops = ['wheat', 'corn', 'rice', 'tomato', 'potato', 'soybean'];
        crops.forEach(crop => {
            if (lowercaseText.includes(crop)) {
                entities.push({ type: 'crop', value: crop });
            }
        });
        
        // Extract location mentions
        const locations = ['kenya', 'nairobi', 'mombasa', 'kisumu', 'nakuru'];
        locations.forEach(location => {
            if (lowercaseText.includes(location)) {
                entities.push({ type: 'location', value: location });
            }
        });
        
        return entities;
    }

    async generateResponse(intent, entities, originalText, user) {
        switch (intent) {
            case 'greeting':
                return this.generateGreetingResponse(user);
                
            case 'weather':
                return this.generateWeatherResponse(entities, user);
                
            case 'crops':
                return await this.generateCropResponse(entities, originalText, user);
                
            case 'market':
                return this.generateMarketResponse(entities, user);
                
            case 'pest':
                return await this.generatePestResponse(entities, originalText);
                
            case 'irrigation':
                return await this.generateIrrigationResponse(entities, originalText);
                
            case 'fertilizer':
                return await this.generateFertilizerResponse(entities, originalText);
                
            case 'news':
                return await this.generateNewsResponse(entities, originalText);
                
            case 'help':
                return this.generateHelpResponse();
                
            default:
                return await this.generateGeneralResponse(originalText, entities, user);
        }
    }

    generateGreetingResponse(user) {
        const greetings = [
            `Hello ${user.firstName}! 🌱 How can I help you with your farming today?`,
            `Hi there! 🚜 What agricultural question do you have for me?`,
            `Welcome back! 🌾 Ready to grow something amazing together?`
        ];
        
        return {
            text: greetings[Math.floor(Math.random() * greetings.length)],
            confidence: 0.9,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '🌤️ Weather', callback_data: 'weather' },
                        { text: '🌱 Crops', callback_data: 'crops' }
                    ],
                    [
                        { text: '📊 Market', callback_data: 'market' },
                        { text: '💡 Tips', callback_data: 'tips' }
                    ]
                ]
            }
        };
    }

    generateWeatherResponse(entities, user) {
        return {
            text: `🌤️ Let me get the latest weather information for you! Use /weather to get current conditions and forecasts for your location.`,
            confidence: 0.8,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '🌦️ Current Weather', callback_data: 'current_weather' },
                        { text: '📅 Forecast', callback_data: 'weather_forecast' }
                    ]
                ]
            }
        };
    }

    async generateCropResponse(entities, originalText, user) {
        const cropEntity = entities.find(e => e.type === 'crop');
        
        // Enhanced AI response for specific crop questions
        if (originalText.includes('how to') || originalText.includes('when to') || originalText.includes('best') || cropEntity) {
            try {
                const userLocation = user.agriculturalProfile?.location || 'Kenya';
                const userCrops = user.agriculturalProfile?.cropsOfInterest?.join(', ') || 'general crops';
                const specificCrop = cropEntity ? cropEntity.value : 'farming';
                
                const prompt = `You are an agricultural expert helping a farmer in ${userLocation}. 
                
Question: "${originalText}"
User grows: ${userCrops}
Specific crop: ${specificCrop}

Provide specific, actionable advice for crop management in Kenya's climate. Include:
- Planting/growing tips
- Seasonal considerations for Kenya
- Local farming practices
- Practical solutions

Keep response under 150 words and use appropriate emojis.`;

                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                return {
                    text: text,
                    confidence: 0.9,
                    keyboard: {
                        inline_keyboard: [
                            [
                                { text: '🌤️ Weather Info', callback_data: 'weather_info' },
                                { text: '📈 Market Prices', callback_data: 'market_info' }
                            ],
                            [
                                { text: '💡 More Tips', callback_data: 'farming_tips' }
                            ]
                        ]
                    }
                };
            } catch (error) {
                logger.error('Error generating AI crop response:', error);
                // Fall back to basic database response
            }
        }
        
        // Fallback to basic crop database
        if (cropEntity && this.cropDatabase[cropEntity.value]) {
            const crop = this.cropDatabase[cropEntity.value];
            return {
                text: `🌾 *${cropEntity.value.charAt(0).toUpperCase() + cropEntity.value.slice(1)} Information*\n\n` +
                      `🌱 Planting Time: ${crop.plantingTime}\n` +
                      `🌾 Harvest Time: ${crop.harvestTime}\n` +
                      `💧 Water Requirement: ${crop.waterRequirement}\n` +
                      `🦠 Common Diseases: ${crop.commonDiseases.join(', ')}\n` +
                      `💡 Tip: ${crop.tips}`,
                confidence: 0.9
            };
        }
        
        return {
            text: `🌱 I'd be happy to help you with crop information! Could you specify which crop you're interested in? I have information about wheat, corn, rice, and many others.`,
            confidence: 0.7,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '🌾 Wheat', callback_data: 'crop_info:wheat' },
                        { text: '🌽 Corn', callback_data: 'crop_info:corn' }
                    ],
                    [
                        { text: '🍚 Rice', callback_data: 'crop_info:rice' },
                        { text: '🫘 Soybeans', callback_data: 'crop_info:soybeans' }
                    ]
                ]
            }
        };
    }

    generateMarketResponse(entities, user) {
        return {
            text: `📈 Let me help you with market price information! Use /market to get current prices for your crops, or specify which crop prices you'd like to know about.`,
            confidence: 0.8,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '🌾 Grain Prices', callback_data: 'market_grains' },
                        { text: '🥕 Vegetable Prices', callback_data: 'market_vegetables' }
                    ]
                ]
            }
        };
    }

    async generatePestResponse(entities, originalText) {
        try {
            const prompt = `You are a plant pathology expert helping a farmer in Kenya with pest management.

Question: "${originalText}"

Provide practical advice for pest identification and control in Kenya. Include:
- Common pests in Kenya
- Organic/sustainable control methods
- Prevention strategies
- When to seek professional help

Keep response under 150 words with emojis.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return {
                text: text,
                confidence: 0.8
            };
        } catch (error) {
            logger.error('Error generating pest response:', error);
            return {
                text: `🐛 I can help you with pest management! For specific pest issues, please describe the symptoms you're seeing on your crops, and I'll provide targeted advice.`,
                confidence: 0.7
            };
        }
    }

    async generateIrrigationResponse(entities, originalText) {
        try {
            const prompt = `You are an irrigation specialist helping a farmer in Kenya with water management.

Question: "${originalText}"

Provide practical irrigation advice for Kenya's climate including:
- Water-efficient techniques
- Seasonal watering strategies
- Drought management
- Local irrigation methods

Keep response under 150 words with emojis.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return {
                text: text,
                confidence: 0.8
            };
        } catch (error) {
            logger.error('Error generating irrigation response:', error);
            return {
                text: `💧 I can help with irrigation planning! Consider drip irrigation for water efficiency, and time watering for early morning to reduce evaporation.`,
                confidence: 0.7
            };
        }
    }

    async generateFertilizerResponse(entities, originalText) {
        try {
            const prompt = `You are a soil fertility expert helping a farmer in Kenya with fertilizer and soil management.

Question: "${originalText}"

Provide practical fertilizer advice for Kenya including:
- Organic vs synthetic options
- Local soil conditions
- Nutrient management
- Cost-effective solutions

Keep response under 150 words with emojis.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return {
                text: text,
                confidence: 0.8
            };
        } catch (error) {
            logger.error('Error generating fertilizer response:', error);
            return {
                text: `🌱 For fertilizer advice, consider soil testing first. Organic compost and manure work well in Kenya's soils, plus DAP and CAN for specific nutrient needs.`,
                confidence: 0.7
            };
        }
    }

    async generateNewsResponse(entities, originalText) {
        try {
            // Determine news category based on query
            let category = 'general';
            if (originalText.includes('crop') || originalText.includes('harvest')) {
                category = 'crops';
            } else if (originalText.includes('tech') || originalText.includes('innovation')) {
                category = 'technology';
            } else if (originalText.includes('market') || originalText.includes('price')) {
                category = 'market';
            } else if (originalText.includes('weather') || originalText.includes('climate')) {
                category = 'weather';
            } else if (originalText.includes('sustainable') || originalText.includes('organic')) {
                category = 'sustainability';
            }

            const newsResult = await newsService.getNewsByCategory(category);
            
            if (newsResult.success && newsResult.articles.length > 0) {
                const formattedNews = newsService.formatNewsForTelegram(newsResult.articles, 3);
                
                return {
                    text: formattedNews,
                    confidence: 0.9,
                    keyboard: {
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
                                { text: '🔄 Refresh News', callback_data: 'news_refresh' }
                            ]
                        ]
                    }
                };
            } else {
                return {
                    text: `📰 I'm having trouble fetching the latest agricultural news right now. ${newsResult.error || 'Please try again later.'}\n\nIn the meantime, I can help you with:\n• Crop advice\n• Weather information\n• Market prices\n• Farming tips`,
                    confidence: 0.6,
                    keyboard: {
                        inline_keyboard: [
                            [
                                { text: '🌤️ Weather', callback_data: 'weather' },
                                { text: '📈 Market', callback_data: 'market' }
                            ],
                            [
                                { text: '🌱 Crops', callback_data: 'crops' },
                                { text: '💡 Tips', callback_data: 'tips' }
                            ]
                        ]
                    }
                };
            }
        } catch (error) {
            logger.error('Error generating news response:', error);
            return {
                text: `📰 Sorry, I can't fetch news right now, but I'm here to help with all your agricultural questions! Ask me about crops, weather, markets, or farming techniques.`,
                confidence: 0.5,
                keyboard: {
                    inline_keyboard: [
                        [
                            { text: '🌱 Crop Advice', callback_data: 'crops' },
                            { text: '🌤️ Weather', callback_data: 'weather' }
                        ],
                        [
                            { text: '📈 Market Prices', callback_data: 'market' },
                            { text: '💡 Farming Tips', callback_data: 'tips' }
                        ]
                    ]
                }
            };
        }
    }

    generateHelpResponse() {
        return {
            text: `🤖 *AgriBot Help*\n\n` +
                  `I'm your intelligent agricultural assistant! I can help with:\n\n` +
                  `🌤️ Weather forecasts and alerts\n` +
                  `🌱 Crop planting and care advice\n` +
                  `📈 Market prices and trends\n` +
                  `🐛 Pest and disease management\n` +
                  `💧 Irrigation and water management\n` +
                  `🌾 Fertilizer recommendations\n` +
                  `📰 Latest agricultural news\n\n` +
                  `Just ask me anything about farming!`,
            confidence: 1.0,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: '🌤️ Weather', callback_data: 'weather' },
                        { text: '🌱 Crops', callback_data: 'crops' }
                    ],
                    [
                        { text: '📊 Market', callback_data: 'market' },
                        { text: '📰 News', callback_data: 'news_general' }
                    ],
                    [
                        { text: '💡 Tips', callback_data: 'tips' }
                    ]
                ]
            }
        };
    }

    async generateGeneralResponse(originalText, entities, user) {
        try {
            // Use Gemini AI for general agricultural questions
            const prompt = `You are an expert agricultural assistant helping farmers in Kenya. 
            
User question: "${originalText}"
User's crops of interest: ${user.agriculturalProfile?.cropsOfInterest?.join(', ') || 'general farming'}
User's location: ${user.agriculturalProfile?.location || 'Kenya'}

Provide a helpful, practical response about agriculture. Keep it concise (max 200 words) and include specific actionable advice. Use emojis appropriately. Focus on:
- Crop management
- Weather considerations
- Best practices
- Local farming conditions in Kenya

If the question is not agriculture-related, politely redirect to farming topics.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return {
                text: text,
                confidence: 0.8,
                keyboard: {
                    inline_keyboard: [
                        [
                            { text: '🌤️ Weather', callback_data: 'weather_info' },
                            { text: '📈 Market', callback_data: 'market_info' }
                        ],
                        [
                            { text: '🌱 Crops', callback_data: 'crop_info' },
                            { text: '💡 Tips', callback_data: 'farming_tips' }
                        ]
                    ]
                }
            };

        } catch (error) {
            logger.error('Error generating AI response:', error);
            
            // Fallback to predefined responses
            const responses = [
                `🤔 I'm not entirely sure about that specific question, but I'd be happy to help! Could you rephrase it or ask about:\n\n` +
                `• Weather and climate\n` +
                `• Crop growing techniques\n` +
                `• Market prices\n` +
                `• Pest management\n` +
                `• Irrigation methods\n` +
                `• Fertilizers and soil health`,
                
                `🌱 That's an interesting agricultural question! While I'm still learning, I can definitely help you with weather, crops, markets, and farming techniques. What specifically would you like to know?`,
                
                `🚜 I want to make sure I give you the best agricultural advice! Could you provide a bit more detail about what you're looking for? I'm great with weather, crop care, market info, and farming practices.`
            ];
            
            return {
                text: responses[Math.floor(Math.random() * responses.length)],
                confidence: 0.5,
                keyboard: {
                    inline_keyboard: [
                        [
                            { text: '🌤️ Weather', callback_data: 'weather' },
                            { text: '📊 Market', callback_data: 'market' }
                        ],
                        [
                            { text: '💡 Get Advice', callback_data: 'advice' },
                            { text: '❓ Help', callback_data: 'help' }
                        ]
                    ]
                }
            };
        }
    }
}

module.exports = new AIService();
