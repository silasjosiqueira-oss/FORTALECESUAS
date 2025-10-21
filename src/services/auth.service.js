/**
 * Serviço de Autenticação
 * Compatível com multi-tenant e sistema legado
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-temporaria';

class AuthService {
    /**
     * Realizar login (UNIFICADO)
     * Suporta multi-tenant E sistema legado
     */
    async login(loginField, password, tenantId = null) {
        try {
            console.log('[LOGIN] Tentativa:', { loginField, tenantId: tenantId || 'legado' });

            if (!loginField || !password) {
                throw new Error('Usuário/email e senha são obrigatórios');
            }

            const connection = await getConnection();

            // Query unificada (funciona com e sem tenant)
            let query = `
                SELECT
                    u.*,
                    t.nome_organizacao,
                    t.subdomain,
                    t.plano
                FROM usuarios u
                LEFT JOIN tenants t ON t.id = u.tenant_id
                WHERE (u.username = ? OR u.email = ?)
                AND (u.ativo = TRUE OR u.ativo = 1)
            `;

            const params = [loginField, loginField];

            // Se tem tenantId, filtrar por ele
            if (tenantId) {
                query += ' AND u.tenant_id = ?';
                params.push(tenantId);
            }

            const [users] = await connection.query(query, params);

            console.log('[INFO] Usuários encontrados:', users.length);

            if (users.length === 0) {
                throw new Error('Usuário ou senha inválidos');
            }

            const user = users[0];

            // Verificar senha (compatível com 'senha' e 'senha_hash')
            const senhaHash = user.senha_hash || user.senha;
            const passwordMatch = await bcrypt.compare(password, senhaHash);

            if (!passwordMatch) {
                console.log('[ERRO] Senha inválida');
                throw new Error('Usuário ou senha inválidos');
            }

            console.log('✅ Senha correta! Gerando token...');

            // Buscar permissões (compatível com ambos sistemas)
            const [permissoes] = await connection.query(`
                SELECT
                    p.modulo_codigo,
                    p.pode_visualizar,
                    p.pode_criar,
                    p.pode_editar,
                    p.pode_excluir,
                    p.pode_exportar,
                    p.restricao_unidade,
                    ms.nome as modulo_nome,
                    ms.icone as modulo_icone,
                    ms.ordem
                FROM permissoes p
                LEFT JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
                LEFT JOIN modulos_sistema ms ON p.modulo_codigo = ms.codigo
                WHERE (na.codigo = ? OR p.perfil = ?)
                AND (ms.ativo = TRUE OR ms.ativo IS NULL)
                ORDER BY ms.ordem
            `, [user.nivel_acesso_codigo, user.perfil]);

            const permissoesArray = permissoes
                .filter(p => p.pode_visualizar)
                .map(p => p.modulo_codigo);

            // Admin tem tudo
            if (user.perfil === 'admin' || user.nivel_acesso_codigo === 'administrador') {
                permissoesArray.unshift('todas');
            }

            // Gerar token JWT
            const tokenPayload = {
                userId: user.id,
                tenantId: tenantId || null,
                username: user.username || user.email,
                perfil: user.perfil || 'tecnico',
                nivel_acesso: user.nivel_acesso_codigo || user.perfil,
                nomeCompleto: user.nome_completo || user.nome
            };

            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

            // Atualizar último acesso
            await connection.query(
                'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?',
                [user.id]
            );

            console.log('✅ Login bem-sucedido:', user.email || user.username);

            // Resposta UNIFICADA (compatível com ambos frontends)
            return {
                success: true,
                sucesso: true,
                mensagem: 'Login realizado com sucesso',
                token: token,
                user: {
                    id: user.id,
                    username: user.username || user.email,
                    nome_completo: user.nome_completo || user.nome,
                    nome: user.nome_completo || user.nome,
                    email: user.email,
                    perfil: user.perfil,
                    nivel_acesso: user.nivel_acesso_codigo || user.perfil,
                    cargo: user.cargo,
                    unidade: user.unidade,
                    cpf: user.cpf,
                    telefone: user.telefone,
                    permissoes: permissoesArray,
                    ativo: user.ativo
                },
                usuario: {
                    id: user.id,
                    nome: user.nome_completo || user.nome,
                    email: user.email,
                    cpf: user.cpf,
                    cargo: user.cargo,
                    unidade: user.unidade,
                    nivel_acesso: user.nivel_acesso_codigo || user.perfil,
                    permissoes: permissoesArray,
                    ativo: user.ativo
                },
                tenant: tenantId ? {
                    id: tenantId,
                    nome: user.nome_organizacao,
                    subdomain: user.subdomain,
                    plano: user.plano
                } : null,
                permissoes: permissoes,
                expira_em: new Date(Date.now() + 8 * 60 * 60 * 1000)
            };

        } catch (error) {
            console.error('[ERRO] Erro no login:', error);
            throw error;
        }
    }

    /**
     * Verificar token (UNIFICADO)
     */
    async verificarToken(token, tenantId = null) {
        try {
            let decoded;
            try {
                decoded = jwt.verify(token, JWT_SECRET);
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    throw new Error('Sessão expirada');
                }
                throw new Error('Token inválido');
            }

            const connection = await getConnection();

            let query = `
                SELECT
                    u.*,
                    t.nome_organizacao,
                    t.subdomain,
                    na.nome as nivel_nome
                FROM usuarios u
                LEFT JOIN tenants t ON t.id = u.tenant_id
                LEFT JOIN niveis_acesso na ON u.nivel_acesso_codigo = na.codigo
                WHERE u.id = ? AND (u.ativo = TRUE OR u.ativo = 1)
            `;

            const params = [decoded.userId];

            if (tenantId) {
                query += ' AND u.tenant_id = ?';
                params.push(tenantId);
            }

            const [users] = await connection.query(query, params);

            if (users.length === 0) {
                throw new Error('Sessão inválida');
            }

            const user = users[0];

            // Buscar permissões
            const [permissoes] = await connection.query(`
                SELECT modulo_codigo, pode_visualizar
                FROM permissoes p
                LEFT JOIN niveis_acesso na ON p.nivel_acesso_id = na.id
                WHERE (na.codigo = ? OR p.perfil = ?)
            `, [user.nivel_acesso_codigo, user.perfil]);

            const permissoesArray = permissoes
                .filter(p => p.pode_visualizar)
                .map(p => p.modulo_codigo);

            if (user.perfil === 'admin' || user.nivel_acesso_codigo === 'administrador') {
                permissoesArray.unshift('todas');
            }

            return {
                sucesso: true,
                valido: true,
                sessao: {
                    usuario_id: user.id,
                    nome: user.nome_completo || user.nome,
                    email: user.email,
                    cargo: user.cargo || 'N/A',
                    unidade: user.unidade || 'N/A',
                    nivel_acesso: user.nivel_acesso_codigo || user.perfil,
                    permissoes: permissoesArray,
                    login_em: new Date(decoded.iat * 1000),
                    expira_em: new Date(decoded.exp * 1000)
                }
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Registrar novo usuário
     */
    async register(userData, tenantId, adminUser) {
        try {
            const isAdmin = adminUser.perfil === 'admin' ||
                           adminUser.nivel_acesso === 'administrador';

            if (!isAdmin) {
                throw new Error('Apenas administradores podem criar usuários');
            }

            const { username, email, password, nome_completo, cargo, perfil } = userData;
            const connection = await getConnection();

            // Hash da senha
            const senhaHash = await bcrypt.hash(password, 10);

            // Inserir usuário (compatível com ambas tabelas)
            const [result] = await connection.query(
                `INSERT INTO usuarios (
                    tenant_id, username, email, senha_hash, senha,
                    nome_completo, nome, cargo, perfil, nivel_acesso_codigo, ativo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [
                    tenantId || null,
                    username || email,
                    email,
                    senhaHash,
                    senhaHash,
                    nome_completo || username,
                    nome_completo || username,
                    cargo || 'Técnico',
                    perfil || 'tecnico',
                    perfil || 'tecnico'
                ]
            );

            return {
                success: true,
                sucesso: true,
                message: 'Usuário criado com sucesso',
                mensagem: 'Usuário criado com sucesso',
                userId: result.insertId
            };

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Usuário ou email já existe');
            }
            throw error;
        }
    }
}

module.exports = new AuthService();
