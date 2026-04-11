const pool = require('../db/connection');

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

module.exports = { getUsers };
