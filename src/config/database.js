// src/config/database.js
const mysql = require('mysql2/promise');

const config = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'fortalece_suas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  production: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'fortalece_suas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  test: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'fortalece_suas_test',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  }
};

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

let pool = null;

/**
 * Conecta ao banco de dados MySQL
 */
async function connectDatabase() {
  try {
    // Criar pool de conexões
    pool = mysql.createPool(dbConfig);

    // Testar conexão
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao MySQL com sucesso!');
    console.log(`📊 Banco: ${dbConfig.database}`);
    console.log(`🌍 Ambiente: ${environment}`);

    connection.release();

    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.error('💡 Dica: Verifique se o MySQL está rodando e se as credenciais no .env estão corretas');
    throw error;
  }
}

/**
 * Fecha a conexão com o banco de dados
 */
async function closeDatabase() {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('✅ Conexão com banco de dados fechada');
    }
  } catch (error) {
    console.error('❌ Erro ao fechar conexão:', error.message);
    throw error;
  }
}

/**
 * Retorna o pool de conexões (compatibilidade)
 */
function getPool() {
  if (!pool) {
    throw new Error('Pool de conexões não inicializado. Execute connectDatabase() primeiro.');
  }
  return pool;
}

/**
 * Retorna o pool de conexões (nome usado no server.js)
 * Esta função é um alias para getPool()
 */
function getConnection() {
  if (!pool) {
    throw new Error('Pool de conexões não inicializado. Execute connectDatabase() primeiro.');
  }
  return pool;
}

/**
 * Executa uma query
 */
async function query(sql, params) {
  if (!pool) {
    throw new Error('Pool de conexões não inicializado. Execute connectDatabase() primeiro.');
  }

  try {
    const [results] = await pool.execute(sql, params || []);
    return results;
  } catch (error) {
    console.error('Erro na query:', error.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  getPool,
  getConnection,  // ← ADICIONADO!
  query,
  config: dbConfig
};
