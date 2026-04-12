const pool = require('../db/connection');

const normalizeFriendPair = (firstUserId, secondUserId) => (
    [firstUserId, secondUserId].sort((a, b) => a.localeCompare(b))
);

const listUsers = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const params = [req.user.id];
        let searchFilter = '';

        if (search.trim()) {
            params.push(`%${search.trim()}%`);
            searchFilter = 'AND (u.name ILIKE $2 OR u.email ILIKE $2)';
        }

        const result = await pool.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                EXISTS (
                    SELECT 1
                    FROM friendships f
                    WHERE (f.user_one_id = u.id AND f.user_two_id = $1)
                       OR (f.user_two_id = u.id AND f.user_one_id = $1)
                ) AS is_friend
             FROM users u
             WHERE u.id <> $1
               ${searchFilter}
             ORDER BY u.name ASC`,
            params
        );

        return res.json({ users: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const sendFriendRequest = async (req, res) => {
    const client = await pool.connect();

    try {
        const { receiver_id: receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ error: 'El receiver_id es obligatorio' });
        }

        if (receiverId === req.user.id) {
            return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' });
        }

        await client.query('BEGIN');

        const receiverResult = await client.query(
            `SELECT id, is_banned
             FROM users
             WHERE id = $1`,
            [receiverId]
        );

        if (receiverResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        if (receiverResult.rows[0].is_banned) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No puedes enviar solicitud a un usuario baneado' });
        }

        const [userOneId, userTwoId] = normalizeFriendPair(req.user.id, receiverId);
        const friendshipResult = await client.query(
            `SELECT id
             FROM friendships
             WHERE user_one_id = $1
               AND user_two_id = $2
             LIMIT 1`,
            [userOneId, userTwoId]
        );

        if (friendshipResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Ya son amigos' });
        }

        const pendingRequestResult = await client.query(
            `SELECT id
             FROM friend_requests
             WHERE status = 'pending'
               AND (
                    (sender_id = $1 AND receiver_id = $2)
                 OR (sender_id = $2 AND receiver_id = $1)
               )
             LIMIT 1`,
            [req.user.id, receiverId]
        );

        if (pendingRequestResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Ya existe una solicitud pendiente entre ambos usuarios' });
        }

        const requestResult = await client.query(
            `INSERT INTO friend_requests (sender_id, receiver_id, status)
             VALUES ($1, $2, 'pending')
             RETURNING id, sender_id, receiver_id, status, created_at`,
            [req.user.id, receiverId]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Solicitud de amistad enviada correctamente',
            request: requestResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const [receivedResult, sentResult] = await Promise.all([
            pool.query(
                `SELECT
                    fr.id,
                    fr.sender_id,
                    sender.name AS sender_name,
                    sender.email AS sender_email,
                    fr.receiver_id,
                    fr.status,
                    fr.created_at
                 FROM friend_requests fr
                 JOIN users sender ON sender.id = fr.sender_id
                 WHERE fr.receiver_id = $1
                 ORDER BY fr.created_at DESC`,
                [req.user.id]
            ),
            pool.query(
                `SELECT
                    fr.id,
                    fr.receiver_id,
                    receiver.name AS receiver_name,
                    receiver.email AS receiver_email,
                    fr.status,
                    fr.created_at
                 FROM friend_requests fr
                 JOIN users receiver ON receiver.id = fr.receiver_id
                 WHERE fr.sender_id = $1
                 ORDER BY fr.created_at DESC`,
                [req.user.id]
            )
        ]);

        return res.json({
            received: receivedResult.rows,
            sent: sentResult.rows
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const cancelFriendRequest = async (req, res) => {
    const client = await pool.connect();

    try {
        const { requestId } = req.params;

        await client.query('BEGIN');

        const requestResult = await client.query(
            `SELECT id, sender_id, status
             FROM friend_requests
             WHERE id = $1
             LIMIT 1`,
            [requestId]
        );

        if (requestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'La solicitud no existe' });
        }

        const request = requestResult.rows[0];

        if (request.sender_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Solo puedes cancelar tus propias solicitudes' });
        }

        if (request.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Solo puedes cancelar solicitudes pendientes' });
        }

        await client.query(
            `DELETE FROM friend_requests
             WHERE id = $1`,
            [requestId]
        );

        await client.query('COMMIT');

        return res.json({ message: 'Solicitud cancelada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const respondFriendRequest = async (req, res) => {
    const client = await pool.connect();

    try {
        const { requestId } = req.params;
        const { action } = req.body;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'La accion debe ser accept o reject' });
        }

        await client.query('BEGIN');

        const requestResult = await client.query(
            `SELECT id, sender_id, receiver_id, status
             FROM friend_requests
             WHERE id = $1
             LIMIT 1`,
            [requestId]
        );

        if (requestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'La solicitud no existe' });
        }

        const request = requestResult.rows[0];

        if (request.receiver_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No puedes responder una solicitud ajena' });
        }

        if (request.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'La solicitud ya fue respondida' });
        }

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';

        const updatedRequestResult = await client.query(
            `UPDATE friend_requests
             SET status = $1,
                 responded_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, sender_id, receiver_id, status, created_at, responded_at`,
            [newStatus, requestId]
        );

        let friendship = null;
        if (action === 'accept') {
            const [userOneId, userTwoId] = normalizeFriendPair(request.sender_id, request.receiver_id);
            const friendshipResult = await client.query(
                `INSERT INTO friendships (user_one_id, user_two_id)
                 VALUES ($1, $2)
                 ON CONFLICT (user_one_id, user_two_id) DO NOTHING
                 RETURNING id, user_one_id, user_two_id, created_at`,
                [userOneId, userTwoId]
            );

            friendship = friendshipResult.rows[0] || {
                user_one_id: userOneId,
                user_two_id: userTwoId
            };
        }

        await client.query('COMMIT');

        return res.json({
            message: action === 'accept'
                ? 'Solicitud de amistad aceptada correctamente'
                : 'Solicitud de amistad rechazada correctamente',
            request: updatedRequestResult.rows[0],
            friendship
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getFriends = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                CASE
                    WHEN f.user_one_id = $1 THEN f.user_two_id
                    ELSE f.user_one_id
                END AS friend_id,
                CASE
                    WHEN f.user_one_id = $1 THEN friend_two.name
                    ELSE friend_one.name
                END AS friend_name,
                CASE
                    WHEN f.user_one_id = $1 THEN friend_two.email
                    ELSE friend_one.email
                END AS friend_email,
                f.created_at
             FROM friendships f
             JOIN users friend_one ON friend_one.id = f.user_one_id
             JOIN users friend_two ON friend_two.id = f.user_two_id
             WHERE f.user_one_id = $1
                OR f.user_two_id = $1
             ORDER BY f.created_at DESC`,
            [req.user.id]
        );

        return res.json({ friends: result.rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    listUsers,
    sendFriendRequest,
    getFriendRequests,
    cancelFriendRequest,
    respondFriendRequest,
    getFriends
};
