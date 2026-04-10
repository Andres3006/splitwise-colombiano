const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API funcionando 🚀');
});

app.listen(3000, () => {
  console.log('Servidor en puerto 3000');
});

app.get('/test', (req, res) => {
  res.send('Funciona endpoint test');
});