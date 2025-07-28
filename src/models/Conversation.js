const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        ref: 'User',
        index: true
    },
    chatId: {
        type: Number,
        required: true,
        index: true
    },
    messageId: {
        type: Number,
        required: true
    },
    // Message content
    message: {
        text: String,
        type: {
            type: String,
            enum: ['text', 'photo', 'document', 'voice', 'video', 'location', 'contact', 'sticker'],
            default: 'text'
        },
        mediaUrl: String,
        fileId: String
    },
    // Bot response
    botResponse: {
        text: String,
        type: {
            type: String,
            enum: ['text', 'photo', 'document', 'voice', 'video', 'location', 'inline_keyboard'],
            default: 'text'
        },
        mediaUrl: String,
        inlineKeyboard: mongoose.Schema.Types.Mixed
    },
    // Context and intent
    intent: {
        type: String,
        enum: [
            'greeting',
            'weather_query',
            'crop_advice',
            'market_prices',
            'pest_control',
            'irrigation',
            'fertilizer',
            'disease_diagnosis',
            'general_agriculture',
            'help',
            'settings',
            'subscription',
            'feedback',
            'other'
        ]
    },
    entities: [{
        type: {
            type: String,
            enum: ['crop', 'location', 'date', 'disease', 'pest', 'weather_condition']
        },
        value: String,
        confidence: Number
    }],
    context: {
        previousIntent: String,
        sessionId: String,
        conversationFlow: String
    },
    // AI and processing
    aiProcessing: {
        processed: {
            type: Boolean,
            default: false
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1
        },
        processingTime: Number, // in milliseconds
        model: String,
        tokens: {
            input: Number,
            output: Number
        }
    },
    // Analytics
    analytics: {
        responseTime: Number, // in milliseconds
        userSatisfaction: {
            type: Number,
            min: 1,
            max: 5
        },
        wasHelpful: Boolean,
        followUpQuestions: Number
    },
    // Metadata
    metadata: {
        platform: {
            type: String,
            default: 'telegram'
        },
        userAgent: String,
        ipAddress: String,
        deviceType: String
    }
}, {
    timestamps: true
});

// Indexes for better performance
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ chatId: 1, createdAt: -1 });
conversationSchema.index({ intent: 1, createdAt: -1 });
conversationSchema.index({ 'aiProcessing.processed': 1 });

// Static method to get user conversation history
conversationSchema.statics.getUserHistory = function(userId, limit = 50) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'firstName lastName username');
};

// Static method to get conversations by intent
conversationSchema.statics.getByIntent = function(intent, startDate, endDate) {
    const query = { intent };
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
    }
    return this.find(query).sort({ createdAt: -1 });
};

// Method to mark as processed
conversationSchema.methods.markAsProcessed = function(confidence, processingTime, model) {
    this.aiProcessing.processed = true;
    this.aiProcessing.confidence = confidence;
    this.aiProcessing.processingTime = processingTime;
    this.aiProcessing.model = model;
    return this.save();
};

// Method to add user feedback
conversationSchema.methods.addFeedback = function(satisfaction, wasHelpful) {
    this.analytics.userSatisfaction = satisfaction;
    this.analytics.wasHelpful = wasHelpful;
    return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
