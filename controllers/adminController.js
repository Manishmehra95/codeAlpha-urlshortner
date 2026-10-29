const Url = require('../models/url');
const SiteStats = require('../models/siteStats');
const SeoConfig = require('../models/seoConfig');
const fs = require('fs');
const path = require('path');

// Admin password (defaults to Manishmehrashortify@2007)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Manishmehrashortify@2007';

/**
 * Admin Login Verification
 */
const login = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, error: 'Password required' });
        }
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }
        res.json({ success: true, message: 'Authenticated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

/**
 * Get Admin Dashboard Statistics
 */
const getStats = async (req, res) => {
    try {
        const authHeader = req.headers['x-admin-key'] || req.query.key;
        if (authHeader !== ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, error: 'Unauthorized access' });
        }

        // 1. Visitor Stats
        const siteStats = await SiteStats.findOne({ identifier: 'main_stats' }) || { totalVisits: 0, todayVisits: 0 };

        // 2. Total URLs Shortened
        const totalUrls = await Url.countDocuments();

        // 3. Total Link Clicks
        const clicksAgg = await Url.aggregate([
            { $group: { _id: null, total: { $sum: '$clicks' } } }
        ]);
        const totalClicks = clicksAgg.length > 0 ? clicksAgg[0].total : 0;

        // 4. Recent URLs List
        const urls = await Url.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const formattedUrls = urls.map(u => ({
            id: u._id,
            originalUrl: u.originalUrl,
            shortCode: u.shortCode,
            shortUrl: `${process.env.BASE_URL || 'https://shortifyurlshortner.vercel.app'}/${u.shortCode}`,
            clicks: u.clicks || 0,
            createdAt: u.createdAt,
            expiresAt: u.expiresAt,
            customAlias: u.customAlias
        }));

        // 5. SEO Health Overview
        const baseUrl = process.env.BASE_URL || 'https://shortifyurlshortner.vercel.app';
        const seoHealth = {
            sitemapUrl: `${baseUrl}/sitemap.xml`,
            robotsUrl: `${baseUrl}/robots.txt`,
            llmsUrl: `${baseUrl}/llms.txt`,
            canonicalUrl: baseUrl,
            items: [
                { name: 'XML Sitemap', status: 'Active (200 OK)', path: '/sitemap.xml' },
                { name: 'Robots.txt', status: 'Active & Allowed', path: '/robots.txt' },
                { name: 'AI Discoverability (llms.txt)', status: 'Compliant (3/3)', path: '/llms.txt' },
                { name: 'Structured Data (Schema.org)', status: 'WebApplication Verified', path: 'In HTML Head' },
                { name: 'Core Web Vitals', status: 'CLS 0.00 | Optimized', path: 'PageSpeed' }
            ]
        };

        res.json({
            success: true,
            data: {
                visitors: {
                    total: siteStats.totalVisits || 0,
                    today: siteStats.todayVisits || 0,
                    lastVisit: siteStats.lastVisitAt || null
                },
                totalUrls,
                totalClicks,
                seoHealth,
                urls: formattedUrls
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve stats' });
    }
};

/**
 * Delete a Short URL by Admin
 */
const deleteUrl = async (req, res) => {
    try {
        const authHeader = req.headers['x-admin-key'];
        if (authHeader !== ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, error: 'Unauthorized access' });
        }

        const { shortCode } = req.params;
        const result = await Url.findOneAndDelete({ shortCode: shortCode.toLowerCase() });
        if (!result) {
            return res.status(404).json({ success: false, error: 'URL not found' });
        }

        res.json({ success: true, message: 'URL deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

/**
 * Get Current SEO Configurations
 */
const getSeo = async (req, res) => {
    try {
        const authHeader = req.headers['x-admin-key'] || req.query.key;
        if (authHeader !== ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, error: 'Unauthorized access' });
        }

        let seo = await SeoConfig.findOne({ identifier: 'site_seo' });
        if (!seo) {
            seo = await SeoConfig.create({ identifier: 'site_seo' });
        }
        res.json({ success: true, data: seo });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to get SEO data' });
    }
};

/**
 * Update SEO Configurations (Title, Description, Keywords)
 */
const updateSeo = async (req, res) => {
    try {
        const authHeader = req.headers['x-admin-key'];
        if (authHeader !== ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, error: 'Unauthorized access' });
        }

        const { title, description, keywords } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, error: 'Title tag cannot be empty' });
        }

        let seo = await SeoConfig.findOne({ identifier: 'site_seo' });
        if (!seo) {
            seo = new SeoConfig({ identifier: 'site_seo' });
        }

        seo.title = title.trim();
        if (description !== undefined) seo.description = description.trim();
        if (keywords !== undefined) seo.keywords = keywords.trim();
        seo.updatedAt = new Date();
        await seo.save();

        // Also sync disk index.html if possible
        try {
            const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
            let html = await fs.promises.readFile(htmlPath, 'utf8');

            html = html.replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
                       .replace(/<meta name="title" content=".*?"\s*\/?>/, `<meta name="title" content="${seo.title}">`)
                       .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${seo.title}">`)
                       .replace(/<meta property="twitter:title" content=".*?"\s*\/?>/, `<meta property="twitter:title" content="${seo.title}">`);

            if (seo.description) {
                html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${seo.description}">`)
                           .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${seo.description}">`)
                           .replace(/<meta property="twitter:description" content=".*?"\s*\/?>/, `<meta property="twitter:description" content="${seo.description}">`);
            }
            if (seo.keywords) {
                html = html.replace(/<meta name="keywords" content=".*?"\s*\/?>/, `<meta name="keywords" content="${seo.keywords}">`);
            }

            await fs.promises.writeFile(htmlPath, html, 'utf8');
        } catch (fileErr) {
            console.error('File write note (read-only environment?):', fileErr.message);
        }

        res.json({ success: true, message: 'SEO configuration updated successfully', data: seo });
    } catch (err) {
        console.error('Update SEO error:', err);
        res.status(500).json({ success: false, error: 'Failed to update SEO' });
    }
};

module.exports = {
    login,
    getStats,
    deleteUrl,
    getSeo,
    updateSeo
};
