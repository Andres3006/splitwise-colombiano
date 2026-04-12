const pool = require('../db/connection');
const MIN_WALLET_DEPOSIT = 1000;

const getUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, created_at, is_banned, role
             FROM users
             ORDER BY name ASC`
        );

        return res.json({ users: result.rows });
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

module.exports = { getUsers, depositToWallet };
