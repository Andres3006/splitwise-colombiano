const pool = require('../db/connection');
const { assertUserCanUseRestrictedFeatures, isAdminAccount } = require('../utils/account-state');

const MIN_GROUP_MEMBERS_LIMIT = 3;
const MAX_GROUP_MEMBERS_LIMIT = 15;

const getGroupCapacity = async (client, groupId) => {
    const result = await client.query(
        `SELECT
            g.id,
            g.name,
            g.is_private,
            g.max_members,
            COUNT(gm.id) FILTER (WHERE gm.left_at IS NULL) AS active_members
         FROM groups g
         LEFT JOIN group_members gm ON gm.group_id = g.id
         WHERE g.id = $1
         GROUP BY g.id`,
        [groupId]
    );

    return result.rows[0] || null;
};

const ensureGroupCapacity = async (client, groupId, slotsNeeded = 1) => {
    const group = await getGroupCapacity(client, groupId);

    if (!group) {
        const error = new Error('El grupo no existe');
        error.statusCode = 404;
        throw error;
    }

    if (Number(group.active_members) + slotsNeeded > Number(group.max_members)) {
        const error = new Error('El grupo ya alcanzo su capacidad maxima');
        error.statusCode = 409;
        throw error;
    }

    return group;
};

const ensureActiveMembership = async (client, groupId, userId) => {
    const membershipResult = await client.query(
        `SELECT role
         FROM group_members
         WHERE group_id = $1
           AND user_id = $2
           AND left_at IS NULL
         LIMIT 1`,
        [groupId, userId]
    );

    return membershipResult.rows[0] || null;
};

const createGroup = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            name,
            description,
            is_private: isPrivate = false,
            members = [],
            max_members: maxMembers = MAX_GROUP_MEMBERS_LIMIT
        } = req.body;

        const normalizedMaxMembers = Number(maxMembers);

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({ error: 'La descripcion del grupo es obligatoria' });
        }

        if (!isPrivate) {
            const duplicatePublicGroupResult = await client.query(
                `SELECT id
                 FROM groups
                 WHERE is_private = FALSE
                   AND LOWER(TRIM(name)) = LOWER(TRIM($1))
                 LIMIT 1`,
                [name]
            );

            if (duplicatePublicGroupResult.rows.length > 0) {
                return res.status(409).json({
                    error: 'Ya existe un grupo publico con ese nombre'
                });
            }
        }

        if (
            !Number.isInteger(normalizedMaxMembers)
            || normalizedMaxMembers < MIN_GROUP_MEMBERS_LIMIT
            || normalizedMaxMembers > MAX_GROUP_MEMBERS_LIMIT
        ) {
            return res.status(400).json({
                error: `La cantidad de personas debe estar entre ${MIN_GROUP_MEMBERS_LIMIT} y ${MAX_GROUP_MEMBERS_LIMIT}`
            });
        }

        const memberIds = [...new Set([req.user.id, ...members])];

        if (memberIds.length > normalizedMaxMembers) {
            return res.status(400).json({
                error: 'La cantidad inicial de miembros supera el cupo maximo del grupo'
            });
        }

        await client.query('BEGIN');

        await assertUserCanUseRestrictedFeatures(client, req.user.id, {
            errorPrefix: 'No puedes crear grupos'
        });

        const usersResult = await client.query(
            `SELECT id, name, is_banned, role
             FROM users
             WHERE id = ANY($1::uuid[])`,
            [memberIds]
        );

        if (usersResult.rows.length !== memberIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Uno o mas usuarios no existen' });
        }

        const bannedUsers = usersResult.rows.filter((user) => user.is_banned || isAdminAccount(user));

        if (bannedUsers.length > 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'No se puede crear el grupo con usuarios baneados o administradores',
                banned_users: bannedUsers.map((user) => ({
                    id: user.id,
                    name: user.name
                }))
            });
        }

        const groupResult = await client.query(
            `INSERT INTO groups (name, description, is_private, created_by, max_members)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, description, is_private, created_by, max_members, created_at`,
            [name.trim(), description.trim(), isPrivate, req.user.id, normalizedMaxMembers]
        );

        const createdMembers = [];
        for (const memberId of memberIds) {
            const role = memberId === req.user.id ? 'owner' : 'member';
            const memberResult = await client.query(
                `INSERT INTO group_members (user_id, group_id, role)
                 VALUES ($1, $2, $3)
                 RETURNING id, user_id, group_id, role, joined_at`,
                [memberId, groupResult.rows[0].id, role]
            );

            createdMembers.push(memberResult.rows[0]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Grupo creado correctamente',
            group: groupResult.rows[0],
            members: createdMembers
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const addGroupMember = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;
        const { user_id: userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'El user_id es obligatorio' });
        }

        await client.query('BEGIN');

        await assertUserCanUseRestrictedFeatures(client, req.user.id, {
            errorPrefix: 'No puedes agregar miembros'
        });

        const membershipResult = await client.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (membershipResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        if (!['owner', 'admin'].includes(membershipResult.rows[0].role)) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'Solo un owner o admin puede agregar miembros'
            });
        }

        const userResult = await client.query(
            `SELECT id, name, is_banned, role
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        if (userResult.rows[0].is_banned || isAdminAccount(userResult.rows[0])) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No se puede agregar un usuario baneado o administrador' });
        }

        await assertUserCanUseRestrictedFeatures(client, userId, {
            errorPrefix: 'No se puede agregar este usuario'
        });

        const activeMemberResult = await client.query(
            `SELECT id
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, userId]
        );

        if (activeMemberResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'El usuario ya pertenece al grupo' });
        }

        await ensureGroupCapacity(client, groupId);

        const inactiveMemberResult = await client.query(
            `SELECT id
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NOT NULL
             ORDER BY joined_at DESC
             LIMIT 1`,
            [groupId, userId]
        );

        let memberResult;
        if (inactiveMemberResult.rows.length > 0) {
            memberResult = await client.query(
                `UPDATE group_members
                 SET left_at = NULL,
                     joined_at = CURRENT_TIMESTAMP,
                     role = 'member'
                 WHERE id = $1
                 RETURNING id, user_id, group_id, role, joined_at, left_at`,
                [inactiveMemberResult.rows[0].id]
            );
        } else {
            memberResult = await client.query(
                `INSERT INTO group_members (user_id, group_id, role)
                 VALUES ($1, $2, 'member')
                 RETURNING id, user_id, group_id, role, joined_at, left_at`,
                [userId, groupId]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Miembro agregado correctamente',
            member: memberResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getMyGroups = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const params = [req.user.id];
        let searchFilter = '';

        if (search.trim()) {
            params.push(`%${search.trim()}%`);
            searchFilter = 'AND g.name ILIKE $2';
        }

        const result = await pool.query(
            `SELECT
                g.id,
                g.name,
                g.description,
                g.is_private,
                g.max_members,
                g.created_by,
                g.created_at,
                gm.role,
                COUNT(active_members.id) FILTER (WHERE active_members.left_at IS NULL) AS total_members
             FROM group_members gm
             JOIN groups g ON g.id = gm.group_id
             LEFT JOIN group_members active_members ON active_members.group_id = g.id
             WHERE gm.user_id = $1
               AND gm.left_at IS NULL
               ${searchFilter}
             GROUP BY g.id, gm.role
             ORDER BY g.created_at DESC`,
            params
        );

        return res.json({ groups: result.rows });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;

        const membershipResult = await pool.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (membershipResult.rows.length === 0) {
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        const groupResult = await pool.query(
            `SELECT id, name, description, is_private, max_members, created_by, created_at
             FROM groups
             WHERE id = $1`,
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'El grupo no existe' });
        }

        const membersResult = await pool.query(
            `SELECT gm.user_id, u.name, u.email, gm.role, gm.joined_at
             FROM group_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.group_id = $1
               AND gm.left_at IS NULL
             ORDER BY gm.joined_at ASC`,
            [groupId]
        );

        return res.json({
            group: groupResult.rows[0],
            members: membersResult.rows
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const getPublicGroups = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const params = [req.user.id];
        let searchFilter = '';

        if (search.trim()) {
            params.push(`%${search.trim()}%`);
            searchFilter = 'AND g.name ILIKE $2';
        }

        const result = await pool.query(
            `SELECT
                g.id,
                g.name,
                g.description,
                g.is_private,
                g.max_members,
                g.created_by,
                creator.name AS created_by_name,
                g.created_at,
                COUNT(gm.id) FILTER (WHERE gm.left_at IS NULL) AS total_members,
                EXISTS (
                    SELECT 1
                    FROM group_members own_member
                    WHERE own_member.group_id = g.id
                      AND own_member.user_id = $1
                      AND own_member.left_at IS NULL
                ) AS joined
             FROM groups g
             JOIN users creator ON creator.id = g.created_by
             LEFT JOIN group_members gm ON gm.group_id = g.id
             WHERE g.is_private = FALSE
               ${searchFilter}
             GROUP BY g.id, creator.name
             ORDER BY g.created_at DESC`,
            params
        );

        return res.json({ groups: result.rows });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const joinPublicGroup = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;

        await client.query('BEGIN');

        await assertUserCanUseRestrictedFeatures(client, req.user.id, {
            errorPrefix: 'No puedes unirte a grupos'
        });

        const group = await getGroupCapacity(client, groupId);

        if (!group) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El grupo no existe' });
        }

        if (group.is_private) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Solo puedes unirte a grupos publicos' });
        }

        const activeMemberResult = await client.query(
            `SELECT id
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (activeMemberResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Ya perteneces a este grupo' });
        }

        await ensureGroupCapacity(client, groupId);

        const inactiveMemberResult = await client.query(
            `SELECT id
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NOT NULL
             ORDER BY joined_at DESC
             LIMIT 1`,
            [groupId, req.user.id]
        );

        let memberResult;
        if (inactiveMemberResult.rows.length > 0) {
            memberResult = await client.query(
                `UPDATE group_members
                 SET left_at = NULL,
                     joined_at = CURRENT_TIMESTAMP,
                     role = 'member'
                 WHERE id = $1
                 RETURNING id, user_id, group_id, role, joined_at, left_at`,
                [inactiveMemberResult.rows[0].id]
            );
        } else {
            memberResult = await client.query(
                `INSERT INTO group_members (user_id, group_id, role)
                 VALUES ($1, $2, 'member')
                 RETURNING id, user_id, group_id, role, joined_at, left_at`,
                [req.user.id, groupId]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Te uniste al grupo correctamente',
            member: memberResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const inviteToGroup = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;
        const { invited_user_id: invitedUserId } = req.body;

        if (!invitedUserId) {
            return res.status(400).json({ error: 'El invited_user_id es obligatorio' });
        }

        await client.query('BEGIN');

        await assertUserCanUseRestrictedFeatures(client, req.user.id, {
            errorPrefix: 'No puedes invitar personas a grupos'
        });

        const groupResult = await client.query(
            `SELECT id, is_private
             FROM groups
             WHERE id = $1
             LIMIT 1`,
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El grupo no existe' });
        }

        const membershipResult = await client.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (membershipResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        const group = groupResult.rows[0];
        const canInvite = !group.is_private || ['owner', 'admin'].includes(membershipResult.rows[0].role);

        if (!canInvite) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'En grupos privados solo un propietario o administrador puede invitar usuarios'
            });
        }

        const userResult = await client.query(
            `SELECT id, is_banned, role
             FROM users
             WHERE id = $1`,
            [invitedUserId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El usuario invitado no existe' });
        }

        if (userResult.rows[0].is_banned || isAdminAccount(userResult.rows[0])) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No se puede invitar un usuario baneado o administrador' });
        }

        await assertUserCanUseRestrictedFeatures(client, invitedUserId, {
            errorPrefix: 'No se puede invitar este usuario'
        });

        const existingMemberResult = await client.query(
            `SELECT id
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, invitedUserId]
        );

        if (existingMemberResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'El usuario ya pertenece al grupo' });
        }

        const invitationResult = await client.query(
            `SELECT id
             FROM group_invitations
             WHERE group_id = $1
               AND invited_user_id = $2
               AND status = 'pending'
             LIMIT 1`,
            [groupId, invitedUserId]
        );

        if (invitationResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Ya existe una invitacion pendiente para este usuario' });
        }

        const createdInvitation = await client.query(
            `INSERT INTO group_invitations (group_id, invited_user_id, invited_by, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING id, group_id, invited_user_id, invited_by, status, created_at`,
            [groupId, invitedUserId, req.user.id]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Invitacion enviada correctamente',
            invitation: createdInvitation.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const respondToInvitation = async (req, res) => {
    const client = await pool.connect();

    try {
        const { invitationId } = req.params;
        const { action } = req.body;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'La accion debe ser accept o reject' });
        }

        await client.query('BEGIN');

        await assertUserCanUseRestrictedFeatures(client, req.user.id, {
            errorPrefix: 'No puedes unirte a grupos'
        });

        const invitationResult = await client.query(
            `SELECT id, group_id, invited_user_id, status
             FROM group_invitations
             WHERE id = $1
             LIMIT 1`,
            [invitationId]
        );

        if (invitationResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'La invitacion no existe' });
        }

        const invitation = invitationResult.rows[0];

        if (invitation.invited_user_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No puedes responder una invitacion ajena' });
        }

        if (invitation.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'La invitacion ya fue respondida' });
        }

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';

        const updatedInvitation = await client.query(
            `UPDATE group_invitations
             SET status = $1
             WHERE id = $2
             RETURNING id, group_id, invited_user_id, invited_by, status, created_at`,
            [newStatus, invitationId]
        );

        let member = null;
        if (action === 'accept') {
            await ensureGroupCapacity(client, invitation.group_id);

            const activeMemberResult = await client.query(
                `SELECT id
                 FROM group_members
                 WHERE group_id = $1
                   AND user_id = $2
                   AND left_at IS NULL
                 LIMIT 1`,
                [invitation.group_id, req.user.id]
            );

            if (activeMemberResult.rows.length === 0) {
                const inactiveMemberResult = await client.query(
                    `SELECT id
                     FROM group_members
                     WHERE group_id = $1
                       AND user_id = $2
                       AND left_at IS NOT NULL
                     ORDER BY joined_at DESC
                     LIMIT 1`,
                    [invitation.group_id, req.user.id]
                );

                if (inactiveMemberResult.rows.length > 0) {
                    const memberResult = await client.query(
                        `UPDATE group_members
                         SET left_at = NULL,
                             joined_at = CURRENT_TIMESTAMP,
                             role = 'member'
                         WHERE id = $1
                         RETURNING id, user_id, group_id, role, joined_at, left_at`,
                        [inactiveMemberResult.rows[0].id]
                    );
                    member = memberResult.rows[0];
                } else {
                    const memberResult = await client.query(
                        `INSERT INTO group_members (user_id, group_id, role)
                         VALUES ($1, $2, 'member')
                         RETURNING id, user_id, group_id, role, joined_at, left_at`,
                        [req.user.id, invitation.group_id]
                    );
                    member = memberResult.rows[0];
                }
            }
        }

        await client.query('COMMIT');

        return res.json({
            message: action === 'accept'
                ? 'Invitacion aceptada correctamente'
                : 'Invitacion rechazada correctamente',
            invitation: updatedInvitation.rows[0],
            member
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getMyInvitations = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                gi.id,
                gi.group_id,
                g.name AS group_name,
                gi.invited_by,
                inviter.name AS invited_by_name,
                gi.status,
                gi.created_at
             FROM group_invitations gi
             JOIN groups g ON g.id = gi.group_id
             JOIN users inviter ON inviter.id = gi.invited_by
             WHERE gi.invited_user_id = $1
             ORDER BY gi.created_at DESC`,
            [req.user.id]
        );

        return res.json({ invitations: result.rows });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const leaveGroup = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;

        await client.query('BEGIN');

        const membershipResult = await client.query(
            `SELECT id, role
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (membershipResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No perteneces a este grupo' });
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

        const pendingDebtResult = await client.query(
            `SELECT 1
             FROM balances
             WHERE group_id = $1
               AND debtor_id = $2
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (pendingDebtResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'No puedes abandonar el grupo hasta pagar lo que debes'
            });
        }

        const activeLoanDebtResult = await client.query(
            `SELECT 1
             FROM loans
             WHERE group_id = $1
               AND borrower_id = $2
               AND status = 'active'
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (activeLoanDebtResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'No puedes abandonar el grupo hasta pagar lo que debes'
            });
        }

        let newOwner = null;

        if (membershipResult.rows[0].role === 'owner') {
            const replacementResult = await client.query(
                `SELECT gm.user_id, u.name
                 FROM group_members gm
                 JOIN users u ON u.id = gm.user_id
                 WHERE gm.group_id = $1
                   AND gm.user_id <> $2
                   AND gm.left_at IS NULL
                 ORDER BY gm.joined_at ASC
                 LIMIT 1`,
                [groupId, req.user.id]
            );

            if (replacementResult.rows.length > 0) {
                newOwner = replacementResult.rows[0];

                await client.query(
                    `UPDATE group_members
                     SET role = 'owner'
                     WHERE group_id = $1
                       AND user_id = $2
                       AND left_at IS NULL`,
                    [groupId, newOwner.user_id]
                );

                await client.query(
                    `UPDATE groups
                     SET created_by = $1
                     WHERE id = $2`,
                    [newOwner.user_id, groupId]
                );
            }
        }

        await client.query(
            `UPDATE group_members
             SET left_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [membershipResult.rows[0].id]
        );

        await client.query('COMMIT');

        return res.json({
            message: 'Saliste del grupo correctamente',
            new_owner: newOwner
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const deleteGroup = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;

        await client.query('BEGIN');

        const groupResult = await client.query(
            `SELECT id, created_by, name
             FROM groups
             WHERE id = $1
             LIMIT 1`,
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El grupo no existe' });
        }

        const membershipResult = await client.query(
            `SELECT id
             FROM group_members
             WHERE group_id = $1
               AND user_id = $2
               AND left_at IS NULL
             LIMIT 1`,
            [groupId, req.user.id]
        );

        if (membershipResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        if (groupResult.rows[0].created_by !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'Solo el creador del grupo puede eliminarlo'
            });
        }

        const balancesResult = await client.query(
            `SELECT 1
             FROM balances
             WHERE group_id = $1
             LIMIT 1`,
            [groupId]
        );

        if (balancesResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'No puedes eliminar el grupo mientras haya deudas pendientes entre sus miembros'
            });
        }

        const activeLoansResult = await client.query(
            `SELECT 1
             FROM loans
             WHERE group_id = $1
               AND status = 'active'
             LIMIT 1`,
            [groupId]
        );

        if (activeLoansResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'No puedes eliminar el grupo mientras haya prestamos activos'
            });
        }

        await client.query(
            `DELETE FROM groups
             WHERE id = $1`,
            [groupId]
        );

        await client.query('COMMIT');

        return res.json({
            message: 'Grupo eliminado correctamente',
            deleted_group_id: groupId
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;

        const membership = await ensureActiveMembership(pool, groupId, req.user.id);
        if (!membership) {
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        const result = await pool.query(
            `SELECT
                gm.id,
                gm.group_id,
                gm.sender_id,
                u.name AS sender_name,
                gm.message,
                gm.created_at
             FROM group_messages gm
             JOIN users u ON u.id = gm.sender_id
             WHERE gm.group_id = $1
             ORDER BY gm.created_at ASC`,
            [groupId]
        );

        return res.json({ messages: result.rows });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const sendGroupMessage = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'El mensaje es obligatorio' });
        }

        const membership = await ensureActiveMembership(client, groupId, req.user.id);
        if (!membership) {
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        const result = await client.query(
            `INSERT INTO group_messages (group_id, sender_id, message)
             VALUES ($1, $2, $3)
             RETURNING id, group_id, sender_id, message, created_at`,
            [groupId, req.user.id, message.trim()]
        );

        return res.status(201).json({
            message: 'Mensaje enviado correctamente',
            group_message: result.rows[0]
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    createGroup,
    addGroupMember,
    getMyGroups,
    getPublicGroups,
    joinPublicGroup,
    getGroupDetails,
    inviteToGroup,
    respondToInvitation,
    getMyInvitations,
    leaveGroup,
    deleteGroup,
    getGroupMessages,
    sendGroupMessage
};
