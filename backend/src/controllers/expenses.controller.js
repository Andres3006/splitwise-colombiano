const pool = require('../db/connection');
const { getUserAccountState, isAdminAccount } = require('../utils/account-state');

const roundToTwo = (value) => Number(Number(value).toFixed(2));

const buildEqualShares = (totalAmount, totalParticipants) => {
    const totalCents = Math.round(Number(totalAmount) * 100);
    const baseShare = Math.floor(totalCents / totalParticipants);
    const remainder = totalCents % totalParticipants;

    return Array.from({ length: totalParticipants }, (_, index) => {
        const shareInCents = baseShare + (index < remainder ? 1 : 0);
        return roundToTwo(shareInCents / 100);
    });
};

const buildCustomShares = (totalAmount, participants) => {
    if (
        !participants.every(
            (participant) => participant && participant.user_id && participant.share_amount !== undefined
        )
    ) {
        const error = new Error('Cada participante debe incluir user_id y share_amount');
        error.statusCode = 400;
        throw error;
    }

    const shares = participants.map((participant) => ({
        user_id: participant.user_id,
        share_amount: roundToTwo(Number(participant.share_amount))
    }));

    const totalShares = roundToTwo(
        shares.reduce((sum, participant) => sum + participant.share_amount, 0)
    );

    if (totalShares !== roundToTwo(totalAmount)) {
        const error = new Error('La suma de share_amount debe coincidir con el monto total');
        error.statusCode = 400;
        throw error;
    }

    if (shares.some((participant) => !Number.isFinite(participant.share_amount) || participant.share_amount < 0)) {
        const error = new Error('Todos los share_amount deben ser numeros validos');
        error.statusCode = 400;
        throw error;
    }

    return shares;
};

const getUserMap = async (client, userIds) => {
    const result = await client.query(
        `SELECT id, name, is_banned, role
         FROM users
         WHERE id = ANY($1::uuid[])`,
        [userIds]
    );

    return new Map(result.rows.map((row) => [row.id, row]));
};

const validateGroupMembers = async (client, groupId, userIds) => {
    const result = await client.query(
        `SELECT user_id
         FROM group_members
         WHERE group_id = $1
           AND user_id = ANY($2::uuid[])
           AND left_at IS NULL`,
        [groupId, userIds]
    );

    return new Set(result.rows.map((row) => row.user_id));
};

const getBalancesByUser = async (userId, groupId = null) => {
    const params = [userId];
    let groupFilter = '';

    if (groupId) {
        params.push(groupId);
        groupFilter = 'AND b.group_id = $2';
    }

    return pool.query(
        `SELECT
            b.id,
            b.group_id,
            b.debtor_id,
            debtor.name AS debtor_name,
            b.creditor_id,
            creditor.name AS creditor_name,
            b.amount,
            b.updated_at
         FROM balances b
         JOIN users debtor ON debtor.id = b.debtor_id
         JOIN users creditor ON creditor.id = b.creditor_id
         WHERE (b.debtor_id = $1 OR b.creditor_id = $1)
         ${groupFilter}
         ORDER BY b.updated_at DESC`,
        params
    );
};

const assertGroupMembership = async (userId, groupId) => {
    const membershipResult = await pool.query(
        `SELECT id
         FROM group_members
         WHERE group_id = $1
           AND user_id = $2
           AND left_at IS NULL
         LIMIT 1`,
        [groupId, userId]
    );

    return membershipResult.rows.length > 0;
};

const getBalancesForOptimization = async (userId, groupId = null) => {
    if (!groupId) {
        return getBalancesByUser(userId, null);
    }

    const isMember = await assertGroupMembership(userId, groupId);
    if (!isMember) {
        const error = new Error('No perteneces a este grupo');
        error.statusCode = 403;
        throw error;
    }

    return pool.query(
        `SELECT
            b.id,
            b.group_id,
            b.debtor_id,
            debtor.name AS debtor_name,
            b.creditor_id,
            creditor.name AS creditor_name,
            b.amount,
            b.updated_at
         FROM balances b
         JOIN users debtor ON debtor.id = b.debtor_id
         JOIN users creditor ON creditor.id = b.creditor_id
         WHERE b.group_id = $1
         ORDER BY b.updated_at DESC`,
        [groupId]
    );
};

const optimizeBalances = (balances) => {
    const netMap = new Map();

    for (const balance of balances) {
        const amount = Number(balance.amount);

        netMap.set(
            balance.debtor_id,
            roundToTwo((netMap.get(balance.debtor_id) || 0) - amount)
        );
        netMap.set(
            balance.creditor_id,
            roundToTwo((netMap.get(balance.creditor_id) || 0) + amount)
        );
    }

    const debtors = [];
    const creditors = [];

    for (const [userId, netAmount] of netMap.entries()) {
        if (netAmount < 0) {
            debtors.push({ user_id: userId, amount: roundToTwo(Math.abs(netAmount)) });
        } else if (netAmount > 0) {
            creditors.push({ user_id: userId, amount: roundToTwo(netAmount) });
        }
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const optimizedPayments = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];
        const amount = roundToTwo(Math.min(debtor.amount, creditor.amount));

        optimizedPayments.push({
            from_user: debtor.user_id,
            to_user: creditor.user_id,
            amount
        });

        debtor.amount = roundToTwo(debtor.amount - amount);
        creditor.amount = roundToTwo(creditor.amount - amount);

        if (debtor.amount === 0) {
            debtorIndex += 1;
        }

        if (creditor.amount === 0) {
            creditorIndex += 1;
        }
    }

    return optimizedPayments;
};

const upsertBalance = async (client, { groupId, debtorId, creditorId, amount }) => {
    if (debtorId === creditorId || amount <= 0) {
        return;
    }

    const directBalance = await client.query(
        `SELECT id, amount
         FROM balances
         WHERE debtor_id = $1
           AND creditor_id = $2
           AND group_id IS NOT DISTINCT FROM $3
         LIMIT 1`,
        [debtorId, creditorId, groupId]
    );

    if (directBalance.rows.length > 0) {
        const currentAmount = Number(directBalance.rows[0].amount);
        await client.query(
            `UPDATE balances
             SET amount = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [roundToTwo(currentAmount + amount), directBalance.rows[0].id]
        );
        return;
    }

    const reverseBalance = await client.query(
        `SELECT id, amount
         FROM balances
         WHERE debtor_id = $1
           AND creditor_id = $2
           AND group_id IS NOT DISTINCT FROM $3
         LIMIT 1`,
        [creditorId, debtorId, groupId]
    );

    if (reverseBalance.rows.length === 0) {
        await client.query(
            `INSERT INTO balances (group_id, debtor_id, creditor_id, amount)
             VALUES ($1, $2, $3, $4)`,
            [groupId, debtorId, creditorId, roundToTwo(amount)]
        );
        return;
    }

    const reverseAmount = Number(reverseBalance.rows[0].amount);
    const netAmount = roundToTwo(reverseAmount - amount);

    if (netAmount > 0) {
        await client.query(
            `UPDATE balances
             SET amount = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [netAmount, reverseBalance.rows[0].id]
        );
        return;
    }

    if (netAmount < 0) {
        await client.query(
            `UPDATE balances
             SET debtor_id = $1,
                 creditor_id = $2,
                 amount = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [debtorId, creditorId, Math.abs(netAmount), reverseBalance.rows[0].id]
        );
        return;
    }

    await client.query(
        `DELETE FROM balances
         WHERE id = $1`,
        [reverseBalance.rows[0].id]
    );
};

const settleBalance = async (client, { groupId, debtorId, creditorId, amount }) => {
    if (debtorId === creditorId || amount <= 0) {
        return null;
    }

    const directBalance = await client.query(
        `SELECT id, amount
         FROM balances
         WHERE debtor_id = $1
           AND creditor_id = $2
           AND group_id IS NOT DISTINCT FROM $3
         LIMIT 1`,
        [debtorId, creditorId, groupId]
    );

    if (directBalance.rows.length === 0) {
        const error = new Error('No existe un balance pendiente para este pago');
        error.statusCode = 400;
        throw error;
    }

    const currentAmount = Number(directBalance.rows[0].amount);
    if (amount > currentAmount) {
        const error = new Error('El pago no puede ser mayor al balance pendiente');
        error.statusCode = 400;
        throw error;
    }

    const remaining = roundToTwo(currentAmount - amount);

    if (remaining === 0) {
        await client.query('DELETE FROM balances WHERE id = $1', [directBalance.rows[0].id]);
        return { remaining_amount: 0, cleared: true };
    }

    await client.query(
        `UPDATE balances
         SET amount = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [remaining, directBalance.rows[0].id]
    );

    return { remaining_amount: remaining, cleared: false };
};

const settleLoan = async (client, { loanId = null, groupId, borrowerId, lenderId, amount }) => {
    if (borrowerId === lenderId || amount <= 0) {
        return null;
    }

    const params = [borrowerId, lenderId];
    let query = `
        SELECT id, group_id, borrower_id, lender_id, total_amount, status, created_at
        FROM loans
        WHERE status = 'active'
          AND borrower_id = $1
          AND lender_id = $2
    `;

    if (groupId) {
        params.push(groupId);
        query += ` AND group_id = $${params.length}`;
    } else {
        query += ' AND group_id IS NULL';
    }

    if (loanId) {
        params.push(loanId);
        query += ` AND id = $${params.length}`;
    }

    query += ' ORDER BY created_at ASC LIMIT 1 FOR UPDATE';

    const loanResult = await client.query(query, params);

    if (loanResult.rows.length === 0) {
        const error = new Error('No existe un prestamo activo pendiente para este pago');
        error.statusCode = 400;
        throw error;
    }

    const loan = loanResult.rows[0];
    const paidResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_paid
         FROM payments
         WHERE loan_id = $1`,
        [loan.id]
    );

    const totalPaid = Number(paidResult.rows[0].total_paid);
    const remaining = roundToTwo(Number(loan.total_amount) - totalPaid);

    if (remaining <= 0) {
        await client.query(
            `UPDATE loans
             SET status = 'paid'
             WHERE id = $1`,
            [loan.id]
        );
        const error = new Error('Este prestamo ya fue pagado por completo');
        error.statusCode = 409;
        throw error;
    }

    if (amount > remaining) {
        const error = new Error('El pago no puede ser mayor al saldo pendiente del prestamo');
        error.statusCode = 400;
        throw error;
    }

    const nextRemaining = roundToTwo(remaining - amount);

    if (nextRemaining === 0) {
        await client.query(
            `UPDATE loans
             SET status = 'paid'
             WHERE id = $1`,
            [loan.id]
        );
    }

    return {
        loan_id: loan.id,
        remaining_amount: nextRemaining,
        cleared: nextRemaining === 0
    };
};

const settleIndirectBalance = async (client, { groupId, fromUserId, intermediaryUserId, finalUserId, amount }) => {
    const firstLegResult = await client.query(
        `SELECT id, amount
         FROM balances
         WHERE debtor_id = $1
           AND creditor_id = $2
           AND group_id IS NOT DISTINCT FROM $3
         LIMIT 1
         FOR UPDATE`,
        [fromUserId, intermediaryUserId, groupId]
    );

    const secondLegResult = await client.query(
        `SELECT id, amount
         FROM balances
         WHERE debtor_id = $1
           AND creditor_id = $2
           AND group_id IS NOT DISTINCT FROM $3
         LIMIT 1
         FOR UPDATE`,
        [intermediaryUserId, finalUserId, groupId]
    );

    if (firstLegResult.rows.length === 0 || secondLegResult.rows.length === 0) {
        const error = new Error('No existe una cadena valida de deuda para pagar a esta persona');
        error.statusCode = 400;
        throw error;
    }

    const firstAmount = roundToTwo(Number(firstLegResult.rows[0].amount || 0));
    const secondAmount = roundToTwo(Number(secondLegResult.rows[0].amount || 0));
    const allowedAmount = roundToTwo(Math.min(firstAmount, secondAmount));

    if (amount > allowedAmount) {
        const error = new Error('El pago excede el monto permitido en la cadena de deuda');
        error.statusCode = 400;
        throw error;
    }

    const firstRemaining = roundToTwo(firstAmount - amount);
    const secondRemaining = roundToTwo(secondAmount - amount);

    if (firstRemaining > 0) {
        await client.query(
            `UPDATE balances
             SET amount = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [firstRemaining, firstLegResult.rows[0].id]
        );
    } else {
        await client.query(
            `DELETE FROM balances
             WHERE id = $1`,
            [firstLegResult.rows[0].id]
        );
    }

    if (secondRemaining > 0) {
        await client.query(
            `UPDATE balances
             SET amount = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [secondRemaining, secondLegResult.rows[0].id]
        );
    } else {
        await client.query(
            `DELETE FROM balances
             WHERE id = $1`,
            [secondLegResult.rows[0].id]
        );
    }

    return {
        indirect: true,
        intermediary_user_id: intermediaryUserId,
        remaining_amount: 0,
        cleared: firstRemaining === 0 && secondRemaining === 0
    };
};

const createExpense = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            description,
            amount,
            group_id: groupId = null,
            participants,
            paid_by: paidBy = req.user.id,
            currency = 'COP',
            split_type: splitType = 'equal'
        } = req.body;

        const totalAmount = Number(amount);

        if (!description || !description.trim()) {
            return res.status(400).json({ error: 'La descripcion es obligatoria' });
        }

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
        }

        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ error: 'Debes enviar al menos un participante' });
        }
        if (!['equal', 'custom'].includes(splitType)) {
            return res.status(400).json({ error: 'split_type debe ser equal o custom' });
        }

        const participantIds = [
            ...new Set(
                splitType === 'custom'
                    ? participants.map((participant) => participant.user_id)
                    : participants
            )
        ];
        const involvedUserIds = [...new Set([...participantIds, paidBy])];

        await client.query('BEGIN');

        const userMap = await getUserMap(client, involvedUserIds);

        if (userMap.size !== involvedUserIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Uno o mas usuarios no existen' });
        }

        const bannedUsers = [...userMap.values()].filter((user) => user.is_banned || isAdminAccount(user));

        if (bannedUsers.length > 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'No se puede registrar el gasto porque hay usuarios baneados o administradores',
                banned_users: bannedUsers.map((user) => ({
                    id: user.id,
                    name: user.name
                }))
            });
        }

        if (groupId) {
            const groupResult = await client.query(
                `SELECT id
                 FROM groups
                 WHERE id = $1`,
                [groupId]
            );

            if (groupResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'El grupo no existe' });
            }

            const members = await validateGroupMembers(client, groupId, involvedUserIds);

            if (members.size !== involvedUserIds.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Todos los involucrados deben ser miembros activos del grupo'
                });
            }
        }

        const expenseResult = await client.query(
            `INSERT INTO expenses (group_id, paid_by, description, total_amount, currency, split_type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, group_id, paid_by, description, total_amount, currency, split_type, created_at`,
            [groupId, paidBy, description.trim(), roundToTwo(totalAmount), currency, splitType]
        );

        const shares = splitType === 'custom'
            ? buildCustomShares(totalAmount, participants)
            : buildEqualShares(totalAmount, participantIds.length).map((share, index) => ({
                user_id: participantIds[index],
                share_amount: share
            }));
        const participantRows = [];
        const generatedBalances = [];

        for (let index = 0; index < shares.length; index += 1) {
            const participantId = shares[index].user_id;
            const share = shares[index].share_amount;
            const owedAmount = participantId === paidBy ? 0 : share;

            const participantResult = await client.query(
                `INSERT INTO expense_participants (expense_id, user_id, share_amount, owed_amount)
                 VALUES ($1, $2, $3, $4)
                 RETURNING user_id, share_amount, owed_amount`,
                [expenseResult.rows[0].id, participantId, share, owedAmount]
            );

            participantRows.push(participantResult.rows[0]);

            if (owedAmount > 0) {
                await upsertBalance(client, {
                    groupId,
                    debtorId: participantId,
                    creditorId: paidBy,
                    amount: owedAmount
                });

                generatedBalances.push({
                    debtor_id: participantId,
                    creditor_id: paidBy,
                    amount: owedAmount
                });
            }
        }

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Gasto registrado correctamente',
            expense: expenseResult.rows[0],
            participants: participantRows,
            generated_balances: generatedBalances
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getMyBalances = async (req, res) => {
    try {
        const { group_id: groupId } = req.query;
        const result = await getBalancesByUser(req.user.id, groupId);

        const summary = result.rows.reduce(
            (accumulator, balance) => {
                const amount = Number(balance.amount);

                if (balance.debtor_id === req.user.id) {
                    accumulator.total_to_pay = roundToTwo(accumulator.total_to_pay + amount);
                }

                if (balance.creditor_id === req.user.id) {
                    accumulator.total_to_receive = roundToTwo(accumulator.total_to_receive + amount);
                }

                return accumulator;
            },
            {
                total_to_pay: 0,
                total_to_receive: 0
            }
        );

        return res.json({
            summary: {
                ...summary,
                net_balance: roundToTwo(summary.total_to_receive - summary.total_to_pay)
            },
            balances: result.rows
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getOptimizedPayments = async (req, res) => {
    try {
        const { group_id: groupId } = req.query;
        const balanceResult = await getBalancesForOptimization(req.user.id, groupId);
        const optimizedPayments = optimizeBalances(balanceResult.rows);

        return res.json({
            original_transfers: balanceResult.rows.length,
            optimized_transfers: optimizedPayments.length,
            reduction: balanceResult.rows.length - optimizedPayments.length,
            payments: optimizedPayments
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const getDashboard = async (req, res) => {
    try {
        const [balanceResult, groupsResult, expensesResult, walletResult, loansResult] = await Promise.all([
            getBalancesByUser(req.user.id),
            pool.query(
                `SELECT COUNT(*) AS total
                 FROM group_members
                 WHERE user_id = $1
                   AND left_at IS NULL`,
                [req.user.id]
            ),
            pool.query(
                `SELECT COUNT(*) AS total
                 FROM expenses
                 WHERE paid_by = $1
                    OR id IN (
                        SELECT expense_id
                        FROM expense_participants
                        WHERE user_id = $1
                    )`,
                [req.user.id]
            ),
            pool.query(
                `SELECT wallet_balance
                 FROM users
                 WHERE id = $1
                 LIMIT 1`,
                [req.user.id]
            ),
            pool.query(
                `SELECT
                    l.id,
                    l.borrower_id,
                    l.lender_id,
                    l.total_amount,
                    COALESCE(SUM(p.amount), 0) AS total_paid
                 FROM loans l
                 LEFT JOIN payments p ON p.loan_id = l.id
                 WHERE l.status = 'active'
                   AND (l.borrower_id = $1 OR l.lender_id = $1)
                 GROUP BY l.id, l.borrower_id, l.lender_id, l.total_amount`,
                [req.user.id]
            )
        ]);

        const summary = balanceResult.rows.reduce(
            (accumulator, balance) => {
                const amount = Number(balance.amount);

                if (balance.debtor_id === req.user.id) {
                    accumulator.total_to_pay = roundToTwo(accumulator.total_to_pay + amount);
                }

                if (balance.creditor_id === req.user.id) {
                    accumulator.total_to_receive = roundToTwo(accumulator.total_to_receive + amount);
                }

                return accumulator;
            },
            {
                total_to_pay: 0,
                total_to_receive: 0
            }
        );

        const loanSummary = loansResult.rows.reduce(
            (accumulator, loan) => {
                const remaining = roundToTwo(Number(loan.total_amount) - Number(loan.total_paid));

                if (remaining <= 0) {
                    return accumulator;
                }

                if (loan.borrower_id === req.user.id) {
                    accumulator.total_to_pay = roundToTwo(accumulator.total_to_pay + remaining);
                }

                if (loan.lender_id === req.user.id) {
                    accumulator.total_to_receive = roundToTwo(accumulator.total_to_receive + remaining);
                }

                return accumulator;
            },
            {
                total_to_pay: 0,
                total_to_receive: 0
            }
        );

        const totalToPay = roundToTwo(summary.total_to_pay + loanSummary.total_to_pay);
        const totalToReceive = roundToTwo(summary.total_to_receive + loanSummary.total_to_receive);

        return res.json({
            user_id: req.user.id,
            groups_count: Number(groupsResult.rows[0].total),
            expenses_count: Number(expensesResult.rows[0].total),
            balances_count: balanceResult.rows.length,
            total_to_pay: totalToPay,
            total_to_receive: totalToReceive,
            available_balance: Number(walletResult.rows[0]?.wallet_balance || 0)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getExpenses = async (req, res) => {
    try {
        const { group_id: groupId } = req.query;
        const params = [req.user.id];
        let groupFilter = '';

        if (groupId) {
            params.push(groupId);
            groupFilter = 'AND e.group_id = $2';
        }

        const result = await pool.query(
            `SELECT
                e.id,
                e.group_id,
                e.paid_by,
                payer.name AS paid_by_name,
                e.description,
                e.total_amount,
                e.currency,
                e.split_type,
                e.created_at
             FROM expenses e
             JOIN users payer ON payer.id = e.paid_by
             WHERE (
                e.paid_by = $1
                OR EXISTS (
                    SELECT 1
                    FROM expense_participants ep
                    WHERE ep.expense_id = e.id
                      AND ep.user_id = $1
                )
             )
             ${groupFilter}
             ORDER BY e.created_at DESC`,
            params
        );

        return res.json({ expenses: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const registerPayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            to_user: toUser,
            amount,
            group_id: groupId = null,
            loan_id: loanId = null
        } = req.body;

        const paymentAmount = roundToTwo(Number(amount));

        if (!toUser) {
            return res.status(400).json({ error: 'El to_user es obligatorio' });
        }

        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: 'El monto del pago debe ser mayor a 0' });
        }

        if (toUser === req.user.id) {
            return res.status(400).json({ error: 'No puedes pagarte a ti mismo' });
        }

        await client.query('BEGIN');

        const usersResult = await client.query(
            `SELECT id, wallet_balance, role, is_banned
             FROM users
             WHERE id = ANY($1::uuid[])
             FOR UPDATE`,
            [[req.user.id, toUser]]
        );

        if (usersResult.rows.length !== 2) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Uno o ambos usuarios no existen' });
        }

        const senderState = await getUserAccountState(client, req.user.id);
        const receiverState = await getUserAccountState(client, toUser);

        if (senderState.role === 'admin' || receiverState.role === 'admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'La cuenta administradora no puede participar en pagos manuales' });
        }

        if (groupId) {
            const members = await validateGroupMembers(client, groupId, [req.user.id, toUser]);
            if (members.size !== 2) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    error: 'Ambos usuarios deben ser miembros activos del grupo'
                });
            }
        }

        const sender = usersResult.rows.find((user) => user.id === req.user.id);

        if (Number(sender.wallet_balance) < paymentAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No tienes saldo disponible suficiente para realizar este pago' });
        }

        let settlement;
        let resolvedLoanId = loanId;

        try {
            settlement = await settleBalance(client, {
                groupId,
                debtorId: req.user.id,
                creditorId: toUser,
                amount: paymentAmount
            });
        } catch (error) {
            if (error.statusCode !== 400) {
                throw error;
            }

            try {
                settlement = await settleLoan(client, {
                    loanId,
                    groupId,
                    borrowerId: req.user.id,
                    lenderId: toUser,
                    amount: paymentAmount
                });
                resolvedLoanId = settlement.loan_id;
            } catch (loanError) {
                if (loanError.statusCode !== 400) {
                    throw loanError;
                }

                const intermediaryResult = await client.query(
                    `SELECT creditor_id
                     FROM balances
                     WHERE debtor_id = $1
                       AND group_id IS NOT DISTINCT FROM $2
                     ORDER BY amount DESC, updated_at DESC`,
                    [req.user.id, groupId]
                );

                let indirectSettlement = null;
                for (const row of intermediaryResult.rows) {
                    try {
                        indirectSettlement = await settleIndirectBalance(client, {
                            groupId,
                            fromUserId: req.user.id,
                            intermediaryUserId: row.creditor_id,
                            finalUserId: toUser,
                            amount: paymentAmount
                        });
                        break;
                    } catch (indirectError) {
                        if (indirectError.statusCode !== 400) {
                            throw indirectError;
                        }
                    }
                }

                if (!indirectSettlement) {
                    throw loanError;
                }

                settlement = indirectSettlement;
            }
        }

        await client.query(
            `UPDATE users
             SET wallet_balance = wallet_balance - $1
             WHERE id = $2`,
            [paymentAmount, req.user.id]
        );

        await client.query(
            `UPDATE users
             SET wallet_balance = wallet_balance + $1
             WHERE id = $2`,
            [paymentAmount, toUser]
        );

        const paymentResult = await client.query(
            `INSERT INTO payments (loan_id, from_user, to_user, amount)
             VALUES ($1, $2, $3, $4)
             RETURNING id, loan_id, from_user, to_user, amount, created_at`,
            [resolvedLoanId, req.user.id, toUser, paymentAmount]
        );

        await client.query(
            `INSERT INTO wallet_transactions (user_id, transaction_type, amount, reference)
             VALUES
                ($1, 'payment_out', $2, $3),
                ($4, 'payment_in', $2, $5)`,
            [
                req.user.id,
                paymentAmount,
                settlement?.indirect
                    ? `Pago enviado a ${toUser} por cadena de deuda`
                    : `Pago enviado a ${toUser}`,
                toUser,
                settlement?.indirect
                    ? `Pago recibido de ${req.user.id} por cadena de deuda`
                    : `Pago recibido de ${req.user.id}`
            ]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Pago registrado correctamente',
            payment: paymentResult.rows[0],
            balance_status: settlement
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getMyPayments = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.id,
                p.loan_id,
                p.from_user,
                sender.name AS from_user_name,
                p.to_user,
                receiver.name AS to_user_name,
                p.amount,
                p.created_at
             FROM payments p
             JOIN users sender ON sender.id = p.from_user
             JOIN users receiver ON receiver.id = p.to_user
             WHERE p.from_user = $1
                OR p.to_user = $1
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        return res.json({ payments: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createExpense,
    getExpenses,
    getMyBalances,
    getOptimizedPayments,
    getDashboard,
    registerPayment,
    getMyPayments
};
