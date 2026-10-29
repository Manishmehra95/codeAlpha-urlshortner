const express = require('express');
const router = express.Router();
const { login, getStats, deleteUrl } = require('../controllers/adminController');

router.post('/login', login);
router.get('/stats', getStats);
router.delete('/url/:shortCode', deleteUrl);

module.exports = router;
