const express = require('express');
const path = require('path');

const env = require('./config/env');
const pool = require('./db/connection');
const { ensureSeedUserPasswords } = require('./db/bootstrap');
const { ensureSplitwiseSchema } = require('./db/splitwise.schema');
const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes');
const expensesRoutes = require('./routes/expenses.routes');
const balancesRoutes = require('./routes/balances.routes');
const groupsRoutes = require('./routes/groups.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const paymentsRoutes = require('./routes/payments.routes');
const loansRoutes = require('./routes/loans.routes');
const usersRoutes = require('./routes/users.routes');
const socialRoutes = require('./routes/social.routes');
const verifyToken = require('./middlewares/auth.middleware');

const app = express();
const frontendRoot = path.join(__dirname, '..', '..', 'frontend');
const frontendDist = path.join(frontendRoot, 'dist');
const hasFrontendDist = require('fs').existsSync(frontendDist);

app.use(express.json());
app.use(express.static(hasFrontendDist ? frontendDist : frontendRoot));

app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/balances', balancesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/social', socialRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(hasFrontendDist ? frontendDist : frontendRoot, 'index.html'));
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

app.get(/^\/(?!api|db-test|private).*/, (req, res) => {
    if (!hasFrontendDist) {
        return res.status(404).json({
            error: 'No existe build del frontend React. Ejecuta npm run build en frontend o usa npm run dev.'
        });
    }

    return res.sendFile(path.join(frontendDist, 'index.html'));
});

const startServer = async () => {
    try {
        await ensureSplitwiseSchema();
        await ensureSeedUserPasswords();
        app.listen(env.port, () => {
            console.log(`Servidor en puerto ${env.port}`);
        });
    } catch (error) {
        console.error('Error iniciando servidor:', error.message);
        process.exit(1);
    }
};

startServer();
