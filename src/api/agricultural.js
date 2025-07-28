const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const weatherService = require('../services/weatherService');
const marketService = require('../services/marketService');
const AgriculturalData = require('../models/AgriculturalData');
const logger = require('../utils/logger');

// Apply rate limiting to all agricultural routes
router.use(rateLimiter);

// Get weather information
router.get('/weather', optionalAuth, async (req, res) => {
    try {
        const { lat, lon, city, state, country } = req.query;
        
        let location;
        
        // Use coordinates if provided
        if (lat && lon) {
            location = {
                coordinates: {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }
            };
        }
        // Use city/state/country if provided
        else if (city) {
            location = {
                city,
                state: state || '',
                country: country || 'US'
            };
        }
        // Use user's location if authenticated
        else if (req.user?.profile?.location) {
            location = req.user.profile.location;
        }
        else {
            return res.status(400).json({
                error: 'Location required',
                message: 'Please provide location coordinates or city information'
            });
        }

        const weatherData = await weatherService.getCurrentWeather(location);
        
        res.json({
            success: true,
            weather: weatherData
        });

    } catch (error) {
        logger.error('Error getting weather:', error);
        res.status(500).json({
            error: 'Weather service unavailable',
            message: 'Unable to fetch weather data at this time'
        });
    }
});

// Get weather forecast
router.get('/weather/forecast', optionalAuth, async (req, res) => {
    try {
        const { lat, lon, city, state, country, days = 5 } = req.query;
        
        let location;
        
        if (lat && lon) {
            location = {
                coordinates: {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }
            };
        } else if (city) {
            location = {
                city,
                state: state || '',
                country: country || 'US'
            };
        } else if (req.user?.profile?.location) {
            location = req.user.profile.location;
        } else {
            return res.status(400).json({
                error: 'Location required',
                message: 'Please provide location coordinates or city information'
            });
        }

        const forecastDays = Math.min(parseInt(days), 14); // Limit to 14 days
        const forecast = await weatherService.getForecast(location, forecastDays);
        
        res.json({
            success: true,
            forecast,
            location,
            days: forecastDays
        });

    } catch (error) {
        logger.error('Error getting weather forecast:', error);
        res.status(500).json({
            error: 'Weather service unavailable',
            message: 'Unable to fetch weather forecast at this time'
        });
    }
});

// Get agricultural weather insights
router.get('/weather/agricultural', optionalAuth, async (req, res) => {
    try {
        const { lat, lon, city, state, country, crop } = req.query;
        
        let location;
        let cropType = crop;
        
        if (lat && lon) {
            location = {
                coordinates: {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }
            };
        } else if (city) {
            location = {
                city,
                state: state || '',
                country: country || 'US'
            };
        } else if (req.user?.profile?.location) {
            location = req.user.profile.location;
            cropType = cropType || req.user.profile.cropTypes?.[0];
        } else {
            return res.status(400).json({
                error: 'Location required',
                message: 'Please provide location coordinates or city information'
            });
        }

        const agriculturalWeather = await weatherService.getAgriculturalWeather(location, cropType);
        
        res.json({
            success: true,
            weather: agriculturalWeather,
            crop: cropType,
            location
        });

    } catch (error) {
        logger.error('Error getting agricultural weather:', error);
        res.status(500).json({
            error: 'Weather service unavailable',
            message: 'Unable to fetch agricultural weather data at this time'
        });
    }
});

// Get weather alerts
router.get('/weather/alerts', optionalAuth, async (req, res) => {
    try {
        const { lat, lon, city, state, country } = req.query;
        
        let location;
        
        if (lat && lon) {
            location = {
                coordinates: {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }
            };
        } else if (city) {
            location = {
                city,
                state: state || '',
                country: country || 'US'
            };
        } else if (req.user?.profile?.location) {
            location = req.user.profile.location;
        } else {
            return res.status(400).json({
                error: 'Location required',
                message: 'Please provide location coordinates or city information'
            });
        }

        const alerts = await weatherService.getWeatherAlerts(location);
        
        res.json({
            success: true,
            alerts,
            location
        });

    } catch (error) {
        logger.error('Error getting weather alerts:', error);
        res.status(500).json({
            error: 'Weather service unavailable',
            message: 'Unable to fetch weather alerts at this time'
        });
    }
});

// Get market prices
router.get('/market/prices', optionalAuth, async (req, res) => {
    try {
        const { crops, location } = req.query;
        
        let cropList;
        let locationData = null;
        
        // Parse crops
        if (crops) {
            cropList = crops.split(',').map(crop => crop.trim().toLowerCase());
        } else if (req.user?.profile?.cropTypes) {
            cropList = req.user.profile.cropTypes;
        } else {
            cropList = ['wheat', 'corn', 'rice', 'soybeans']; // Default crops
        }

        // Parse location
        if (location) {
            try {
                locationData = JSON.parse(location);
            } catch (e) {
                // Ignore invalid JSON
            }
        } else if (req.user?.profile?.location) {
            locationData = req.user.profile.location;
        }

        const marketPrices = await marketService.getMarketPrices(cropList, locationData);
        
        res.json({
            success: true,
            prices: marketPrices,
            crops: cropList,
            location: locationData
        });

    } catch (error) {
        logger.error('Error getting market prices:', error);
        res.status(500).json({
            error: 'Market service unavailable',
            message: 'Unable to fetch market prices at this time'
        });
    }
});

// Get market trends
router.get('/market/trends/:crop', optionalAuth, async (req, res) => {
    try {
        const { crop } = req.params;
        const { days = 30 } = req.query;
        
        const trendDays = Math.min(parseInt(days), 365); // Limit to 1 year
        const trends = await marketService.getMarketTrends(crop, trendDays);
        
        res.json({
            success: true,
            trends
        });

    } catch (error) {
        logger.error('Error getting market trends:', error);
        res.status(500).json({
            error: 'Market service unavailable',
            message: 'Unable to fetch market trends at this time'
        });
    }
});

// Get market news
router.get('/market/news', optionalAuth, async (req, res) => {
    try {
        const { category = 'general', limit = 10 } = req.query;
        
        const newsLimit = Math.min(parseInt(limit), 50); // Limit to 50 articles
        const news = await marketService.getMarketNews(category);
        
        res.json({
            success: true,
            news: news.slice(0, newsLimit),
            category
        });

    } catch (error) {
        logger.error('Error getting market news:', error);
        res.status(500).json({
            error: 'Market service unavailable',
            message: 'Unable to fetch market news at this time'
        });
    }
});

// Get crop information
router.get('/crops/:crop', optionalAuth, async (req, res) => {
    try {
        const { crop } = req.params;
        
        // Get crop data from database
        const agriculturalData = await AgriculturalData.findOne({
            'crops.name': { $regex: new RegExp(crop, 'i') }
        });

        if (!agriculturalData || !agriculturalData.crops) {
            return res.status(404).json({
                error: 'Crop not found',
                message: `No information available for crop: ${crop}`
            });
        }

        const cropInfo = agriculturalData.crops.find(c => 
            c.name.toLowerCase() === crop.toLowerCase()
        );

        if (!cropInfo) {
            return res.status(404).json({
                error: 'Crop not found',
                message: `No information available for crop: ${crop}`
            });
        }

        res.json({
            success: true,
            crop: cropInfo
        });

    } catch (error) {
        logger.error('Error getting crop information:', error);
        res.status(500).json({
            error: 'Agricultural service unavailable',
            message: 'Unable to fetch crop information at this time'
        });
    }
});

// Get agricultural tips
router.get('/tips', optionalAuth, async (req, res) => {
    try {
        const { category, crop, season, limit = 10 } = req.query;
        
        const query = {};
        
        if (category) {
            query['tips.category'] = category;
        }
        
        if (crop) {
            query['tips.applicableCrops'] = crop.toLowerCase();
        }
        
        if (season) {
            query['tips.applicableSeasons'] = season.toLowerCase();
        }

        const agriculturalData = await AgriculturalData.find(query)
            .sort({ 'tips.priority': -1, 'tips.likes': -1 })
            .limit(parseInt(limit));

        const tips = agriculturalData.flatMap(data => data.tips || [])
            .filter(tip => {
                if (category && tip.category !== category) return false;
                if (crop && !tip.applicableCrops?.includes(crop.toLowerCase())) return false;
                if (season && !tip.applicableSeasons?.includes(season.toLowerCase())) return false;
                return true;
            })
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            tips,
            filters: {
                category,
                crop,
                season,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        logger.error('Error getting agricultural tips:', error);
        res.status(500).json({
            error: 'Agricultural service unavailable',
            message: 'Unable to fetch agricultural tips at this time'
        });
    }
});

// Get agricultural news
router.get('/news', optionalAuth, async (req, res) => {
    try {
        const { category, location, crop, limit = 10 } = req.query;
        
        const query = {};
        
        if (category) {
            query['news.category'] = category;
        }
        
        if (location) {
            query['news.relevantLocations'] = { $in: [location] };
        }
        
        if (crop) {
            query['news.relevantCrops'] = { $in: [crop.toLowerCase()] };
        }

        const agriculturalData = await AgriculturalData.find(query)
            .sort({ 'news.publishedAt': -1 })
            .limit(parseInt(limit));

        const news = agriculturalData.flatMap(data => data.news || [])
            .filter(article => {
                if (category && article.category !== category) return false;
                if (location && !article.relevantLocations?.includes(location)) return false;
                if (crop && !article.relevantCrops?.includes(crop.toLowerCase())) return false;
                return true;
            })
            .sort((a, b) => b.publishedAt - a.publishedAt)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            news,
            filters: {
                category,
                location,
                crop,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        logger.error('Error getting agricultural news:', error);
        res.status(500).json({
            error: 'Agricultural service unavailable',
            message: 'Unable to fetch agricultural news at this time'
        });
    }
});

// Get crop advice based on conditions
router.post('/advice', optionalAuth, async (req, res) => {
    try {
        const { crop, location, problem, symptoms, conditions } = req.body;
        
        if (!crop) {
            return res.status(400).json({
                error: 'Crop required',
                message: 'Please specify the crop you need advice for'
            });
        }

        // This would integrate with AI services for more sophisticated advice
        // For now, provide basic advice based on crop and problem
        
        let advice = {
            crop: crop,
            general: `Here's some general advice for ${crop} cultivation.`,
            specific: [],
            recommendations: []
        };

        // Add problem-specific advice
        if (problem) {
            switch (problem.toLowerCase()) {
                case 'pests':
                    advice.specific.push('Monitor for common pests regularly');
                    advice.specific.push('Use integrated pest management (IPM) approaches');
                    advice.recommendations.push('Consider beneficial insects for natural control');
                    break;
                case 'disease':
                    advice.specific.push('Ensure proper air circulation');
                    advice.specific.push('Avoid overhead watering');
                    advice.recommendations.push('Apply preventive fungicides if necessary');
                    break;
                case 'watering':
                    advice.specific.push('Water early morning or evening');
                    advice.specific.push('Check soil moisture before watering');
                    advice.recommendations.push('Consider drip irrigation for efficiency');
                    break;
                default:
                    advice.specific.push('Follow best practices for crop management');
            }
        }

        // Add weather-based advice if location provided
        if (location) {
            try {
                const weather = await weatherService.getCurrentWeather(location);
                
                if (weather.current.temperature > 30) {
                    advice.recommendations.push('Provide shade during hot periods');
                    advice.recommendations.push('Increase watering frequency');
                }
                
                if (weather.current.humidity > 80) {
                    advice.recommendations.push('Monitor for fungal diseases');
                    advice.recommendations.push('Ensure good air circulation');
                }
            } catch (error) {
                // Continue without weather advice if service fails
            }
        }

        res.json({
            success: true,
            advice
        });

    } catch (error) {
        logger.error('Error getting crop advice:', error);
        res.status(500).json({
            error: 'Advice service unavailable',
            message: 'Unable to provide crop advice at this time'
        });
    }
});

module.exports = router;
