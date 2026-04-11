const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    registerPayment,
    getMyPayments
} = require('../controllers/expenses.controller');

const router = express.Router();

router.get('/me', verifyToken, getMyPayments);
router.post('/', verifyToken, registerPayment);

module.exports = router;
