const express = require('express');
const app = express();

const testRoutes = require('./routes/test.routes');

app.use(express.json());

// rutas
app.use('/api', testRoutes);

app.get('/', (req, res) => {
    res.send('API funcionando 🚀');
});

app.listen(3000, () => {
    console.log('Servidor en puerto 3000');
});

const pool = require('./db/connection');

app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});