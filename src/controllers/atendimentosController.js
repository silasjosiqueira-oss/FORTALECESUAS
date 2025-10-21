const { validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');
const {
    ValidationError,
    NotFoundError,
    ConflictError,
    DatabaseError
} = require('../middleware/errorHandler');

/**
 * Utilitário para sanitizar valores
 */
const sanitizeValue = (value) => {
    if (value === undefined || value === '' || value === null) {
        return null;
    }
    return typeof value === 'string' ? value.trim() : value;
};

/**
 * Validar CPF
 */
const isValidCPF = (cpf) => {
    if (!cpf) return true; // CPF é opcional

    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return cpf.charAt(9) === digit1.toString() && cpf.charAt(10) === digit2.toString();
};

/**
 * Listar atendimentos com filtros e paginação
 */
const getAtendimentos = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Parâmetros de consulta inválidos', errors.array());
    }

    const {
        status,
        tipo,
        prioridade,
        dataInicio,
        dataFim,
        search,
        page = 1,
        limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir query dinamicamente
    let whereConditions = [];
    let queryParams = [];

    if (status) {
        whereConditions.push('a.status = ?');
        queryParams.push(status);
    }

    if (tipo) {
        whereConditions.push('a.tipo_atendimento = ?');
        queryParams.push(tipo);
    }

    if (prioridade) {
        whereConditions.push('a.prioridade = ?');
        queryParams.push(prioridade);
    }

    if (dataInicio) {
        whereConditions.push('a.data_atendimento >= ?');
        queryParams.push(dataInicio);
    }

    if (dataFim) {
        whereConditions.push('a.data_atendimento <= ?');
        queryParams.push(dataFim);
    }

    if (search) {
        whereConditions.push('(u.nome_completo LIKE ? OR u.cpf LIKE ? OR p.nome_profissional LIKE ?)');
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    // Query principal
    const mainQuery = `
        SELECT
            a.id_atendimento as id,
            CONCAT('2025', LPAD(a.id_atendimento, 6, '0')) as registro,
            DATE_FORMAT(a.data_atendimento, '%Y-%m-%dT%H:%i:%s') as dataHora,
            COALESCE(u.nome_completo, 'Nome não informado') as nomeCompleto,
            COALESCE(u.nome_completo, 'Nome não informado') as nomeUsuario,
            COALESCE(u.cpf, '') as cpf,
            COALESCE(u.telefone, '') as telefone,
            COALESCE(u.email, '') as email,
            COALESCE(u.endereco, '') as endereco,
            COALESCE(u.bairro, '') as bairro,
            COALESCE(u.cidade, '') as cidade,
            COALESCE(u.estado, '') as estado,
            COALESCE(u.cep, '') as cep,
            u.data_nascimento as dataNascimento,
            CONCAT(
                COALESCE(p.nome_profissional, 'Não atribuído'),
                CASE WHEN p.cargo IS NOT NULL THEN CONCAT(' - ', p.cargo) ELSE '' END
            ) as tecnicoResponsavel,
            p.nome_profissional as nomeProfissional,
            p.cargo as cargoProfissional,
            CASE
                WHEN a.tipo_atendimento = 'psicologia' THEN 'Atendimento Psicológico'
                WHEN a.tipo_atendimento = 'social' THEN 'Atendimento Social'
                WHEN a.tipo_atendimento = 'juridico' THEN 'Atendimento Jurídico'
                ELSE 'Atendimento Geral'
            END as tipoAtendimento,
            a.tipo_atendimento as tipoAtendimentoRaw,
            a.status,
            a.prioridade,
            COALESCE(a.observacoes, '') as observacoes,
            a.criado_em as criadoEm,
            a.atualizado_em as atualizadoEm,
            'CRAS Centro' as unidade,
            'presencial' as formatoAtendimento
        FROM atendimentos a
        LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
        LEFT JOIN profissionais p ON a.id_profissional = p.id_profissional
        ${whereClause}
        ORDER BY a.data_atendimento DESC, a.id_atendimento DESC
        LIMIT ? OFFSET ?
    `;

    // Query de contagem
    const countQuery = `
        SELECT COUNT(*) as total
        FROM atendimentos a
        LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
        LEFT JOIN profissionais p ON a.id_profissional = p.id_profissional
        ${whereClause}
    `;

    try {
        const [atendimentos, countResult] = await Promise.all([
            executeQuery(mainQuery, [...queryParams, parseInt(limit), offset]),
            executeQuery(countQuery, queryParams)
        ]);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / parseInt(limit));

        // Formatar dados para compatibilidade
        const atendimentosFormatados = atendimentos.map(row => ({
            ...row,
            motivosAtendimento: row.observacoes ? [row.tipoAtendimento] : [],
            descricaoDemanda: row.observacoes || '',
            motivoAtendimento: row.tipoAtendimento
        }));

        logger.info('Atendimentos listados', {
            userId: req.user.userId,
            total,
            page: parseInt(page),
            filters: { status, tipo, prioridade, search }
        });

        res.json({
            success: true,
            data: atendimentosFormatados,
            pagination: {
                total,
                totalPages,
                currentPage: parseInt(page),
                limit: parseInt(limit),
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            },
            filters: {
                status,
                tipo,
                prioridade,
                dataInicio,
                dataFim,
                search
            }
        });

    } catch (error) {
        logger.error('Erro ao listar atendimentos:', error);
        throw new DatabaseError('Erro ao buscar atendimentos');
    }
};

/**
 * Obter estatísticas de atendimentos
 */
const getAtendimentosStats = async (req, res) => {
    try {
        const queries = {
            total: 'SELECT COUNT(*) as count FROM atendimentos',
            porStatus: `
                SELECT status, COUNT(*) as count
                FROM atendimentos
                GROUP BY status
            `,
            porTipo: `
                SELECT tipo_atendimento as tipo, COUNT(*) as count
                FROM atendimentos
                GROUP BY tipo_atendimento
            `,
            porMes: `
                SELECT
                    YEAR(data_atendimento) as ano,
                    MONTH(data_atendimento) as mes,
                    COUNT(*) as count
                FROM atendimentos
                WHERE data_atendimento >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY YEAR(data_atendimento), MONTH(data_atendimento)
                ORDER BY ano, mes
            `,
            recentes: `
                SELECT COUNT(*) as count
                FROM atendimentos
                WHERE DATE(data_atendimento) = CURDATE()
            `,
            esteMes: `
                SELECT COUNT(*) as count
                FROM atendimentos
                WHERE MONTH(data_atendimento) = MONTH(CURDATE())
                AND YEAR(data_atendimento) = YEAR(CURDATE())
            `
        };

        const results = await Promise.all([
            executeQuery(queries.total),
            executeQuery(queries.porStatus),
            executeQuery(queries.porTipo),
            executeQuery(queries.porMes),
            executeQuery(queries.recentes),
            executeQuery(queries.esteMes)
        ]);

        const stats = {
            total: results[0][0].count,
            porStatus: results[1],
            porTipo: results[2],
            tendenciaMensal: results[3],
            hoje: results[4][0].count,
            esteMes: results[5][0].count
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Erro ao buscar estatísticas:', error);
        throw new DatabaseError('Erro ao buscar estatísticas');
    }
};

/**
 * Obter atendimento por ID
 */
const getAtendimentoById = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('ID inválido', errors.array());
    }

    const { id } = req.params;

    try {
        const atendimentos = await executeQuery(`
            SELECT
                a.*,
                u.nome_completo as nomeUsuario,
                u.cpf,
                u.telefone,
                u.email,
                u.endereco,
                u.bairro,
                u.cidade,
                u.estado,
                u.cep,
                u.data_nascimento as dataNascimento,
                p.nome_profissional as nomeProfissional,
                p.cargo as cargoProfissional,
                p.especialidade as especialidadeProfissional
            FROM atendimentos a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN profissionais p ON a.id_profissional = p.id_profissional
            WHERE a.id_atendimento = ?
        `, [id]);

        if (atendimentos.length === 0) {
            throw new NotFoundError('Atendimento não encontrado');
        }

        const atendimento = atendimentos[0];

        // Buscar histórico (se implementado)
        // const historico = await executeQuery(`...`);

        logger.info('Atendimento visualizado', {
            userId: req.user.userId,
            atendimentoId: id
        });

        res.json({
            success: true,
            data: atendimento
        });

    } catch (error) {
        if (error instanceof NotFoundError) {
            throw error;
        }
        logger.error('Erro ao buscar atendimento:', error);
        throw new DatabaseError('Erro ao buscar atendimento');
    }
};

/**
 * Criar novo atendimento
 */
const createAtendimento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Dados de entrada inválidos', errors.array());
    }

    const {
        nomeCompleto,
        cpf,
        telefone,
        email,
        endereco,
        bairro,
        cidade,
        estado,
        cep,
        dataNascimento,
        tecnicoResponsavel,
        tipoAtendimento,
        status = 'aguardando',
        prioridade = 'normal',
        descricaoDemanda,
        observacoes,
        motivosAtendimento
    } = req.body;

    // Validações adicionais
    if (cpf && !isValidCPF(cpf)) {
        throw new ValidationError('CPF inválido');
    }

    try {
        const result = await executeTransaction(async (connection) => {
            let id_usuario = null;

            // Gerenciar usuário
            if (cpf) {
                const cpfLimpo = cpf.replace(/\D/g, '');

                // Verificar se usuário já existe
                const [usuariosExistentes] = await connection.execute(
                    'SELECT id_usuario FROM usuarios WHERE cpf = ?',
                    [cpfLimpo]
                );

                if (usuariosExistentes.length > 0) {
                    id_usuario = usuariosExistentes[0].id_usuario;

                    // Atualizar dados do usuário
                    await connection.execute(`
                        UPDATE usuarios
                        SET nome_completo = COALESCE(?, nome_completo),
                            telefone = COALESCE(?, telefone),
                            email = COALESCE(?, email),
                            endereco = COALESCE(?, endereco),
                            bairro = COALESCE(?, bairro),
                            cidade = COALESCE(?, cidade),
                            estado = COALESCE(?, estado),
                            cep = COALESCE(?, cep),
                            data_nascimento = COALESCE(?, data_nascimento),
                            atualizado_em = NOW()
                        WHERE id_usuario = ?
                    `, [
                        sanitizeValue(nomeCompleto),
                        sanitizeValue(telefone),
                        sanitizeValue(email),
                        sanitizeValue(endereco),
                        sanitizeValue(bairro),
                        sanitizeValue(cidade),
                        sanitizeValue(estado),
                        sanitizeValue(cep),
                        sanitizeValue(dataNascimento),
                        id_usuario
                    ]);
                } else {
                    // Criar novo usuário
                    const [resultUsuario] = await connection.execute(`
                        INSERT INTO usuarios (
                            nome_completo, cpf, telefone, email, endereco,
                            bairro, cidade, estado, cep, data_nascimento
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        sanitizeValue(nomeCompleto),
                        cpfLimpo,
                        sanitizeValue(telefone),
                        sanitizeValue(email),
                        sanitizeValue(endereco),
                        sanitizeValue(bairro),
                        sanitizeValue(cidade),
                        sanitizeValue(estado),
                        sanitizeValue(cep),
                        sanitizeValue(dataNascimento)
                    ]);
                    id_usuario = resultUsuario.insertId;
                }
            } else if (nomeCompleto) {
                // Criar usuário sem CPF
                const [resultUsuario] = await connection.execute(`
                    INSERT INTO usuarios (
                        nome_completo, telefone, email, endereco,
                        bairro, cidade, estado, cep, data_nascimento
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    sanitizeValue(nomeCompleto),
                    sanitizeValue(telefone),
                    sanitizeValue(email),
                    sanitizeValue(endereco),
                    sanitizeValue(bairro),
                    sanitizeValue(cidade),
                    sanitizeValue(estado),
                    sanitizeValue(cep),
                    sanitizeValue(dataNascimento)
                ]);
                id_usuario = resultUsuario.insertId;
            }

            // Encontrar profissional
            let id_profissional = null;
            if (tecnicoResponsavel && tecnicoResponsavel !== 'Não atribuído') {
                const nomeProfissional = tecnicoResponsavel.split(' - ')[0];
                const [profissionais] = await connection.execute(
                    'SELECT id_profissional FROM profissionais WHERE nome_profissional LIKE ?',
                    [`%${nomeProfissional}%`]
                );
                if (profissionais.length > 0) {
                    id_profissional = profissionais[0].id_profissional;
                }
            }

            // Construir observações completas
            let observacoesCompletas = '';
            if (motivosAtendimento && motivosAtendimento.length > 0) {
                const motivosTexto = Array.isArray(motivosAtendimento)
                    ? motivosAtendimento.join(', ')
                    : motivosAtendimento;
                observacoesCompletas += `Motivos: ${motivosTexto}\n`;
            }
            if (descricaoDemanda) {
                observacoesCompletas += `Demanda: ${descricaoDemanda}\n`;
            }
            if (observacoes) {
                observacoesCompletas += `Observações: ${observacoes}`;
            }
            observacoesCompletas = observacoesCompletas.trim();

            // Criar atendimento
            const [resultAtendimento] = await connection.execute(`
                INSERT INTO atendimentos (
                    id_usuario, id_profissional, tipo_atendimento, status,
                    prioridade, observacoes, data_atendimento
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                id_usuario,
                id_profissional,
                sanitizeValue(tipoAtendimento),
                sanitizeValue(status),
                sanitizeValue(prioridade),
                sanitizeValue(observacoesCompletas)
            ]);

            return {
                id: resultAtendimento.insertId,
                id_usuario,
                id_profissional
            };
        });

        logger.info('Atendimento criado com sucesso', {
            userId: req.user.userId,
            atendimentoId: result.id,
            nomeCompleto
        });

        // Retornar dados formatados
        const novoAtendimento = {
            id: result.id,
            registro: String(result.id).padStart(6, '0'),
            dataHora: new Date().toISOString(),
            nomeCompleto,
            nomeUsuario: nomeCompleto,
            cpf: cpf?.replace(/\D/g, '') || '',
            telefone: telefone || '',
            email: email || '',
            endereco: endereco || '',
            bairro: bairro || '',
            cidade: cidade || '',
            estado: estado || '',
            cep: cep || '',
            dataNascimento,
            tecnicoResponsavel: tecnicoResponsavel || 'Não atribuído',
            tipoAtendimento,
            status,
            prioridade,
            observacoes: [descricaoDemanda, observacoes].filter(Boolean).join('\n'),
            motivosAtendimento,
            descricaoDemanda,
            unidade: 'CRAS Centro',
            formatoAtendimento: 'presencial'
        };

        res.status(201).json({
            success: true,
            message: 'Atendimento criado com sucesso',
            data: novoAtendimento
        });

    } catch (error) {
        logger.error('Erro ao criar atendimento:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            throw new ConflictError('CPF já cadastrado no sistema');
        }

        throw new DatabaseError('Erro ao criar atendimento');
    }
};

/**
 * Atualizar atendimento existente
 */
const updateAtendimento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Dados inválidos', errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    // Validar CPF se fornecido
    if (updateData.cpf && !isValidCPF(updateData.cpf)) {
        throw new ValidationError('CPF inválido');
    }

    try {
        const result = await executeTransaction(async (connection) => {
            // Verificar se atendimento existe
            const [atendimentos] = await connection.execute(
                'SELECT id_usuario, id_profissional FROM atendimentos WHERE id_atendimento = ?',
                [id]
            );

            if (atendimentos.length === 0) {
                throw new NotFoundError('Atendimento não encontrado');
            }

            const { id_usuario } = atendimentos[0];

            // Atualizar dados do usuário se necessário
            if (id_usuario && (updateData.nomeCompleto || updateData.telefone || updateData.email ||
                              updateData.endereco || updateData.bairro || updateData.dataNascimento)) {

                const updateFields = [];
                const updateValues = [];

                if (updateData.nomeCompleto) {
                    updateFields.push('nome_completo = ?');
                    updateValues.push(updateData.nomeCompleto);
                }
                if (updateData.telefone) {
                    updateFields.push('telefone = ?');
                    updateValues.push(updateData.telefone);
                }
                if (updateData.email) {
                    updateFields.push('email = ?');
                    updateValues.push(updateData.email);
                }
                if (updateData.endereco) {
                    updateFields.push('endereco = ?');
                    updateValues.push(updateData.endereco);
                }
                if (updateData.bairro) {
                    updateFields.push('bairro = ?');
                    updateValues.push(updateData.bairro);
                }
                if (updateData.dataNascimento) {
                    updateFields.push('data_nascimento = ?');
                    updateValues.push(updateData.dataNascimento);
                }

                if (updateFields.length > 0) {
                    updateFields.push('atualizado_em = NOW()');
                    updateValues.push(id_usuario);

                    await connection.execute(
                        `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id_usuario = ?`,
                        updateValues
                    );
                }
            }

            // Atualizar dados do atendimento
            const atendimentoFields = [];
            const atendimentoValues = [];

            if (updateData.tipoAtendimento) {
                atendimentoFields.push('tipo_atendimento = ?');
                atendimentoValues.push(updateData.tipoAtendimento);
            }
            if (updateData.status) {
                atendimentoFields.push('status = ?');
                atendimentoValues.push(updateData.status);
            }
            if (updateData.prioridade) {
                atendimentoFields.push('prioridade = ?');
                atendimentoValues.push(updateData.prioridade);
            }
            if (updateData.observacoes !== undefined) {
                atendimentoFields.push('observacoes = ?');
                atendimentoValues.push(updateData.observacoes);
            }

            // Atualizar profissional responsável
            if (updateData.tecnicoResponsavel) {
                const nomeProfissional = updateData.tecnicoResponsavel.split(' - ')[0];
                const [profissionais] = await connection.execute(
                    'SELECT id_profissional FROM profissionais WHERE nome_profissional LIKE ?',
                    [`%${nomeProfissional}%`]
                );

                const id_profissional = profissionais.length > 0 ? profissionais[0].id_profissional : null;
                atendimentoFields.push('id_profissional = ?');
                atendimentoValues.push(id_profissional);
            }

            if (atendimentoFields.length > 0) {
                atendimentoFields.push('atualizado_em = NOW()');
                atendimentoValues.push(id);

                await connection.execute(
                    `UPDATE atendimentos SET ${atendimentoFields.join(', ')} WHERE id_atendimento = ?`,
                    atendimentoValues
                );
            }

            return { updated: true };
        });

        logger.info('Atendimento atualizado com sucesso', {
            userId: req.user.userId,
            atendimentoId: id
        });

        res.json({
            success: true,
            message: 'Atendimento atualizado com sucesso',
            id: parseInt(id)
        });

    } catch (error) {
        if (error instanceof NotFoundError) {
            throw error;
        }

        logger.error('Erro ao atualizar atendimento:', error);
        throw new DatabaseError('Erro ao atualizar atendimento');
    }
};

/**
 * Atualizar status do atendimento
 */
const updateAtendimentoStatus = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Dados inválidos', errors.array());
    }

    const { id } = req.params;
    const { status, observacao } = req.body;

    try {
        const result = await executeQuery(`
            UPDATE atendimentos
            SET status = ?,
                observacoes = CASE
                    WHEN ? IS NOT NULL THEN CONCAT(COALESCE(observacoes, ''), '\n[', NOW(), '] Status alterado para ${status}: ', ?)
                    ELSE observacoes
                END,
                atualizado_em = NOW()
            WHERE id_atendimento = ?
        `, [status, observacao, observacao, id]);

        if (result.affectedRows === 0) {
            throw new NotFoundError('Atendimento não encontrado');
        }

        logger.info('Status do atendimento atualizado', {
            userId: req.user.userId,
            atendimentoId: id,
            novoStatus: status
        });

        res.json({
            success: true,
            message: 'Status atualizado com sucesso',
            id: parseInt(id),
            status
        });

    } catch (error) {
        if (error instanceof NotFoundError) {
            throw error;
        }

        logger.error('Erro ao atualizar status:', error);
        throw new DatabaseError('Erro ao atualizar status');
    }
};

/**
 * Excluir atendimento
 */
const deleteAtendimento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('ID inválido', errors.array());
    }

    const { id } = req.params;

    try {
        const result = await executeQuery(
            'DELETE FROM atendimentos WHERE id_atendimento = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            throw new NotFoundError('Atendimento não encontrado');
        }

        logger.info('Atendimento excluído', {
            userId: req.user.userId,
            atendimentoId: id
        });

        res.json({
            success: true,
            message: 'Atendimento removido com sucesso'
        });

    } catch (error) {
        if (error instanceof NotFoundError) {
            throw error;
        }

        logger.error('Erro ao excluir atendimento:', error);
        throw new DatabaseError('Erro ao remover atendimento');
    }
};

/**
 * Operações em lote
 */
const bulkOperations = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Dados inválidos', errors.array());
    }

    const { operation, atendimentoIds, data } = req.body;

    try {
        let result;

        switch (operation) {
            case 'update_status':
                if (!data.status) {
                    throw new ValidationError('Status é obrigatório para esta operação');
                }

                result = await executeQuery(`
                    UPDATE atendimentos
                    SET status = ?, atualizado_em = NOW()
                    WHERE id_atendimento IN (${atendimentoIds.map(() => '?').join(',')})
                `, [data.status, ...atendimentoIds]);
                break;

            case 'assign_professional':
                if (!data.profissionalId) {
                    throw new ValidationError('ID do profissional é obrigatório');
                }

                result = await executeQuery(`
                    UPDATE atendimentos
                    SET id_profissional = ?, atualizado_em = NOW()
                    WHERE id_atendimento IN (${atendimentoIds.map(() => '?').join(',')})
                `, [data.profissionalId, ...atendimentoIds]);
                break;

            case 'delete':
                result = await executeQuery(`
                    DELETE FROM atendimentos
                    WHERE id_atendimento IN (${atendimentoIds.map(() => '?').join(',')})
                `, atendimentoIds);
                break;

            default:
                throw new ValidationError('Operação não suportada');
        }

        logger.info('Operação em lote executada', {
            userId: req.user.userId,
            operation,
            affected: result.affectedRows,
            ids: atendimentoIds
        });

        res.json({
            success: true,
            message: `Operação ${operation} executada com sucesso`,
            affected: result.affectedRows
        });

    } catch (error) {
        logger.error('Erro em operação em lote:', error);
        throw new DatabaseError('Erro ao executar operação em lote');
    }
};

// Placeholder para outras funções
const getAtendimentoHistory = async (req, res) => {
    res.json({ success: true, data: [] });
};

const addAtendimentoNote = async (req, res) => {
    res.json({ success: true, message: 'Funcionalidade em desenvolvimento' });
};

const exportAtendimentosCSV = async (req, res) => {
    res.json({ success: true, message: 'Funcionalidade em desenvolvimento' });
};

const exportAtendimentosPDF = async (req, res) => {
    res.json({ success: true, message: 'Funcionalidade em desenvolvimento' });
};

module.exports = {
    getAtendimentos,
    getAtendimentosStats,
    getAtendimentoById,
    createAtendimento,
    updateAtendimento,
    updateAtendimentoStatus,
    deleteAtendimento,
    bulkOperations,
    getAtendimentoHistory,
    addAtendimentoNote,
    exportAtendimentosCSV,
    exportAtendimentosPDF
};
