const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Rate limiter for API requests
const apiLimiter = new RateLimiterMemory({
    keyGenerator: (req) => {
        // Use user ID from Telegram auth or IP address
        return req.user?.telegramId || req.ip;
    },
    storeClient: undefined, // Use memory store
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60, // Per 15 minutes
    execEvenly: true // Distribute requests evenly across duration
});

// Rate limiter for bot commands (more restrictive)
const botLimiter = new RateLimiterMemory({
    keyGenerator: (userId) => `bot_${userId}`,
    points: 30, // 30 commands
    duration: 60, // per minute
    execEvenly: true
});

// Rate limiter for message processing
const messageLimiter = new RateLimiterMemory({
    keyGenerator: (userId) => `message_${userId}`,
    points: 60, // 60 messages
    duration: 60, // per minute
    execEvenly: true
});

// Express middleware for API rate limiting
const rateLimiter = async (req, res, next) => {
    try {
        await apiLimiter.consume(req.user?.telegramId || req.ip);
        next();
    } catch (rateLimiterRes) {
        logger.warn(`Rate limit exceeded for ${req.user?.telegramId || req.ip}`);
        
        const remainingTime = Math.round(rateLimiterRes.msBeforeNext / 1000);
        
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: remainingTime,
            limit: apiLimiter.points,
            remaining: rateLimiterRes.remainingPoints || 0,
            resetTime: new Date(Date.now() + rateLimiterRes.msBeforeNext)
        });
    }
};

// Bot command rate limiting
const checkBotRateLimit = async (userId) => {
    try {
        await botLimiter.consume(userId);
        return { allowed: true };
    } catch (rateLimiterRes) {
        const remainingTime = Math.round(rateLimiterRes.msBeforeNext / 1000);
        
        logger.warn(`Bot rate limit exceeded for user ${userId}`);
        
        return {
            allowed: false,
            remainingTime,
            message: `You're sending commands too quickly! Please wait ${remainingTime} seconds before trying again.`
        };
    }
};

// Message processing rate limiting
const checkMessageRateLimit = async (userId) => {
    try {
        await messageLimiter.consume(userId);
        return { allowed: true };
    } catch (rateLimiterRes) {
        const remainingTime = Math.round(rateLimiterRes.msBeforeNext / 1000);
        
        logger.warn(`Message rate limit exceeded for user ${userId}`);
        
        return {
            allowed: false,
            remainingTime,
            message: `Please slow down! You can send up to 60 messages per minute. Try again in ${remainingTime} seconds.`
        };
    }
};

// Get rate limit status
const getRateLimitStatus = async (userId, type = 'api') => {
    let limiter;
    let key = userId;

    switch (type) {
        case 'bot':
            limiter = botLimiter;
            key = `bot_${userId}`;
            break;
        case 'message':
            limiter = messageLimiter;
            key = `message_${userId}`;
            break;
        default:
            limiter = apiLimiter;
            break;
    }

    try {
        const resRateLimiter = await limiter.get(key);
        
        if (resRateLimiter) {
            return {
                remaining: resRateLimiter.remainingPoints,
                total: limiter.points,
                resetTime: new Date(Date.now() + resRateLimiter.msBeforeNext),
                blocked: resRateLimiter.remainingPoints <= 0
            };
        } else {
            return {
                remaining: limiter.points,
                total: limiter.points,
                resetTime: null,
                blocked: false
            };
        }
    } catch (error) {
        logger.error('Error getting rate limit status:', error);
        return {
            remaining: 0,
            total: limiter.points,
            resetTime: null,
            blocked: true
        };
    }
};

// Reset rate limit for user (admin function)
const resetRateLimit = async (userId, type = 'all') => {
    try {
        const promises = [];

        if (type === 'all' || type === 'api') {
            promises.push(apiLimiter.delete(userId));
        }
        if (type === 'all' || type === 'bot') {
            promises.push(botLimiter.delete(`bot_${userId}`));
        }
        if (type === 'all' || type === 'message') {
            promises.push(messageLimiter.delete(`message_${userId}`));
        }

        await Promise.all(promises);
        
        logger.info(`Rate limit reset for user ${userId}, type: ${type}`);
        return true;
    } catch (error) {
        logger.error('Error resetting rate limit:', error);
        return false;
    }
};

// Advanced rate limiting for premium users
const premiumLimiter = new RateLimiterMemory({
    keyGenerator: (userId) => `premium_${userId}`,
    points: 200, // Double the limit for premium users
    duration: 15 * 60, // 15 minutes
    execEvenly: true
});

// Check if user has premium rate limits
const checkPremiumRateLimit = async (userId) => {
    try {
        await premiumLimiter.consume(userId);
        return { allowed: true };
    } catch (rateLimiterRes) {
        const remainingTime = Math.round(rateLimiterRes.msBeforeNext / 1000);
        
        return {
            allowed: false,
            remainingTime,
            message: `Premium rate limit exceeded. Please wait ${remainingTime} seconds.`
        };
    }
};

// Adaptive rate limiting based on user behavior
class AdaptiveRateLimiter {
    constructor() {
        this.userScores = new Map(); // Track user behavior scores
        this.suspiciousThreshold = 0.7;
        this.trustedThreshold = 0.3;
    }

    // Calculate user trust score based on behavior
    calculateTrustScore(userId, messageCount, commandCount, reportCount = 0) {
        const messageRatio = commandCount / Math.max(messageCount, 1);
        const reportRatio = reportCount / Math.max(messageCount, 1);
        
        // Higher command ratio and report ratio = lower trust
        const score = Math.max(0, 1 - (messageRatio * 0.5 + reportRatio * 2));
        
        this.userScores.set(userId, score);
        return score;
    }

    // Get adjusted rate limit based on trust score
    getAdjustedLimit(userId, baseLimit = 100) {
        const trustScore = this.userScores.get(userId) || 0.5;
        
        if (trustScore < this.trustedThreshold) {
            return Math.floor(baseLimit * 0.5); // Reduce limit for untrusted users
        } else if (trustScore > this.suspiciousThreshold) {
            return Math.floor(baseLimit * 1.5); // Increase limit for trusted users
        }
        
        return baseLimit;
    }

    // Check if user should be temporarily blocked
    shouldBlock(userId) {
        const trustScore = this.userScores.get(userId) || 0.5;
        return trustScore < 0.1; // Block users with very low trust scores
    }
}

const adaptiveLimiter = new AdaptiveRateLimiter();

// Middleware for adaptive rate limiting
const adaptiveRateLimiter = async (req, res, next) => {
    const userId = req.user?.telegramId;
    
    if (!userId) {
        return rateLimiter(req, res, next);
    }

    // Check if user should be blocked
    if (adaptiveLimiter.shouldBlock(userId)) {
        logger.warn(`User ${userId} blocked due to low trust score`);
        return res.status(429).json({
            error: 'Access Temporarily Restricted',
            message: 'Your account has been temporarily restricted due to suspicious activity.'
        });
    }

    // Get adjusted limit
    const adjustedLimit = adaptiveLimiter.getAdjustedLimit(userId);
    
    // Create temporary limiter with adjusted limit
    const tempLimiter = new RateLimiterMemory({
        keyGenerator: () => userId,
        points: adjustedLimit,
        duration: 15 * 60,
        execEvenly: true
    });

    try {
        await tempLimiter.consume(userId);
        next();
    } catch (rateLimiterRes) {
        const remainingTime = Math.round(rateLimiterRes.msBeforeNext / 1000);
        
        res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: `Rate limit exceeded. Please try again in ${remainingTime} seconds.`,
            retryAfter: remainingTime,
            limit: adjustedLimit,
            remaining: rateLimiterRes.remainingPoints || 0
        });
    }
};

module.exports = {
    rateLimiter,
    adaptiveRateLimiter,
    checkBotRateLimit,
    checkMessageRateLimit,
    checkPremiumRateLimit,
    getRateLimitStatus,
    resetRateLimit,
    adaptiveLimiter
};
