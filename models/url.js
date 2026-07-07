const mongoose = require('mongoose');

/**
 * URL Schema for storing shortened URLs
 * Includes original URL, short code, click tracking, and metadata
 */
const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: [true, 'Original URL is required'],
        trim: true,
    },
    shortCode: {
        type: String,
        required: [true, 'Short code is required'],
        unique: true,
        trim: true,
        index: true, // Add index for faster lookups
    },
    customAlias: {
        type: String,
        unique: true,
        sparse: true, // Allows null values for non-custom URLs
        trim: true,
    },
    clicks: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    lastAccessedAt: {
        type: Date,
        default: null,
    }
});

// Add index for automatic expiration if needed
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware for any additional validation
urlSchema.pre('save', function(next) {
    // Ensure shortCode is lowercase
    if (this.shortCode) {
        this.shortCode = this.shortCode.toLowerCase();
    }
    next();
});

// Instance method to get full short URL
urlSchema.methods.getShortUrl = function() {
    return `${process.env.BASE_URL}/${this.shortCode}`;
};

// Static method to find by short code
urlSchema.statics.findByShortCode = function(shortCode) {
    return this.findOne({ shortCode: shortCode.toLowerCase() });
};

const Url = mongoose.model('Url', urlSchema);

module.exports = Url;