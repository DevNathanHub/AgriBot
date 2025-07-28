const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateTelegramLogin, generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Telegram authentication endpoint
router.post('/telegram', async (req, res) => {
    try {
        const authData = req.body;

        // Validate Telegram authentication data
        validateTelegramLogin(authData);

        // Extract user data
        const telegramUser = {
            telegramId: parseInt(authData.id),
            username: authData.username,
            firstName: authData.first_name,
            lastName: authData.last_name,
            photoUrl: authData.photo_url
        };

        // Get or create user
        let user = await User.findOne({ telegramId: telegramUser.telegramId });

        if (!user) {
            // Create new user
            user = new User({
                telegramId: telegramUser.telegramId,
                username: telegramUser.username,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName
            });
            await user.save();
            logger.info(`New user registered via API: ${telegramUser.telegramId}`);
        } else {
            // Update existing user info
            let updated = false;
            if (user.username !== telegramUser.username) {
                user.username = telegramUser.username;
                updated = true;
            }
            if (user.firstName !== telegramUser.firstName) {
                user.firstName = telegramUser.firstName;
                updated = true;
            }
            if (user.lastName !== telegramUser.lastName) {
                user.lastName = telegramUser.lastName;
                updated = true;
            }
            
            if (updated) {
                await user.save();
            }
            
            await user.updateLastInteraction();
        }

        // Check if user is banned
        if (user.permissions.isBanned) {
            return res.status(403).json({
                error: 'Account banned',
                message: 'Your account has been banned',
                banReason: user.permissions.banReason
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                profile: user.profile,
                subscription: user.subscription,
                permissions: user.permissions
            }
        });

    } catch (error) {
        logger.error('Telegram authentication error:', error);
        
        if (error.message.includes('Invalid authentication data') || 
            error.message.includes('Hash is required') ||
            error.message.includes('too old')) {
            return res.status(400).json({
                error: 'Invalid authentication',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Authentication failed',
            message: 'Internal server error during authentication'
        });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: 'No token provided',
                message: 'Authentication token is required'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findOne({ telegramId: decoded.telegramId });
        
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
        }

        if (user.permissions.isBanned) {
            return res.status(403).json({
                error: 'Account banned',
                message: 'Your account has been banned',
                banReason: user.permissions.banReason
            });
        }

        res.json({
            valid: true,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                subscription: user.subscription
            }
        });

    } catch (error) {
        logger.error('Token verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                valid: false,
                error: 'Invalid token',
                message: 'Authentication token is invalid'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                valid: false,
                error: 'Token expired',
                message: 'Authentication token has expired'
            });
        }

        res.status(500).json({
            valid: false,
            error: 'Verification failed',
            message: 'Internal server error during token verification'
        });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                error: 'Refresh token required',
                message: 'Refresh token is required'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { ignoreExpiration: true });
        
        const user = await User.findOne({ telegramId: decoded.telegramId });
        
        if (!user || user.permissions.isBanned) {
            return res.status(401).json({
                error: 'Invalid refresh token',
                message: 'User not found or account banned'
            });
        }

        // Generate new tokens
        const newToken = generateToken(user);

        res.json({
            success: true,
            token: newToken,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });

    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(401).json({
            error: 'Refresh failed',
            message: 'Unable to refresh authentication token'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    // Since we're using stateless JWT, logout is handled client-side
    // This endpoint can be used for logging purposes
    logger.info(`User logged out: ${req.user?.telegramId || 'unknown'}`);
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get authentication status
router.get('/status', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.json({
                authenticated: false,
                user: null
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ telegramId: decoded.telegramId });
        
        if (!user || user.permissions.isBanned) {
            return res.json({
                authenticated: false,
                user: null
            });
        }

        res.json({
            authenticated: true,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                subscription: user.subscription.type,
                profileComplete: !!(user.profile?.location && user.profile?.cropTypes?.length > 0)
            }
        });

    } catch (error) {
        res.json({
            authenticated: false,
            user: null
        });
    }
});

module.exports = router;
