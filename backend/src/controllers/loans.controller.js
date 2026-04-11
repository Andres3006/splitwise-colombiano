const pool = require('../db/connection');

const roundToTwo = (value) => Number(Number(value).toFixed(2));

const ensureGroupMembership = async (client, groupId, userIds) => {
    const membersResult = await client.query(
        `SELECT user_id
         FROM group_members
         WHERE group_id = $1
           AND user_id = ANY($2::uuid[])
           AND left_at IS NULL`,
        [groupId, userIds]
    );

    return membersResult.rows.length === userIds.length;
};

const createLoan = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            lender_id: lenderId,
            amount,
            due_date: dueDate,
            group_id: groupId,
            description = ''
        } = req.body;

        const normalizedAmount = roundToTwo(Number(amount));

        if (!groupId) {
            return res.status(400).json({ error: 'El group_id es obligatorio para solicitar prestamos' });
        }

        if (!lenderId) {
            return res.status(400).json({ error: 'El lender_id es obligatorio' });
        }

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
        }

        if (!dueDate) {
            return res.status(400).json({ error: 'La fecha limite es obligatoria' });
        }

        if (lenderId === req.user.id) {
            return res.status(400).json({ error: 'No puedes pedirte un prestamo a ti mismo' });
        }

        const parsedDueDate = new Date(dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ error: 'La fecha limite no es valida' });
        }

        await client.query('BEGIN');

        const usersResult = await client.query(
            `SELECT id, name, is_banned
             FROM users
             WHERE id = ANY($1::uuid[])`,
            [[req.user.id, lenderId]]
        );

        if (usersResult.rows.length !== 2) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Uno o ambos usuarios no existen' });
        }

        if (usersResult.rows.some((user) => user.is_banned)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No se pueden crear prestamos con usuarios baneados' });
        }

        const isValidMembership = await ensureGroupMembership(client, groupId, [req.user.id, lenderId]);

        if (!isValidMembership) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'Ambos usuarios deben pertenecer activamente al grupo para asociar el prestamo'
            });
        }

        const groupResult = await client.query(
            `SELECT id
             FROM groups
             WHERE id = $1
             LIMIT 1`,
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El grupo no existe' });
        }

        const existingPendingRequest = await client.query(
            `SELECT id
             FROM loans
             WHERE group_id = $1
               AND lender_id = $2
               AND borrower_id = $3
               AND status = 'pending'
             LIMIT 1`,
            [groupId, lenderId, req.user.id]
        );

        if (existingPendingRequest.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Ya tienes una solicitud de prestamo pendiente con esta persona en el grupo' });
        }

        const totalAmount = roundToTwo(normalizedAmount * 1.1);

        const loanResult = await client.query(
            `INSERT INTO loans (
                group_id,
                lender_id,
                borrower_id,
                amount,
                interest_rate,
                total_amount,
                due_date,
                status,
                description
            )
            VALUES ($1, $2, $3, $4, 0.10, $5, $6, 'pending', $7)
            RETURNING id, group_id, lender_id, borrower_id, amount, total_amount, due_date, status, description, created_at`,
            [groupId, lenderId, req.user.id, normalizedAmount, totalAmount, parsedDueDate, description.trim() || null]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Solicitud de prestamo registrada correctamente',
            loan: loanResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getMyLoans = async (req, res) => {
    try {
        const { group_id: groupId } = req.query;
        const params = [req.user.id];
        let groupFilter = '';

        if (groupId) {
            params.push(groupId);
            groupFilter = 'AND l.group_id = $2';
        }

        const result = await pool.query(
            `SELECT
                l.id,
                l.group_id,
                l.lender_id,
                lender.name AS lender_name,
                l.borrower_id,
                borrower.name AS borrower_name,
                l.amount,
                l.total_amount,
                l.due_date,
                l.status,
                l.description,
                l.created_at
             FROM loans l
             JOIN users lender ON lender.id = l.lender_id
             JOIN users borrower ON borrower.id = l.borrower_id
             WHERE l.lender_id = $1
                OR l.borrower_id = $1
             ${groupFilter}
             ORDER BY l.created_at DESC`,
            params
        );

        return res.json({ loans: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const respondLoan = async (req, res) => {
    const client = await pool.connect();

    try {
        const { loanId } = req.params;
        const { action } = req.body;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'La accion debe ser accept o reject' });
        }

        await client.query('BEGIN');

        const loanResult = await client.query(
            `SELECT id, lender_id, borrower_id, group_id, status, due_date
             FROM loans
             WHERE id = $1
             LIMIT 1`,
            [loanId]
        );

        if (loanResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El prestamo no existe' });
        }

        const loan = loanResult.rows[0];

        if (loan.lender_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Solo el prestamista puede responder esta solicitud' });
        }

        if (loan.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'La solicitud ya no esta pendiente' });
        }

        const nextStatus = action === 'accept' ? 'active' : 'rejected';

        const updatedLoan = await client.query(
            `UPDATE loans
             SET status = $1
             WHERE id = $2
             RETURNING id, group_id, lender_id, borrower_id, amount, total_amount, due_date, status, description, created_at`,
            [nextStatus, loanId]
        );

        await client.query('COMMIT');

        return res.json({
            message: action === 'accept' ? 'Solicitud de prestamo aceptada' : 'Solicitud de prestamo rechazada',
            loan: updatedLoan.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const cancelLoan = async (req, res) => {
    const client = await pool.connect();

    try {
        const { loanId } = req.params;

        await client.query('BEGIN');

        const loanResult = await client.query(
            `SELECT id, borrower_id, status
             FROM loans
             WHERE id = $1
             LIMIT 1`,
            [loanId]
        );

        if (loanResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El prestamo no existe' });
        }

        const loan = loanResult.rows[0];

        if (loan.borrower_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Solo quien solicito el prestamo puede cancelarlo' });
        }

        if (loan.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Solo puedes cancelar prestamos pendientes' });
        }

        const updatedLoan = await client.query(
            `UPDATE loans
             SET status = 'cancelled'
             WHERE id = $1
             RETURNING id, status`,
            [loanId]
        );

        await client.query('COMMIT');

        return res.json({
            message: 'Solicitud de prestamo cancelada correctamente',
            loan: updatedLoan.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    createLoan,
    getMyLoans,
    respondLoan,
    cancelLoan
};
