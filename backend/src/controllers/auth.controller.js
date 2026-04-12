const pool = require('../db/connection');
const env = require('../config/env');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const isAdult = (birthDate) => {
    const today = new Date();
    const date = new Date(birthDate);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age -= 1;
    }

    return age >= 18;
};

const register = async (req, res) => {
    try {
        const { name, email, password, birth_date } = req.body;

        if (!name || !email || !password || !birth_date) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        const birthDate = new Date(birth_date);
        const today = new Date();

        if (Number.isNaN(birthDate.getTime())) {
            return res.status(400).json({ error: 'Debes ingresar una fecha de nacimiento valida' });
        }

        if (birthDate > today) {
            return res.status(400).json({ error: 'La fecha de nacimiento no puede ser mayor a la fecha actual' });
        }

        if (!isAdult(birth_date)) {
            return res.status(400).json({ error: 'Debes ser mayor de edad para registrarte' });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, birth_date)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email`,
            [name, email, hash, birth_date]
        );

        res.json(result.rows[0]);

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El correo ya esta registrado' });
        }

        if (error.constraint === 'age_check') {
            return res.status(400).json({ error: 'Debes ser mayor de edad para registrarte' });
        }

        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            env.jwtSecret,
            { expiresIn: env.jwtExpiresIn }
        );

        res.json({
            message: 'Login exitoso',
            token
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login };
