const pool = require('../db/connection');

const roundToTwo = (value) => Number(Number(value).toFixed(2));
const ADMIN_EMAIL = 'admin@test.com';

const isAdminAccount = (user) => (
    String(user?.role || '').toLowerCase() === 'admin'
    || String(user?.email || '').trim().toLowerCase() === ADMIN_EMAIL
);

const getUserAccountState = async (client, userId) => {
    const executor = client || pool;
    const userResult = await executor.query(
        `SELECT id, name, email, role, is_banned
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
    );

    if (userResult.rows.length === 0) {
        const error = new Error('El usuario no existe');
        error.statusCode = 404;
        throw error;
    }

    const overdueLoansResult = await executor.query(
        `SELECT
            l.id,
            l.group_id,
            l.lender_id,
            l.borrower_id,
            l.total_amount,
            l.due_date,
            GREATEST(l.total_amount - COALESCE(SUM(p.amount), 0), 0) AS remaining_amount
         FROM loans l
         LEFT JOIN payments p ON p.loan_id = l.id
         WHERE l.borrower_id = $1
           AND l.status = 'active'
           AND l.due_date < CURRENT_TIMESTAMP
         GROUP BY l.id
         HAVING GREATEST(l.total_amount - COALESCE(SUM(p.amount), 0), 0) > 0
         ORDER BY l.due_date ASC`,
        [userId]
    );

    return {
        ...userResult.rows[0],
        is_admin_account: isAdminAccount(userResult.rows[0]),
        has_overdue_loans: overdueLoansResult.rows.length > 0,
        overdue_loans: overdueLoansResult.rows.map((loan) => ({
            ...loan,
            remaining_amount: roundToTwo(Number(loan.remaining_amount || 0))
        }))
    };
};

const assertUserCanUseRestrictedFeatures = async (client, userId, options = {}) => {
    const {
        allowAdmin = false,
        errorPrefix = 'No puedes realizar esta accion'
    } = options;

    const accountState = await getUserAccountState(client, userId);

    if (!allowAdmin && accountState.is_admin_account) {
        const error = new Error(`${errorPrefix}: la cuenta administradora no puede usar esta opcion`);
        error.statusCode = 403;
        throw error;
    }

    if (accountState.is_banned) {
        const error = new Error(`${errorPrefix}: la cuenta esta baneada`);
        error.statusCode = 403;
        throw error;
    }

    if (accountState.has_overdue_loans) {
        const error = new Error(
            `${errorPrefix}: tienes una deuda vencida, quedaste bloqueado hasta pagarla`
        );
        error.statusCode = 403;
        error.code = 'OVERDUE_LOAN_BLOCK';
        throw error;
    }

    return accountState;
};

module.exports = {
    isAdminAccount,
    getUserAccountState,
    assertUserCanUseRestrictedFeatures
};
