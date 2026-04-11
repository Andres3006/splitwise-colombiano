const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const { getUsers } = require('../controllers/users.controller');

const router = express.Router();

router.get('/', verifyToken, getUsers);

module.exports = router;
