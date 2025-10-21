const express = require('express');
const app = express();

app.get('/test', (req, res) => {
    res.send('Funcionou!');
});

app.listen(3000, () => {
    console.log('Servidor teste na porta 3000');
});
