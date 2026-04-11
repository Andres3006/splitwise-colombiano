const bcrypt = require('bcrypt');

const pool = require('./connection');

const ensureSeedUserPasswords = async () => {
    const seedUsersResult = await pool.query(
        `SELECT id
         FROM users
         WHERE password_hash = 'hash'`
    );

    if (seedUsersResult.rows.length === 0) {
        return;
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    await pool.query(
        `UPDATE users
         SET password_hash = $1
         WHERE password_hash = 'hash'`,
        [hashedPassword]
    );
};

module.exports = { ensureSeedUserPasswords };
