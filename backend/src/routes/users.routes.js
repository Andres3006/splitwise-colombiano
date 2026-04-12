const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getUsers, depositToWallet } = require('../controllers/users.controller');

const router = express.Router();

router.get('/', verifyToken, getUsers);
router.post('/me/wallet/deposit', verifyToken, depositToWallet);

module.exports = router;
