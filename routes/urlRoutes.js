const express = require('express');
const router = express.Router();

const {
    shortenUrl,
    redirectUrl,
    getUrlStats,
    deleteUrl
} = require('../controllers/urlController');

router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "URL Shortener API is running 🚀"
    });
});

router.post('/shorten', shortenUrl);
router.get('/stats/:shortCode', getUrlStats);
router.delete('/url/:shortCode', deleteUrl);
router.get('/:shortCode', redirectUrl);

module.exports = router;