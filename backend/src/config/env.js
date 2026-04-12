const dotenv = require('dotenv');

dotenv.config();

const env = {
    port: Number(process.env.PORT || 3000),
    db: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'nequi_coop',
        password: process.env.DB_PASSWORD || '1234',
        port: Number(process.env.DB_PORT || 5432)
    },
    jwtSecret: process.env.JWT_SECRET || 'secreto123',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
};

module.exports = env;
