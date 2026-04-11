const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    createExpense
} = require('../controllers/expenses.controller');

const router = express.Router();

router.post('/', verifyToken, createExpense);

module.exports = router;
