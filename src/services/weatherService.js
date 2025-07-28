const axios = require('axios');
const logger = require('../utils/logger');
const AgriculturalData = require('../models/AgriculturalData');

class WeatherService {
    constructor() {
        this.apiKey = process.env.WEATHER_API_KEY;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    }

    async getCurrentWeather(location) {
        try {
            const url = `${this.baseUrl}/weather`;
            const params = {
                q: `${location.city},${location.state},${location.country}`,
                appid: this.apiKey,
                units: 'metric'
            };

            if (location.coordinates) {
                params.lat = location.coordinates.latitude;
                params.lon = location.coordinates.longitude;
                delete params.q;
            }

            const response = await axios.get(url, { params });
            const data = response.data;

            const weatherData = {
                location: {
                    country: data.sys.country,
                    state: location.state || '',
                    city: data.name,
                    coordinates: {
                        latitude: data.coord.lat,
                        longitude: data.coord.lon
                    }
                },
                current: {
                    temperature: Math.round(data.main.temp),
                    humidity: data.main.humidity,
                    pressure: data.main.pressure,
                    windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
                    windDirection: data.wind.deg,
                    visibility: data.visibility / 1000, // Convert to km
                    uvIndex: 0, // Would need separate UV API call
                    condition: data.weather[0].description,
                    icon: data.weather[0].icon
                }
            };

            // Store in database
            await this.storeWeatherData(weatherData);

            return weatherData;

        } catch (error) {
            logger.error('Error fetching current weather:', error);
            
            // Try to get cached data
            const cachedData = await AgriculturalData.getCurrentWeather(location);
            if (cachedData) {
                logger.info('Returning cached weather data');
                return cachedData.weather;
            }
            
            throw new Error('Unable to fetch weather data');
        }
    }

    async getForecast(location, days = 5) {
        try {
            const url = `${this.baseUrl}/forecast`;
            const params = {
                q: `${location.city},${location.state},${location.country}`,
                appid: this.apiKey,
                units: 'metric',
                cnt: days * 8 // 8 forecasts per day (every 3 hours)
            };

            if (location.coordinates) {
                params.lat = location.coordinates.latitude;
                params.lon = location.coordinates.longitude;
                delete params.q;
            }

            const response = await axios.get(url, { params });
            const data = response.data;

            // Group forecasts by day
            const dailyForecasts = this.groupForecastByDay(data.list);

            return dailyForecasts.slice(0, days);

        } catch (error) {
            logger.error('Error fetching weather forecast:', error);
            throw new Error('Unable to fetch weather forecast');
        }
    }

    async getAgriculturalWeather(location, cropType) {
        try {
            const currentWeather = await this.getCurrentWeather(location);
            const forecast = await this.getForecast(location, 7);

            // Generate agricultural insights
            const insights = this.generateAgriculturalInsights(currentWeather, forecast, cropType);

            return {
                current: currentWeather,
                forecast,
                insights
            };

        } catch (error) {
            logger.error('Error fetching agricultural weather:', error);
            throw error;
        }
    }

    async getWeatherAlerts(location) {
        try {
            // This would integrate with weather alert APIs
            // For now, we'll generate basic alerts based on current conditions
            const weather = await this.getCurrentWeather(location);
            const alerts = this.generateWeatherAlerts(weather);

            return alerts;

        } catch (error) {
            logger.error('Error fetching weather alerts:', error);
            return [];
        }
    }

    groupForecastByDay(forecastList) {
        const dailyData = {};

        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date: date,
                    temperatures: [],
                    humidity: [],
                    precipitation: 0,
                    precipitationChance: 0,
                    windSpeed: [],
                    conditions: [],
                    icons: []
                };
            }

            dailyData[dateKey].temperatures.push(item.main.temp);
            dailyData[dateKey].humidity.push(item.main.humidity);
            dailyData[dateKey].windSpeed.push(item.wind.speed * 3.6);
            dailyData[dateKey].conditions.push(item.weather[0].description);
            dailyData[dateKey].icons.push(item.weather[0].icon);

            if (item.rain && item.rain['3h']) {
                dailyData[dateKey].precipitation += item.rain['3h'];
            }

            if (item.snow && item.snow['3h']) {
                dailyData[dateKey].precipitation += item.snow['3h'];
            }

            // Calculate precipitation chance (simplified)
            if (item.weather[0].main.includes('Rain') || item.weather[0].main.includes('Snow')) {
                dailyData[dateKey].precipitationChance = Math.max(
                    dailyData[dateKey].precipitationChance, 
                    70 // Simplified precipitation chance
                );
            }
        });

        // Process daily data
        return Object.values(dailyData).map(day => ({
            date: day.date,
            tempMax: Math.round(Math.max(...day.temperatures)),
            tempMin: Math.round(Math.min(...day.temperatures)),
            humidity: Math.round(day.humidity.reduce((a, b) => a + b) / day.humidity.length),
            precipitation: Math.round(day.precipitation * 10) / 10,
            precipitationChance: day.precipitationChance,
            windSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b) / day.windSpeed.length),
            condition: this.getMostCommonCondition(day.conditions),
            icon: this.getMostCommonIcon(day.icons)
        }));
    }

    getMostCommonCondition(conditions) {
        const counts = {};
        conditions.forEach(condition => {
            counts[condition] = (counts[condition] || 0) + 1;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    getMostCommonIcon(icons) {
        const counts = {};
        icons.forEach(icon => {
            counts[icon] = (counts[icon] || 0) + 1;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    generateAgriculturalInsights(current, forecast, cropType) {
        const insights = [];

        // Temperature insights
        if (current.current.temperature < 10) {
            insights.push({
                type: 'warning',
                title: 'Low Temperature Alert',
                message: 'Current temperature is below 10°C. Consider protecting sensitive crops.',
                priority: 'high'
            });
        }

        if (current.current.temperature > 35) {
            insights.push({
                type: 'warning',
                title: 'High Temperature Alert',
                message: 'High temperature detected. Ensure adequate irrigation.',
                priority: 'high'
            });
        }

        // Humidity insights
        if (current.current.humidity > 85) {
            insights.push({
                type: 'info',
                title: 'High Humidity',
                message: 'High humidity may increase disease risk. Monitor crops closely.',
                priority: 'medium'
            });
        }

        // Wind insights
        if (current.current.windSpeed > 25) {
            insights.push({
                type: 'warning',
                title: 'Strong Winds',
                message: 'Strong winds detected. Secure loose structures and check for crop damage.',
                priority: 'medium'
            });
        }

        // Forecast insights
        const nextRain = forecast.find(day => day.precipitationChance > 50);
        if (nextRain) {
            const daysUntilRain = Math.floor((nextRain.date - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilRain <= 2) {
                insights.push({
                    type: 'info',
                    title: 'Rain Expected',
                    message: `Rain expected in ${daysUntilRain} days. Plan field activities accordingly.`,
                    priority: 'medium'
                });
            }
        }

        // Crop-specific insights
        if (cropType) {
            insights.push(...this.getCropSpecificInsights(current, forecast, cropType));
        }

        return insights;
    }

    getCropSpecificInsights(current, forecast, cropType) {
        const insights = [];

        switch (cropType.toLowerCase()) {
            case 'wheat':
                if (current.current.temperature < 5) {
                    insights.push({
                        type: 'warning',
                        title: 'Wheat Frost Risk',
                        message: 'Temperature below 5°C may affect wheat growth.',
                        priority: 'high'
                    });
                }
                break;

            case 'rice':
                if (current.current.humidity < 60) {
                    insights.push({
                        type: 'info',
                        title: 'Low Humidity for Rice',
                        message: 'Rice grows best in high humidity. Consider increasing irrigation.',
                        priority: 'medium'
                    });
                }
                break;

            case 'corn':
                if (current.current.temperature > 32) {
                    insights.push({
                        type: 'warning',
                        title: 'Heat Stress Risk for Corn',
                        message: 'High temperatures may cause heat stress in corn. Ensure adequate water.',
                        priority: 'high'
                    });
                }
                break;
        }

        return insights;
    }

    generateWeatherAlerts(weather) {
        const alerts = [];

        // Extreme temperature alerts
        if (weather.current.temperature <= 0) {
            alerts.push({
                type: 'critical',
                title: 'Freezing Temperature',
                message: 'Protect crops from frost damage',
                urgency: 'immediate'
            });
        }

        if (weather.current.temperature >= 40) {
            alerts.push({
                type: 'critical',
                title: 'Extreme Heat',
                message: 'Provide shade and extra water for crops',
                urgency: 'immediate'
            });
        }

        // Wind alerts
        if (weather.current.windSpeed > 40) {
            alerts.push({
                type: 'warning',
                title: 'Strong Winds',
                message: 'Secure equipment and check for crop damage',
                urgency: 'soon'
            });
        }

        return alerts;
    }

    async storeWeatherData(weatherData) {
        try {
            const agriculturalData = new AgriculturalData({
                weather: weatherData,
                dataSource: 'openweathermap',
                lastUpdated: new Date(),
                validUntil: new Date(Date.now() + 60 * 60 * 1000) // Valid for 1 hour
            });

            await agriculturalData.save();
            logger.info('Weather data stored successfully');

        } catch (error) {
            logger.error('Error storing weather data:', error);
        }
    }

    // Utility method to get weather icons/emojis
    getWeatherEmoji(condition) {
        const emojiMap = {
            'clear sky': '☀️',
            'few clouds': '🌤️',
            'scattered clouds': '⛅',
            'broken clouds': '☁️',
            'overcast clouds': '☁️',
            'shower rain': '🌦️',
            'rain': '🌧️',
            'thunderstorm': '⛈️',
            'snow': '🌨️',
            'mist': '🌫️',
            'fog': '🌫️'
        };

        return emojiMap[condition.toLowerCase()] || '🌤️';
    }
}

module.exports = new WeatherService();
