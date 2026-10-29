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

// Serve static files from the public directory with smart caching headers
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.match(/\.(css|js)$/)) {
            // HTML, JS, and CSS always revalidate so updates are instant
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|woff2|woff)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
}));

// Dedicated routes for robots, sitemap, and Agentic Browsing (llms.txt)
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

// Track website visitors and serve dynamic SEO tags if configured
app.get('/', async (req, res, next) => {
    SiteStats.recordVisit().catch(err => console.error('Visit track error:', err));
    try {
        const seo = await SeoConfig.findOne({ identifier: 'site_seo' });
        if (seo && (seo.title || seo.description)) {
            let html = await fs.promises.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8');
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
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            return res.send(html);
        }
    } catch (e) {
        console.error('Dynamic SEO injection error:', e);
    }
    next();
});

// Admin Panel Web Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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
