const validUrl = require('valid-url');
const { nanoid } = require('nanoid');
const Url = require('../models/url');

/**
 * URL Controller
 * Handles all URL shortening and redirection logic
 */

// @desc    Shorten a URL
// @route   POST /api/shorten
// @access  Public
const shortenUrl = async (req, res) => {
    try {
        const { originalUrl, customAlias, expiresInDays } = req.body;

        // Validate URL
        if (!originalUrl) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a URL to shorten'
            });
        }

        // Check if URL is valid
        if (!validUrl.isUri(originalUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid URL (including http:// or https://)'
            });
        }

        // Check if URL already exists in database
        const existingUrl = await Url.findOne({ originalUrl });
        if (existingUrl) {
            return res.status(200).json({
                success: true,
                data: {
                    originalUrl: existingUrl.originalUrl,
                    shortUrl: existingUrl.getShortUrl(),
                    shortCode: existingUrl.shortCode,
                    clicks: existingUrl.clicks,
                    createdAt: existingUrl.createdAt,
                    customAlias: existingUrl.customAlias || null
                }
            });
        }

        // Handle custom alias
        let shortCode;
        if (customAlias) {
            // Validate custom alias (alphanumeric, 4-20 characters)
            const aliasRegex = /^[a-zA-Z0-9_-]{4,20}$/;
            if (!aliasRegex.test(customAlias)) {
                return res.status(400).json({
                    success: false,
                    error: 'Custom alias must be 4-20 characters and can only contain letters, numbers, hyphens, and underscores'
                });
            }

            // Check if alias is already taken
            const existingAlias = await Url.findOne({ 
                $or: [{ shortCode: customAlias }, { customAlias }] 
            });
            if (existingAlias) {
                return res.status(400).json({
                    success: false,
                    error: 'This custom alias is already taken'
                });
            }
            shortCode = customAlias;
        } else {
            // Generate unique short code
            shortCode = nanoid(6);
            // Ensure uniqueness (in case of collision)
            let existingCode = await Url.findOne({ shortCode });
            while (existingCode) {
                shortCode = nanoid(6);
                existingCode = await Url.findOne({ shortCode });
            }
        }

        // Calculate expiration date if provided
        let expiresAt = null;
        if (expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        }

        // Create new URL document
const urlData = {
    originalUrl,
    shortCode,
    expiresAt
};

// Add custom alias only if provided
if (customAlias && customAlias.trim()) {
    urlData.customAlias = customAlias.trim().toLowerCase();
}

const url = new Url(urlData);

// Save to database
await url.save();

        // Return success response
        res.status(201).json({
            success: true,
            data: {
                originalUrl: url.originalUrl,
                shortUrl: url.getShortUrl(),
                shortCode: url.shortCode,
                clicks: url.clicks,
                createdAt: url.createdAt,
                expiresAt: url.expiresAt,
                customAlias: url.customAlias || null
            }
        });

    } catch (error) {
        console.error('Error shortening URL:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Short code already exists. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error while shortening URL'
        });
    }
};

// @desc    Redirect to original URL
// @route   GET /:shortCode
// @access  Public
const redirectUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;

        // Find URL by short code
        const url = await Url.findByShortCode(shortCode);

        // Check if URL exists
        if (!url) {
            return res.status(404).sendFile('404.html', { root: './public' });
        }

        // Check if URL has expired
        if (url.expiresAt && url.expiresAt < new Date()) {
            return res.status(410).json({
                success: false,
                error: 'This URL has expired'
            });
        }

        // Increment click counter
        url.clicks += 1;
        url.lastAccessedAt = new Date();
        await url.save();

        // Redirect to original URL
        res.redirect(url.originalUrl);

    } catch (error) {
        console.error('Error redirecting URL:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while redirecting'
        });
    }
};

// @desc    Get URL statistics
// @route   GET /api/stats/:shortCode
// @access  Public
const getUrlStats = async (req, res) => {
    try {
        const { shortCode } = req.params;

        // Find URL by short code
        const url = await Url.findByShortCode(shortCode);

        if (!url) {
            return res.status(404).json({
                success: false,
                error: 'URL not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                originalUrl: url.originalUrl,
                shortUrl: url.getShortUrl(),
                shortCode: url.shortCode,
                clicks: url.clicks,
                createdAt: url.createdAt,
                lastAccessedAt: url.lastAccessedAt,
                expiresAt: url.expiresAt
            }
        });

    } catch (error) {
        console.error('Error getting URL stats:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching statistics'
        });
    }
};

// @desc    Delete a shortened URL
// @route   DELETE /api/url/:shortCode
// @access  Public
const deleteUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;

        // Find and delete the URL
        const url = await Url.findOneAndDelete({ shortCode });

        if (!url) {
            return res.status(404).json({
                success: false,
                error: 'URL not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'URL deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting URL:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting URL'
        });
    }
};

module.exports = {
    shortenUrl,
    redirectUrl,
    getUrlStats,
    deleteUrl
};