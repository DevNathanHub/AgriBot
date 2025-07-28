const axios = require('axios');
const logger = require('../utils/logger');
const AgriculturalData = require('../models/AgriculturalData');

class MarketService {
    constructor() {
        this.apiKey = process.env.AGRICULTURE_API_KEY;
        this.fallbackPrices = {
            wheat: { price: 250, unit: 'per quintal', currency: 'USD' },
            corn: { price: 200, unit: 'per quintal', currency: 'USD' },
            rice: { price: 280, unit: 'per quintal', currency: 'USD' },
            soybeans: { price: 320, unit: 'per quintal', currency: 'USD' },
            cotton: { price: 450, unit: 'per quintal', currency: 'USD' }
        };
    }

    async getMarketPrices(crops, location = null) {
        try {
            const marketData = [];

            for (const crop of crops) {
                try {
                    const priceData = await this.getCropPrice(crop, location);
                    marketData.push(priceData);
                } catch (error) {
                    logger.warn(`Failed to get price for ${crop}, using fallback`);
                    marketData.push(this.getFallbackPrice(crop, location));
                }
            }

            // Store in database
            await this.storeMarketData(marketData);

            return marketData;

        } catch (error) {
            logger.error('Error fetching market prices:', error);
            
            // Return cached data if available
            const cachedData = await AgriculturalData.find({
                'marketPrices.0': { $exists: true }
            }).sort({ lastUpdated: -1 }).limit(1);

            if (cachedData.length > 0) {
                return cachedData[0].marketPrices.filter(price => 
                    crops.includes(price.crop.toLowerCase())
                );
            }

            // Return fallback prices
            return crops.map(crop => this.getFallbackPrice(crop, location));
        }
    }

    async getCropPrice(crop, location) {
        try {
            // Try to fetch from agricultural commodity APIs
            // This is a placeholder for actual API integration
            
            // Example integration with agricultural market APIs
            // const response = await axios.get(`agricultural-api-endpoint/${crop}`, {
            //     headers: { 'Authorization': `Bearer ${this.apiKey}` }
            // });

            // For demonstration, we'll simulate market data with some variance
            const basePrice = this.fallbackPrices[crop.toLowerCase()]?.price || 200;
            const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
            const currentPrice = Math.round(basePrice * (1 + variance));
            
            const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
            const direction = priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable';

            return {
                crop: crop.toLowerCase(),
                variety: 'standard',
                market: location?.city || 'Global',
                location: location || { country: 'Global', state: '', city: 'Average' },
                price: {
                    value: currentPrice,
                    currency: 'USD',
                    unit: 'per quintal'
                },
                priceChange: {
                    percentage: Math.abs(Math.round(priceChange * 100)),
                    direction: direction
                },
                quality: 'Grade A',
                date: new Date()
            };

        } catch (error) {
            logger.error(`Error fetching price for ${crop}:`, error);
            throw error;
        }
    }

    getFallbackPrice(crop, location) {
        const fallback = this.fallbackPrices[crop.toLowerCase()];
        if (!fallback) {
            return {
                crop: crop.toLowerCase(),
                variety: 'standard',
                market: 'Unknown',
                location: location || { country: 'Global', state: '', city: 'Average' },
                price: {
                    value: 200,
                    currency: 'USD',
                    unit: 'per quintal'
                },
                priceChange: {
                    percentage: 0,
                    direction: 'stable'
                },
                quality: 'Standard',
                date: new Date()
            };
        }

        return {
            crop: crop.toLowerCase(),
            variety: 'standard',
            market: location?.city || 'Global',
            location: location || { country: 'Global', state: '', city: 'Average' },
            price: fallback,
            priceChange: {
                percentage: Math.floor(Math.random() * 5),
                direction: Math.random() > 0.5 ? 'up' : 'down'
            },
            quality: 'Standard',
            date: new Date()
        };
    }

    async getMarketTrends(crop, days = 30) {
        try {
            // This would fetch historical price data
            // For now, we'll generate sample trend data
            const trends = [];
            const basePrice = this.fallbackPrices[crop.toLowerCase()]?.price || 200;
            
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                const variance = (Math.random() - 0.5) * 0.3;
                const price = Math.round(basePrice * (1 + variance));
                
                trends.push({
                    date: date,
                    price: price,
                    volume: Math.floor(Math.random() * 1000) + 500
                });
            }

            return {
                crop: crop,
                period: `${days} days`,
                trends: trends,
                analysis: this.analyzeTrends(trends)
            };

        } catch (error) {
            logger.error('Error fetching market trends:', error);
            throw error;
        }
    }

    analyzeTrends(trends) {
        if (trends.length < 2) return { direction: 'stable', strength: 'weak' };

        const firstPrice = trends[0].price;
        const lastPrice = trends[trends.length - 1].price;
        const change = (lastPrice - firstPrice) / firstPrice;

        let direction = 'stable';
        let strength = 'weak';

        if (change > 0.05) {
            direction = 'upward';
            strength = change > 0.15 ? 'strong' : 'moderate';
        } else if (change < -0.05) {
            direction = 'downward';
            strength = change < -0.15 ? 'strong' : 'moderate';
        }

        return {
            direction,
            strength,
            change: Math.round(change * 100),
            recommendation: this.generateRecommendation(direction, strength, change)
        };
    }

    generateRecommendation(direction, strength, change) {
        if (direction === 'upward' && strength === 'strong') {
            return 'Consider selling if you have inventory. Prices are rising strongly.';
        } else if (direction === 'downward' && strength === 'strong') {
            return 'Hold inventory if possible. Prices are declining rapidly.';
        } else if (direction === 'stable') {
            return 'Market is stable. Good time for regular trading activities.';
        } else {
            return 'Monitor market closely for better trading opportunities.';
        }
    }

    async getMarketNews(category = 'general') {
        try {
            // This would integrate with agricultural news APIs
            // For now, we'll return sample news
            const sampleNews = [
                {
                    title: 'Global Wheat Prices Rise Due to Weather Concerns',
                    summary: 'Drought conditions in major wheat-producing regions drive prices up by 5%',
                    category: 'market',
                    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                    priority: 'high',
                    relevantCrops: ['wheat']
                },
                {
                    title: 'Corn Harvest Exceeds Expectations',
                    summary: 'Record corn harvest leads to stable prices across major markets',
                    category: 'market',
                    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                    priority: 'medium',
                    relevantCrops: ['corn']
                },
                {
                    title: 'New Trade Agreement Boosts Soybean Exports',
                    summary: 'Recent trade deal expected to increase soybean demand by 15%',
                    category: 'policy',
                    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
                    priority: 'medium',
                    relevantCrops: ['soybeans']
                }
            ];

            return sampleNews.filter(news => 
                category === 'general' || news.category === category
            );

        } catch (error) {
            logger.error('Error fetching market news:', error);
            return [];
        }
    }

    async getMarketAlerts(user) {
        try {
            const alerts = [];
            const userCrops = user.profile?.cropTypes || [];
            const userLocation = user.profile?.location;

            // Get current prices for user's crops
            if (userCrops.length > 0) {
                const prices = await this.getMarketPrices(userCrops, userLocation);
                
                prices.forEach(priceData => {
                    // Generate alerts based on significant price changes
                    if (priceData.priceChange.percentage > 10) {
                        alerts.push({
                            type: priceData.priceChange.direction === 'up' ? 'opportunity' : 'warning',
                            title: `${priceData.crop.charAt(0).toUpperCase() + priceData.crop.slice(1)} Price ${priceData.priceChange.direction === 'up' ? 'Surge' : 'Drop'}`,
                            message: `${priceData.crop} prices ${priceData.priceChange.direction === 'up' ? 'increased' : 'decreased'} by ${priceData.priceChange.percentage}% to $${priceData.price.value}/${priceData.price.unit}`,
                            crop: priceData.crop,
                            priority: priceData.priceChange.percentage > 15 ? 'high' : 'medium',
                            timestamp: new Date()
                        });
                    }
                });
            }

            return alerts;

        } catch (error) {
            logger.error('Error generating market alerts:', error);
            return [];
        }
    }

    async storeMarketData(marketData) {
        try {
            const agriculturalData = new AgriculturalData({
                marketPrices: marketData,
                dataSource: 'market-api',
                lastUpdated: new Date(),
                validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) // Valid for 4 hours
            });

            await agriculturalData.save();
            logger.info('Market data stored successfully');

        } catch (error) {
            logger.error('Error storing market data:', error);
        }
    }

    // Utility methods
    formatPrice(priceData) {
        return `$${priceData.price.value}/${priceData.price.unit}`;
    }

    formatPriceChange(priceChange) {
        const emoji = priceChange.direction === 'up' ? '📈' : 
                     priceChange.direction === 'down' ? '📉' : '➡️';
        return `${emoji} ${priceChange.percentage}%`;
    }

    getCropEmoji(crop) {
        const emojiMap = {
            wheat: '🌾',
            corn: '🌽',
            rice: '🍚',
            soybeans: '🫘',
            cotton: '🌿',
            tomato: '🍅',
            potato: '🥔',
            onion: '🧅',
            apple: '🍎',
            orange: '🍊'
        };

        return emojiMap[crop.toLowerCase()] || '🌱';
    }
}

module.exports = new MarketService();
