const express = require('express');
const router = express.Router();
const { login, getStats, deleteUrl, getSeo, updateSeo } = require('../controllers/adminController');

router.post('/login', login);
router.get('/stats', getStats);
router.get('/seo', getSeo);
router.put('/seo', updateSeo);
router.delete('/url/:shortCode', deleteUrl);

module.exports = router;
