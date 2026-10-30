// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const compression = require('compression');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Import routes
const urlRoutes = require('./routes/urlRoutes');
const adminRoutes = require('./routes/adminRoutes');
const SiteStats = require('./models/siteStats');
const SeoConfig = require('./models/seoConfig');
const fs = require('fs');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(compression()); // Gzip/Brotli compression for fast loading
app.use(cors()); // Enable CORS for all routes
app.use(morgan('dev')); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Fast routes for SEO & browser essentials
app.get(['/llms.txt', '/.well-known/llms.txt'], (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'llms.txt'));
});

app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Admin Panel Web Routes (accessible via /admin, /dashboard, /portal)
app.get(['/admin', '/dashboard', '/portal'], (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Helper to filter out automated bots/crawlers from inflating visitor counts
const isBot = (ua) => {
    if (!ua) return false;
    return /bot|crawler|spider|crawling|lighthouse|uptime|pingdom|googlebot|bingbot|yahoo|duckduckbot|baiduspider|yandexbot/i.test(ua);
};

// Track website visitors and serve dynamic SEO tags on homepage
app.get(['/', '/index.html'], async (req, res) => {
    // 1. Record real visitor visit
    const userAgent = req.headers['user-agent'] || '';
    if (!isBot(userAgent)) {
        try {
            await SiteStats.recordVisit();
        } catch (err) {
            console.error('Visit track error on GET /:', err);
        }
    }

    // 2. Read and dynamically inject SEO tags into index.html
    try {
        let html = await fs.promises.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8');
        try {
            const seo = await SeoConfig.findOne({ identifier: 'site_seo' });
            if (seo) {
                if (seo.title) {
                    html = html.replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
                               .replace(/<meta name="title" content=".*?"\s*\/?>/, `<meta name="title" content="${seo.title}">`)
                               .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${seo.title}">`)
                               .replace(/<meta property="twitter:title" content=".*?"\s*\/?>/, `<meta property="twitter:title" content="${seo.title}">`);
                }
                if (seo.description) {
                    html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${seo.description}">`)
                               .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${seo.description}">`)
                               .replace(/<meta property="twitter:description" content=".*?"\s*\/?>/, `<meta property="twitter:description" content="${seo.description}">`);
                }
                if (seo.keywords) {
                    html = html.replace(/<meta name="keywords" content=".*?"\s*\/?>/, `<meta name="keywords" content="${seo.keywords}">`);
                }
            }
        } catch (seoErr) {
            console.error('Dynamic SEO fetch error:', seoErr);
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        return res.send(html);
    } catch (readErr) {
        console.error('Error reading index.html:', readErr);
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Client-Side Visit Ping API (for PWA, mobile background cache, and instant tracking)
app.post('/api/track-visit', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    if (isBot(userAgent)) {
        return res.json({ success: true, ignored: 'bot' });
    }
    try {
        const stats = await SiteStats.recordVisit();
        res.json({
            success: true,
            totalVisits: stats.totalVisits,
            todayVisits: stats.todayVisits
        });
    } catch (e) {
        console.error('API track visit error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Serve static assets with index: false so express.static NEVER overrides '/'
app.use(express.static(path.join(__dirname, 'public'), {
    index: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.match(/\.(css|js)$/)) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|woff2|woff)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
}));

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api', urlRoutes);

// Redirect route for short URLs
app.use('/', urlRoutes);

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// Define port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});
