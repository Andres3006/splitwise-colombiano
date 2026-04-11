const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getMyBalances } = require('../controllers/expenses.controller');

const router = express.Router();

router.get('/me', verifyToken, getMyBalances);

module.exports = router;
