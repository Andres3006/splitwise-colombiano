const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    getMyBalances,
    getOptimizedPayments
} = require('../controllers/expenses.controller');

const router = express.Router();

router.get('/me', verifyToken, getMyBalances);
router.get('/optimize', verifyToken, getOptimizedPayments);

module.exports = router;
