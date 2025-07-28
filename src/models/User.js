const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        index: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String
    },
    languageCode: {
        type: String,
        default: 'en'
    },
    isBot: {
        type: Boolean,
        default: false
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    // Agricultural profile
    profile: {
        farmSize: {
            type: Number, // in acres/hectares
            min: 0
        },
        cropTypes: [{
            type: String,
            enum: ['wheat', 'corn', 'rice', 'soybeans', 'cotton', 'vegetables', 'fruits', 'other']
        }],
        farmingType: {
            type: String,
            enum: ['organic', 'conventional', 'hydroponic', 'mixed'],
            default: 'conventional'
        },
        location: {
            country: String,
            state: String,
            city: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        experience: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: 'beginner'
        },
        interests: [{
            type: String,
            enum: ['weather', 'market_prices', 'pest_control', 'fertilizers', 'irrigation', 'technology', 'sustainability']
        }]
    },
    // Bot interaction data
    botData: {
        joinedAt: {
            type: Date,
            default: Date.now
        },
        lastInteraction: {
            type: Date,
            default: Date.now
        },
        messageCount: {
            type: Number,
            default: 0
        },
        commandsUsed: [{
            command: String,
            count: {
                type: Number,
                default: 1
            },
            lastUsed: {
                type: Date,
                default: Date.now
            }
        }],
        preferredLanguage: {
            type: String,
            default: 'en'
        },
        notificationSettings: {
            weather: {
                type: Boolean,
                default: true
            },
            marketPrices: {
                type: Boolean,
                default: true
            },
            tips: {
                type: Boolean,
                default: true
            },
            alerts: {
                type: Boolean,
                default: true
            }
        }
    },
    // Subscription and access
    subscription: {
        type: {
            type: String,
            enum: ['free', 'premium', 'pro'],
            default: 'free'
        },
        expiresAt: Date,
        features: [{
            type: String
        }]
    },
    // Analytics
    analytics: {
        totalSessions: {
            type: Number,
            default: 1
        },
        averageSessionDuration: {
            type: Number,
            default: 0
        },
        favoriteFeatures: [{
            feature: String,
            usage: Number
        }],
        lastActiveTime: {
            type: Date,
            default: Date.now
        }
    },
    // Admin and moderation
    permissions: {
        isAdmin: {
            type: Boolean,
            default: false
        },
        isModerator: {
            type: Boolean,
            default: false
        },
        isBanned: {
            type: Boolean,
            default: false
        },
        banReason: String,
        bannedAt: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ 'profile.location.country': 1, 'profile.location.state': 1 });
userSchema.index({ 'profile.cropTypes': 1 });
userSchema.index({ 'botData.lastInteraction': 1 });
userSchema.index({ 'subscription.type': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName}${this.lastName ? ' ' + this.lastName : ''}`;
});

// Method to update last interaction
userSchema.methods.updateLastInteraction = function() {
    this.botData.lastInteraction = new Date();
    this.analytics.lastActiveTime = new Date();
    return this.save();
};

// Method to increment message count
userSchema.methods.incrementMessageCount = function() {
    this.botData.messageCount += 1;
    return this.updateLastInteraction();
};

// Method to track command usage
userSchema.methods.trackCommand = function(command) {
    const existingCommand = this.botData.commandsUsed.find(cmd => cmd.command === command);
    
    if (existingCommand) {
        existingCommand.count += 1;
        existingCommand.lastUsed = new Date();
    } else {
        this.botData.commandsUsed.push({
            command,
            count: 1,
            lastUsed: new Date()
        });
    }
    
    return this.save();
};

// Static method to find users by location
userSchema.statics.findByLocation = function(country, state = null) {
    const query = { 'profile.location.country': country };
    if (state) {
        query['profile.location.state'] = state;
    }
    return this.find(query);
};

// Static method to find users with specific interests
userSchema.statics.findByInterests = function(interests) {
    return this.find({ 'profile.interests': { $in: interests } });
};

// Pre-save middleware
userSchema.pre('save', function(next) {
    if (this.isModified('botData.lastInteraction')) {
        this.analytics.lastActiveTime = this.botData.lastInteraction;
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
