#!/bin/bash

# ======================================
# FORTALECESUAS - Script de Deploy
# ======================================

set -e

echo "🚀 Iniciando deploy do FORTALECESUAS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
echo "📋 Verificando dependências..."

if ! command_exists docker; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose não está instalado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependências verificadas${NC}"

# Verificar arquivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo "Copiando .env.docker como template..."
    cp .env.docker .env
    echo -e "${RED}❌ Configure o arquivo .env antes de continuar!${NC}"
    exit 1
fi

# Verificar se as secrets foram alteradas
if grep -q "ALTERAR" .env; then
    echo -e "${RED}❌ Você precisa alterar as secrets no arquivo .env!${NC}"
    echo "Procure por 'ALTERAR' no arquivo .env e substitua pelos valores reais."
    exit 1
fi

echo -e "${GREEN}✅ Arquivo .env configurado${NC}"

# Backup do banco de dados (se existir)
if [ "$(docker ps -q -f name=fortalecesuas-mysql)" ]; then
    echo "💾 Fazendo backup do banco de dados..."
    mkdir -p backups
    docker exec fortalecesuas-mysql mysqldump -u root -p"${DB_ROOT_PASSWORD}" sistema_assistencia > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${GREEN}✅ Backup criado${NC}"
fi

# Parar containers antigos
echo "🛑 Parando containers..."
docker-compose down

# Limpar volumes órfãos (cuidado!)
# docker-compose down -v

# Build da imagem
echo "🔨 Construindo imagem Docker..."
docker-compose build --no-cache

# Iniciar serviços
echo "🚀 Iniciando serviços..."
docker-compose up -d

# Aguardar serviços ficarem saudáveis
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Verificar status
echo "🔍 Verificando status dos serviços..."
docker-compose ps

# Verificar logs
echo ""
echo "📋 Últimas linhas do log:"
docker-compose logs --tail=20 app

# Verificar health
echo ""
echo "🏥 Verificando health check..."
sleep 5

if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicação está saudável!${NC}"
else
    echo -e "${RED}❌ Aplicação não está respondendo!${NC}"
    echo "Verifique os logs com: docker-compose logs app"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📊 URLs de acesso:"
echo "   - Aplicação: http://localhost:3000"
echo "   - Health: http://localhost:3000/health"
echo ""
echo "📋 Comandos úteis:"
echo "   - Ver logs: docker-compose logs -f app"
echo "   - Parar: docker-compose down"
echo "   - Reiniciar: docker-compose restart"
echo "   - Status: docker-compose ps"
echo ""
echo "⚠️  Credenciais padrão (ALTERE IMEDIATAMENTE):"
echo "   - Usuário: admin"
echo "   - Senha: admin123"
