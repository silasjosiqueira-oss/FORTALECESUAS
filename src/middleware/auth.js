/**
 * Middleware de Autenticação JWT
 * Compatível com ambos os sistemas (multi-tenant e legado)
 */

const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-temporaria';

/**
 * Middleware: Autenticar usuário via JWT (MULTI-TENANT)
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                sucesso: false,
                error: 'Token não fornecido',
                mensagem: 'Token não fornecido'
            });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('❌ Token inválido:', err.message);

                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        sucesso: false,
                        error: 'Token expirado',
                        mensagem: 'Token expirado'
                    });
                }

                return res.status(403).json({
                    sucesso: false,
                    error: 'Token inválido ou expirado',
                    mensagem: 'Token inválido'
                });
            }

            // Verificar tenant (se disponível no request)
            if (req.tenantId && decoded.tenantId && decoded.tenantId !== req.tenantId) {
                return res.status(403).json({
                    sucesso: false,
                    error: 'Token não pertence a esta organização',
                    mensagem: 'Acesso negado'
                });
            }

            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('❌ Erro na autenticação:', error);
        res.status(500).json({
            sucesso: false,
            error: 'Erro na autenticação',
            mensagem: 'Erro na autenticação'
        });
    }
};

/**
 * Middleware: Autenticar usuário via JWT (LEGADO - compatibilidade)
 * Busca dados completos do usuário no banco
 */
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
        const connection = await getConnection();

        const [usuarios] = await connection.query(`
            SELECT
                u.id, u.nome, u.email, u.cpf, u.cargo,
                u.unidade, u.telefone, u.status, u.ativo,
                u.nivel_acesso_codigo, u.perfil,
                na.nome as nivel_nome
            FROM usuarios u
            LEFT JOIN niveis_acesso na ON u.nivel_acesso_codigo = na.codigo
            WHERE u.id = ? AND (u.status = 'ativo' OR u.ativo = TRUE)
        `, [decoded.userId]);

        if (usuarios.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário inválido ou inativo'
            });
        }

        req.usuario = usuarios[0];
        req.user = decoded; // Compatibilidade
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token inválido'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token expirado'
            });
        }
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro na autenticação'
        });
    }
}

/**
 * Middleware: Verificar permissão para módulo específico
 */
function verificarPermissao(moduloCodigo, acao = 'visualizar') {
    return async (req, res, next) => {
        try {
            const usuario = req.usuario || req.user;

            if (!usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Usuário não autenticado'
                });
            }

            // Admin tem tudo
            const isAdmin = usuario.nivel_acesso_codigo === 'administrador' ||
                           usuario.perfil === 'admin';

            if (isAdmin) {
                req.permissao = {
                    pode_visualizar: true,
                    pode_criar: true,
                    pode_editar: true,
                    pode_excluir: true,
                    pode_exportar: true,
                    restricao_unidade: false
                };
                return next();
            }

            const connection = await getConnection();
            const [permissoes] = await connection.query(`
                SELECT p.*
                FROM permissoes p
                LEFT JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
                WHERE (na.codigo = ? OR p.perfil = ?)
                AND (p.modulo_codigo = ? OR p.recurso = ?)
            `, [
                usuario.nivel_acesso_codigo || usuario.nivel_acesso,
                usuario.perfil,
                moduloCodigo,
                moduloCodigo
            ]);

            if (permissoes.length === 0) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso negado a este módulo'
                });
            }

            const permissao = permissoes[0];
            const acoesPermitidas = {
                'visualizar': permissao.pode_visualizar,
                'criar': permissao.pode_criar,
                'editar': permissao.pode_editar,
                'excluir': permissao.pode_excluir,
                'exportar': permissao.pode_exportar
            };

            if (!acoesPermitidas[acao]) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: `Sem permissão para ${acao}`
                });
            }

            req.permissao = permissao;
            next();
        } catch (error) {
            console.error('❌ Erro ao verificar permissões:', error);
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao verificar permissões'
            });
        }
    };
}

/**
 * Middleware: Restringir a apenas administradores
 */
function apenasAdmin(req, res, next) {
    const usuario = req.usuario || req.user;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Não autenticado'
        });
    }

    const isAdmin = usuario.nivel_acesso_codigo === 'administrador' ||
                   usuario.perfil === 'admin';

    if (!isAdmin) {
        return res.status(403).json({
            sucesso: false,
            mensagem: 'Acesso restrito a administradores'
        });
    }

    next();
}

/**
 * Middleware: Apenas Admin (alias para multi-tenant)
 */
const requireAdmin = apenasAdmin;

/**
 * Middleware: Aplicar filtro de unidade
 */
function aplicarFiltroUnidade(req, res, next) {
    const permissao = req.permissao;
    const usuario = req.usuario || req.user;

    if (!permissao || !permissao.restricao_unidade) {
        req.filtroUnidade = null;
        return next();
    }

    req.filtroUnidade = usuario.unidade;
    next();
}

module.exports = {
    authenticateToken,
    autenticar,
    verificarPermissao,
    apenasAdmin,
    requireAdmin,
    aplicarFiltroUnidade
};
