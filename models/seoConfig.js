const mongoose = require('mongoose');

const seoConfigSchema = new mongoose.Schema({
    identifier: {
        type: String,
        default: 'site_seo',
        unique: true
    },
    title: {
        type: String,
        default: 'Shortify'
    },
    description: {
        type: String,
        default: 'Shortify is a free, lightning-fast, and secure URL Shortener. Convert long links into easy-to-share short URLs with custom aliases, instant QR codes, and click tracking.'
    },
    keywords: {
        type: String,
        default: 'Shortify, URL Shortener, Free URL Shortener, Best URL Shortener, Online Link Shortener, TinyURL Alternative, Bitly Alternative, Custom Short Links, QR Code URL Generator, Fast URL Shortener, Link Analytics'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SeoConfig', seoConfigSchema);
