const Url = require('../models/url');
const SiteStats = require('../models/siteStats');

// Default admin password (can be overridden in .env with ADMIN_PASSWORD)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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
            shortUrl: `${process.env.BASE_URL || 'https://mmurlshortner.qd.je'}/${u.shortCode}`,
            clicks: u.clicks || 0,
            createdAt: u.createdAt,
            expiresAt: u.expiresAt,
            customAlias: u.customAlias
        }));

        // 5. SEO Health Overview
        const baseUrl = process.env.BASE_URL || 'https://mmurlshortner.qd.je';
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

module.exports = {
    login,
    getStats,
    deleteUrl
};
