const NodeCache = require('node-cache');
const logger = require('./logger');

class CacheManager {
    constructor() {
        // Cache local (rápido, mas limitado)
        this.cache = new NodeCache({
            stdTTL: 300, // 5 minutos padrão
            checkperiod: 120,
            useClones: false,
            maxKeys: 1000
        });

        // Estatísticas
        this.stats = {
            hits: 0,
            misses: 0
        };

        logger.info('✅ Cache Manager inicializado (memória local)');
    }

    /**
     * Buscar valor do cache
     */
    async get(key) {
        try {
            const value = this.cache.get(key);

            if (value !== undefined) {
                this.stats.hits++;
                logger.debug('Cache hit', { key });
                return value;
            }

            // Cache miss
            this.stats.misses++;
            logger.debug('Cache miss', { key });
            return null;

        } catch (error) {
            logger.error('Erro ao buscar do cache', { key, error: error.message });
            return null;
        }
    }

    /**
     * Salvar valor no cache
     */
    async set(key, value, ttl = 300) {
        try {
            this.cache.set(key, value, ttl);
            logger.debug('Cache set', { key, ttl });
            return true;

        } catch (error) {
            logger.error('Erro ao salvar no cache', { key, error: error.message });
            return false;
        }
    }

    /**
     * Deletar valor do cache
     */
    async del(key) {
        try {
            this.cache.del(key);
            logger.debug('Cache deleted', { key });
            return true;

        } catch (error) {
            logger.error('Erro ao deletar do cache', { key, error: error.message });
            return false;
        }
    }

    /**
     * Deletar por padrão
     */
    async delPattern(pattern) {
        try {
            const keys = this.cache.keys();
            const regex = new RegExp(pattern.replace('*', '.*'));

            keys.filter(key => regex.test(key)).forEach(key => {
                this.cache.del(key);
            });

            logger.info('Cache pattern deleted', { pattern });
            return true;

        } catch (error) {
            logger.error('Erro ao deletar pattern do cache', { pattern, error: error.message });
            return false;
        }
    }

    /**
     * Limpar todo o cache
     */
    async flush() {
        try {
            this.cache.flushAll();
            logger.info('Cache limpo completamente');
            return true;

        } catch (error) {
            logger.error('Erro ao limpar cache', { error: error.message });
            return false;
        }
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        const cacheStats = this.cache.getStats();

        return {
            ...this.stats,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            keys: cacheStats.keys,
            cacheHits: cacheStats.hits,
            cacheMisses: cacheStats.misses
        };
    }

    /**
     * Wrapper para cache com fallback para função
     */
    async wrap(key, fn, ttl = 300) {
        // Tentar buscar do cache
        let value = await this.get(key);

        if (value !== null) {
            return value;
        }

        // Cache miss: executar função
        try {
            value = await fn();

            // Salvar no cache
            await this.set(key, value, ttl);

            return value;

        } catch (error) {
            logger.error('Erro ao executar função com cache wrap', {
                key,
                error: error.message
            });
            throw error;
        }
    }
}

// Singleton
const cacheManager = new CacheManager();

module.exports = cacheManager;
