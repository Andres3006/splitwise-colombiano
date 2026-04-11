const express = require('express');

const verifyToken = require('../middlewares/auth.middleware');
const {
    createLoan,
    getMyLoans,
    respondLoan,
    cancelLoan
} = require('../controllers/loans.controller');

const router = express.Router();

router.post('/', verifyToken, createLoan);
router.get('/me', verifyToken, getMyLoans);
router.patch('/:loanId/respond', verifyToken, respondLoan);
router.delete('/:loanId/cancel', verifyToken, cancelLoan);

module.exports = router;
