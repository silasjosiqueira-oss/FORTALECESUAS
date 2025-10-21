const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-temporaria';

async function autenticar(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token não fornecido'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const [usuarios] = await db.query(`
            SELECT u.*, na.codigo as nivel_acesso_codigo, na.nome as nivel_nome
            FROM usuarios u
            JOIN niveis_acesso na ON u.nivel_acesso_codigo = na.codigo
            WHERE u.id = ? AND u.status = 'ativo'
        `, [decoded.userId]);

        if (usuarios.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário inválido'
            });
        }

        req.usuario = usuarios[0];
        next();
    } catch (error) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Token inválido'
        });
    }
}

module.exports = { autenticar };
