const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-temporaria';

class AuthController {
    async login(req, res) {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Email e senha são obrigatórios'
                });
            }

            const [usuarios] = await db.query(`
                SELECT
                    u.id, u.nome, u.email, u.senha, u.cpf, u.telefone,
                    u.cargo, u.unidade, u.status, u.nivel_acesso_codigo,
                    na.nome as nivel_nome
                FROM usuarios u
                JOIN niveis_acesso na ON u.nivel_acesso_codigo = na.codigo
                WHERE u.email = ?
            `, [email.toLowerCase()]);

            if (usuarios.length === 0) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Credenciais inválidas'
                });
            }

            const usuario = usuarios[0];

            if (usuario.status !== 'ativo') {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Usuário inativo ou suspenso'
                });
            }

            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (!senhaValida) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Credenciais inválidas'
                });
            }

            const [permissoes] = await db.query(`
                SELECT
                    p.modulo_codigo, p.pode_visualizar, p.pode_criar,
                    p.pode_editar, p.pode_excluir, p.pode_exportar,
                    p.restricao_unidade, ms.nome as modulo_nome,
                    ms.icone as modulo_icone
                FROM permissoes p
                JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
                JOIN modulos_sistema ms ON p.modulo_codigo = ms.codigo
                WHERE na.codigo = ? AND ms.ativo = TRUE
                ORDER BY ms.ordem
            `, [usuario.nivel_acesso_codigo]);

            const token = jwt.sign(
                { userId: usuario.id },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            delete usuario.senha;

            res.json({
                sucesso: true,
                mensagem: 'Login realizado com sucesso',
                token,
                usuario,
                permissoes,
                expira_em: new Date(Date.now() + 8 * 60 * 60 * 1000)
            });
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao realizar login'
            });
        }
    }

    async logout(req, res) {
        res.json({
            sucesso: true,
            mensagem: 'Logout realizado com sucesso'
        });
    }

    async verificar(req, res) {
        try {
            const usuario = req.usuario;

            const [permissoes] = await db.query(`
                SELECT modulo_codigo, pode_visualizar
                FROM permissoes p
                JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
                WHERE na.codigo = ?
            `, [usuario.nivel_acesso_codigo]);

            res.json({
                sucesso: true,
                sessao: {
                    usuario_id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    cargo: usuario.cargo,
                    unidade: usuario.unidade,
                    nivel_acesso: usuario.nivel_acesso_codigo,
                    permissoes: permissoes.filter(p => p.pode_visualizar).map(p => p.modulo_codigo)
                }
            });
        } catch (error) {
            res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao verificar sessão'
            });
        }
    }

    async me(req, res) {
        try {
            const [permissoes] = await db.query(`
                SELECT
                    p.modulo_codigo, p.pode_visualizar, p.pode_criar,
                    p.pode_editar, p.pode_excluir, p.pode_exportar,
                    ms.nome as modulo_nome, ms.icone as modulo_icone
                FROM permissoes p
                JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
                JOIN modulos_sistema ms ON p.modulo_codigo = ms.codigo
                WHERE na.codigo = ?
            `, [req.usuario.nivel_acesso_codigo]);

            res.json({
                sucesso: true,
                usuario: req.usuario,
                permissoes
            });
        } catch (error) {
            res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao buscar dados'
            });
        }
    }

    async alterarSenha(req, res) {
        try {
            const { senha_atual, senha_nova } = req.body;

            if (!senha_atual || !senha_nova) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Senhas são obrigatórias'
                });
            }

            const [usuarios] = await db.query(
                'SELECT senha FROM usuarios WHERE id = ?',
                [req.usuario.id]
            );

            const senhaValida = await bcrypt.compare(senha_atual, usuarios[0].senha);
            if (!senhaValida) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Senha atual incorreta'
                });
            }

            if (senha_nova.length < 6) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Senha deve ter mínimo 6 caracteres'
                });
            }

            const senhaCriptografada = await bcrypt.hash(senha_nova, 10);
            await db.query(
                'UPDATE usuarios SET senha = ? WHERE id = ?',
                [senhaCriptografada, req.usuario.id]
            );

            res.json({
                sucesso: true,
                mensagem: 'Senha alterada com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao alterar senha'
            });
        }
    }
}

module.exports = new AuthController();
