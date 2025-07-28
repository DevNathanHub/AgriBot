const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Telegram authentication middleware
const telegramAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No authentication token provided'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findOne({ telegramId: decoded.telegramId });
        
        if (!user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid authentication token'
            });
        }

        // Check if user is banned
        if (user.permissions.isBanned) {
            return res.status(403).json({
                error: 'Access forbidden',
                message: 'Your account has been banned',
                banReason: user.permissions.banReason
            });
        }

        // Update last interaction
        await user.updateLastInteraction();

        // Add user to request object
        req.user = user;
        next();

    } catch (error) {
        logger.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid authentication token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Authentication token has expired'
            });
        }

        return res.status(500).json({
            error: 'Authentication error',
            message: 'Internal server error during authentication'
        });
    }
};

// Optional authentication (for public endpoints that can work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ telegramId: decoded.telegramId });
            
            if (user && !user.permissions.isBanned) {
                req.user = user;
                await user.updateLastInteraction();
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication for optional endpoints
        next();
    }
};

// Admin authentication
const adminAuth = async (req, res, next) => {
    try {
        // First run telegram auth
        await new Promise((resolve, reject) => {
            telegramAuth(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Check if user is admin
        if (!req.user.permissions.isAdmin) {
            return res.status(403).json({
                error: 'Access forbidden',
                message: 'Admin privileges required'
            });
        }

        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Access forbidden',
            message: 'Admin authentication failed'
        });
    }
};

// Moderator authentication
const moderatorAuth = async (req, res, next) => {
    try {
        // First run telegram auth
        await new Promise((resolve, reject) => {
            telegramAuth(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Check if user is admin or moderator
        if (!req.user.permissions.isAdmin && !req.user.permissions.isModerator) {
            return res.status(403).json({
                error: 'Access forbidden',
                message: 'Moderator privileges required'
            });
        }

        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Access forbidden',
            message: 'Moderator authentication failed'
        });
    }
};

// Premium subscription check
const premiumAuth = async (req, res, next) => {
    try {
        // First run telegram auth
        await new Promise((resolve, reject) => {
            telegramAuth(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Check subscription status
        const subscription = req.user.subscription;
        const now = new Date();

        if (subscription.type === 'free') {
            return res.status(402).json({
                error: 'Premium required',
                message: 'This feature requires a premium subscription',
                subscriptionType: subscription.type
            });
        }

        if (subscription.expiresAt && subscription.expiresAt < now) {
            return res.status(402).json({
                error: 'Subscription expired',
                message: 'Your premium subscription has expired',
                expiredAt: subscription.expiresAt
            });
        }

        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Access forbidden',
            message: 'Premium authentication failed'
        });
    }
};

// Validate Telegram login data
const validateTelegramLogin = (authData) => {
    const { hash, ...data } = authData;
    
    if (!hash) {
        throw new Error('Hash is required');
    }

    // Create data check string
    const dataCheckArr = [];
    for (const [key, value] of Object.entries(data)) {
        dataCheckArr.push(`${key}=${value}`);
    }
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // Create secret key
    const crypto = require('crypto');
    const secretKey = crypto.createHash('sha256')
        .update(process.env.BOT_TOKEN)
        .digest();

    // Calculate hash
    const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Verify hash
    if (calculatedHash !== hash) {
        throw new Error('Invalid authentication data');
    }

    // Check auth date (should be within 1 day)
    const authDate = new Date(parseInt(data.auth_date) * 1000);
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;

    if (now - authDate > dayInMs) {
        throw new Error('Authentication data is too old');
    }

    return true;
};

// Generate JWT token for authenticated user
const generateToken = (user) => {
    return jwt.sign(
        {
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
};

// Refresh token
const refreshToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No authentication token provided'
            });
        }

        // Verify token (even if expired)
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        
        // Get user from database
        const user = await User.findOne({ telegramId: decoded.telegramId });
        
        if (!user || user.permissions.isBanned) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid user or account banned'
            });
        }

        // Generate new token
        const newToken = generateToken(user);

        res.json({
            token: newToken,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                subscription: user.subscription
            }
        });

    } catch (error) {
        logger.error('Token refresh error:', error);
        return res.status(401).json({
            error: 'Token refresh failed',
            message: 'Unable to refresh authentication token'
        });
    }
};

module.exports = {
    telegramAuth,
    optionalAuth,
    adminAuth,
    moderatorAuth,
    premiumAuth,
    validateTelegramLogin,
    generateToken,
    refreshToken
};
