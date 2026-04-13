const pool = require('../db/connection');
const MIN_WALLET_DEPOSIT = 1000;
const MIN_WALLET_WITHDRAWAL = 1000;

const getUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.created_at,
                u.is_banned,
                u.role,
                EXISTS (
                    SELECT 1
                    FROM loans l
                    LEFT JOIN payments p ON p.loan_id = l.id
                    WHERE l.borrower_id = u.id
                      AND l.status = 'active'
                      AND l.due_date < CURRENT_TIMESTAMP
                    GROUP BY l.id, l.total_amount
                    HAVING GREATEST(l.total_amount - COALESCE(SUM(p.amount), 0), 0) > 0
                ) AS has_overdue_loans
             FROM users u
             ORDER BY u.name ASC`
        );

        return res.json({ users: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getMyMovements = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM (
                SELECT
                    CONCAT('wallet-', wt.id) AS id,
                    CASE
                        WHEN wt.transaction_type = 'deposit' THEN 'deposit'
                        WHEN wt.transaction_type = 'withdraw' THEN 'withdraw'
                        ELSE wt.transaction_type
                    END AS movement_type,
                    wt.amount,
                    NULL::uuid AS related_user_id,
                    NULL::text AS related_user_name,
                    NULL::uuid AS group_id,
                    NULL::uuid AS loan_id,
                    NULL::timestamp AS due_date,
                    NULL::text AS loan_status,
                    wt.reference,
                    wt.created_at
                FROM wallet_transactions wt
                WHERE wt.user_id = $1
                  AND wt.transaction_type IN ('deposit', 'withdraw')

                UNION ALL

                SELECT
                    CONCAT('payment-', p.id) AS id,
                    CASE
                        WHEN p.from_user = $1 THEN 'payment_sent'
                        ELSE 'payment_received'
                    END AS movement_type,
                    p.amount,
                    CASE
                        WHEN p.from_user = $1 THEN p.to_user
                        ELSE p.from_user
                    END AS related_user_id,
                    CASE
                        WHEN p.from_user = $1 THEN receiver.name
                        ELSE sender.name
                    END AS related_user_name,
                    NULL::uuid AS group_id,
                    p.loan_id,
                    NULL::timestamp AS due_date,
                    NULL::text AS loan_status,
                    NULL::text AS reference,
                    p.created_at
                FROM payments p
                JOIN users sender ON sender.id = p.from_user
                JOIN users receiver ON receiver.id = p.to_user
                WHERE p.from_user = $1
                   OR p.to_user = $1

                UNION ALL

                SELECT
                    CONCAT('loan-', l.id) AS id,
                    CASE
                        WHEN l.lender_id = $1 THEN 'loan_lent'
                        ELSE 'loan_borrowed'
                    END AS movement_type,
                    l.amount,
                    CASE
                        WHEN l.lender_id = $1 THEN l.borrower_id
                        ELSE l.lender_id
                    END AS related_user_id,
                    CASE
                        WHEN l.lender_id = $1 THEN borrower.name
                        ELSE lender.name
                    END AS related_user_name,
                    l.group_id,
                    l.id AS loan_id,
                    l.due_date,
                    l.status AS loan_status,
                    l.description AS reference,
                    l.created_at
                FROM loans l
                JOIN users lender ON lender.id = l.lender_id
                JOIN users borrower ON borrower.id = l.borrower_id
                WHERE l.lender_id = $1
                   OR l.borrower_id = $1
             ) AS movements
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        return res.json({ movements: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const depositToWallet = async (req, res) => {
    const client = await pool.connect();

    try {
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount < MIN_WALLET_DEPOSIT) {
            return res.status(400).json({
                error: `La consignacion minima es de ${MIN_WALLET_DEPOSIT.toLocaleString('es-CO')} pesos`
            });
        }

        await client.query('BEGIN');

        const updatedUser = await client.query(
            `UPDATE users
             SET wallet_balance = wallet_balance + $1
             WHERE id = $2
             RETURNING id, wallet_balance`,
            [amount, req.user.id]
        );

        await client.query(
            `INSERT INTO wallet_transactions (user_id, transaction_type, amount, reference)
             VALUES ($1, 'deposit', $2, $3)`,
            [req.user.id, amount, 'Consignacion a saldo disponible']
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Saldo consignado correctamente',
            wallet_balance: Number(updatedUser.rows[0].wallet_balance)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const withdrawFromWallet = async (req, res) => {
    const client = await pool.connect();

    try {
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount < MIN_WALLET_WITHDRAWAL) {
            return res.status(400).json({
                error: `El retiro minimo es de ${MIN_WALLET_WITHDRAWAL.toLocaleString('es-CO')} pesos`
            });
        }

        await client.query('BEGIN');

        const userResult = await client.query(
            `SELECT wallet_balance
             FROM users
             WHERE id = $1
             FOR UPDATE`,
            [req.user.id]
        );

        const currentBalance = Number(userResult.rows[0]?.wallet_balance || 0);

        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'No tienes saldo suficiente para retirar ese monto'
            });
        }

        const updatedUser = await client.query(
            `UPDATE users
             SET wallet_balance = wallet_balance - $1
             WHERE id = $2
             RETURNING id, wallet_balance`,
            [amount, req.user.id]
        );

        await client.query(
            `INSERT INTO wallet_transactions (user_id, transaction_type, amount, reference)
             VALUES ($1, 'withdraw', $2, $3)`,
            [req.user.id, amount, 'Retiro desde saldo disponible']
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Dinero retirado correctamente',
            wallet_balance: Number(updatedUser.rows[0].wallet_balance)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = { getUsers, getMyMovements, depositToWallet, withdrawFromWallet };
