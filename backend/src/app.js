const express = require('express');

const pool = require('./db/connection');
const { ensureSplitwiseSchema } = require('./db/splitwise.schema');
const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes');
const expensesRoutes = require('./routes/expenses.routes');
const balancesRoutes = require('./routes/balances.routes');
const groupsRoutes = require('./routes/groups.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const verifyToken = require('./middlewares/auth.middleware');

const app = express();

app.use(express.json());

app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/balances', balancesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
    res.send('API funcionando');
});

app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/private', verifyToken, (req, res) => {
    res.json({
        message: 'Ruta protegida',
        user: req.user
    });
});

const startServer = async () => {
    try {
        await ensureSplitwiseSchema();
        app.listen(3000, () => {
            console.log('Servidor en puerto 3000');
        });
    } catch (error) {
        console.error('Error iniciando servidor:', error.message);
        process.exit(1);
    }
};

startServer();
