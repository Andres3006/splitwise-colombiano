const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getDashboard } = require('../controllers/expenses.controller');

const router = express.Router();

router.get('/me', verifyToken, getDashboard);

module.exports = router;
