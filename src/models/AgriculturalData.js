const mongoose = require('mongoose');

const agriculturalDataSchema = new mongoose.Schema({
    // Weather data
    weather: {
        location: {
            country: String,
            state: String,
            city: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        current: {
            temperature: Number,
            humidity: Number,
            pressure: Number,
            windSpeed: Number,
            windDirection: Number,
            visibility: Number,
            uvIndex: Number,
            condition: String,
            icon: String
        },
        forecast: [{
            date: Date,
            tempMax: Number,
            tempMin: Number,
            humidity: Number,
            precipitation: Number,
            precipitationChance: Number,
            windSpeed: Number,
            condition: String,
            icon: String
        }]
    },
    
    // Market prices
    marketPrices: [{
        crop: {
            type: String,
            required: true
        },
        variety: String,
        market: String,
        location: {
            country: String,
            state: String,
            city: String
        },
        price: {
            value: Number,
            currency: String,
            unit: String // per kg, per ton, per bushel, etc.
        },
        priceChange: {
            percentage: Number,
            direction: {
                type: String,
                enum: ['up', 'down', 'stable']
            }
        },
        quality: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Crop information
    crops: [{
        name: {
            type: String,
            required: true
        },
        scientificName: String,
        category: {
            type: String,
            enum: ['cereal', 'legume', 'vegetable', 'fruit', 'cash_crop', 'fodder']
        },
        varieties: [String],
        growingConditions: {
            climate: String,
            soilType: [String],
            phRange: {
                min: Number,
                max: Number
            },
            temperature: {
                min: Number,
                max: Number
            },
            rainfall: {
                min: Number,
                max: Number
            }
        },
        plantingInfo: {
            season: [String],
            sowingTime: String,
            harvestTime: String,
            seedRate: String,
            spacing: String,
            depth: String
        },
        nutrients: {
            nitrogen: String,
            phosphorus: String,
            potassium: String,
            micronutrients: [String]
        },
        commonDiseases: [{
            name: String,
            symptoms: [String],
            prevention: [String],
            treatment: [String]
        }],
        commonPests: [{
            name: String,
            symptoms: [String],
            prevention: [String],
            treatment: [String]
        }]
    }],
    
    // Agricultural tips and advice
    tips: [{
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: [
                'planting',
                'watering',
                'fertilizing',
                'pest_control',
                'disease_management',
                'harvesting',
                'post_harvest',
                'weather',
                'soil_management',
                'technology',
                'sustainability'
            ]
        },
        applicableSeasons: [String],
        applicableCrops: [String],
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        tags: [String],
        author: String,
        verified: {
            type: Boolean,
            default: false
        },
        likes: {
            type: Number,
            default: 0
        },
        views: {
            type: Number,
            default: 0
        }
    }],
    
    // News and updates
    news: [{
        title: {
            type: String,
            required: true
        },
        summary: String,
        content: String,
        source: String,
        url: String,
        publishedAt: Date,
        category: {
            type: String,
            enum: [
                'weather',
                'market',
                'policy',
                'technology',
                'research',
                'sustainability',
                'farming_practices'
            ]
        },
        relevantLocations: [String],
        relevantCrops: [String],
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        }
    }],
    
    // Data metadata
    dataSource: {
        type: String,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    validUntil: Date,
    quality: {
        accuracy: Number,
        completeness: Number,
        reliability: Number
    }
}, {
    timestamps: true
});

// Indexes for better performance
agriculturalDataSchema.index({ 'weather.location.country': 1, 'weather.location.state': 1 });
agriculturalDataSchema.index({ 'marketPrices.crop': 1, 'marketPrices.date': -1 });
agriculturalDataSchema.index({ 'crops.name': 1 });
agriculturalDataSchema.index({ 'tips.category': 1, 'tips.priority': -1 });
agriculturalDataSchema.index({ 'news.category': 1, 'news.publishedAt': -1 });

// Static methods for weather data
agriculturalDataSchema.statics.getCurrentWeather = function(location) {
    return this.findOne({
        'weather.location.country': location.country,
        'weather.location.state': location.state
    }).sort({ lastUpdated: -1 });
};

// Static methods for market prices
agriculturalDataSchema.statics.getMarketPrices = function(crop, location) {
    const query = { 'marketPrices.crop': crop };
    if (location) {
        query['marketPrices.location.country'] = location.country;
        if (location.state) {
            query['marketPrices.location.state'] = location.state;
        }
    }
    return this.find(query)
        .sort({ 'marketPrices.date': -1 })
        .limit(10);
};

// Static methods for tips
agriculturalDataSchema.statics.getTipsByCategory = function(category, limit = 10) {
    return this.find({ 'tips.category': category })
        .sort({ 'tips.priority': -1, 'tips.likes': -1 })
        .limit(limit);
};

// Static methods for news
agriculturalDataSchema.statics.getRecentNews = function(category, limit = 10) {
    const query = category ? { 'news.category': category } : {};
    return this.find(query)
        .sort({ 'news.publishedAt': -1 })
        .limit(limit);
};

module.exports = mongoose.model('AgriculturalData', agriculturalDataSchema);
