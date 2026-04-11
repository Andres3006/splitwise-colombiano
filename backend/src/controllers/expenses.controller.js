const pool = require('../db/connection');

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

const getUserMap = async (client, userIds) => {
    const result = await client.query(
        `SELECT id, name, is_banned
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

const createExpense = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            description,
            amount,
            group_id: groupId = null,
            participants,
            paid_by: paidBy = req.user.id,
            currency = 'COP'
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

        const participantIds = [...new Set(participants)];
        const involvedUserIds = [...new Set([...participantIds, paidBy])];

        await client.query('BEGIN');

        const userMap = await getUserMap(client, involvedUserIds);

        if (userMap.size !== involvedUserIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Uno o mas usuarios no existen' });
        }

        const bannedUsers = [...userMap.values()].filter((user) => user.is_banned);

        if (bannedUsers.length > 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'No se puede registrar el gasto porque hay usuarios baneados',
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
             VALUES ($1, $2, $3, $4, $5, 'equal')
             RETURNING id, group_id, paid_by, description, total_amount, currency, split_type, created_at`,
            [groupId, paidBy, description.trim(), roundToTwo(totalAmount), currency]
        );

        const shares = buildEqualShares(totalAmount, participantIds.length);
        const participantRows = [];
        const generatedBalances = [];

        for (let index = 0; index < participantIds.length; index += 1) {
            const participantId = participantIds[index];
            const share = shares[index];
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
        const [balanceResult, groupsResult, expensesResult] = await Promise.all([
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

        return res.json({
            user_id: req.user.id,
            groups_count: Number(groupsResult.rows[0].total),
            expenses_count: Number(expensesResult.rows[0].total),
            balances_count: balanceResult.rows.length,
            total_to_pay: summary.total_to_pay,
            total_to_receive: summary.total_to_receive,
            net_balance: roundToTwo(summary.total_to_receive - summary.total_to_pay)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createExpense,
    getMyBalances,
    getOptimizedPayments,
    getDashboard
};
