/**
 * Middleware Multi-Tenant
 * @module middleware/tenant
 */

const { getConnection } = require('../config/database');

/**
 * Middleware para identificar o Tenant pelo subdomínio
 */
const identifyTenant = async (req, res, next) => {
    try {
        const host = req.hostname || req.headers.host?.split(':')[0];

        // Extrair subdomínio
        const parts = host.split('.');
        let subdomain = null;

        // localhost:3000 ou IP direto = desenvolvimento
        if (host === 'localhost' || host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            subdomain = 'demo'; // Tenant padrão para desenvolvimento
            console.log('[DEV] Modo desenvolvimento - usando tenant "demo"');
        }
        // Subdomínio real: cliente.fortalecesuas.com
        else if (parts.length >= 3) {
            subdomain = parts[0];

            // Ignorar www e domínio principal
            if (subdomain === 'www' || subdomain === 'fortalecesuas') {
                return res.redirect('https://fortalecesuas.com/cadastro');
            }
        }
        // Domínio sem subdomínio
        else {
            return res.status(400).json({
                error: 'Acesso inválido',
                message: 'Use: https://seucliente.fortalecesuas.com'
            });
        }

        // Buscar tenant no banco
        const connection = await getConnection();
        const [tenants] = await connection.query(
            `SELECT t.*,
                    COUNT(u.id) as usuarios_ativos,
                    DATEDIFF(t.data_vencimento, NOW()) as dias_restantes
             FROM tenants t
             LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = TRUE
             WHERE t.subdomain = ?
             GROUP BY t.id`,
            [subdomain]
        );

        if (tenants.length === 0) {
            return res.status(404).json({
                error: 'Organização não encontrada',
                message: 'Entre em contato com o suporte ou verifique o endereço.'
            });
        }

        const tenant = tenants[0];

        // Verificar status do tenant
        if (tenant.status === 'suspenso') {
            return res.status(403).json({
                error: 'Conta suspensa',
                message: 'Entre em contato com o suporte para regularizar.'
            });
        }

        if (tenant.status === 'cancelado') {
            return res.status(403).json({
                error: 'Conta cancelada',
                message: 'Esta organização não possui mais acesso ao sistema.'
            });
        }

        // Verificar vencimento
        if (tenant.dias_restantes < 0) {
            return res.status(402).json({
                error: 'Assinatura vencida',
                message: `Sua assinatura venceu há ${Math.abs(tenant.dias_restantes)} dias. Renove para continuar.`,
                dias_vencidos: Math.abs(tenant.dias_restantes)
            });
        }

        // Aviso de vencimento próximo
        if (tenant.dias_restantes <= 7 && tenant.dias_restantes > 0) {
            res.set('X-Aviso-Vencimento', `Sua assinatura vence em ${tenant.dias_restantes} dias`);
        }

        // Anexar tenant ao request
        req.tenant = tenant;
        req.tenantId = tenant.id;

        console.log(`[OK] Tenant identificado: ${tenant.nome_organizacao} (${subdomain})`);
        next();

    } catch (error) {
        console.error('[ERRO] Erro ao identificar tenant:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    identifyTenant
};
