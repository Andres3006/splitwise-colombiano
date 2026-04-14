const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getDashboard, getDashboardRelationships } = require('../controllers/expenses.controller');

const router = express.Router();

router.get('/me', verifyToken, getDashboard);
router.get('/relationships', verifyToken, getDashboardRelationships);

module.exports = router;
