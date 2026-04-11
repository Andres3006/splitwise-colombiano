const pool = require('../db/connection');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
    try {
        const { name, email, password, birth_date } = req.body;

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, birth_date)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email`,
            [name, email, hash, birth_date]
        );

        res.json(result.rows[0]);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register };