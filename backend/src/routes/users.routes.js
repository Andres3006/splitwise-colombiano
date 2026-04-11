const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getUsers, depositToWallet, withdrawFromWallet } = require('../controllers/users.controller');

const router = express.Router();

router.get('/', verifyToken, getUsers);
router.post('/me/wallet/deposit', verifyToken, depositToWallet);
router.post('/me/wallet/withdraw', verifyToken, withdrawFromWallet);

module.exports = router;
