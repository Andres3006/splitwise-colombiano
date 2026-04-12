const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    createExpense,
    getExpenses
} = require('../controllers/expenses.controller');

const router = express.Router();

router.get('/', verifyToken, getExpenses);
router.post('/', verifyToken, createExpense);

module.exports = router;
