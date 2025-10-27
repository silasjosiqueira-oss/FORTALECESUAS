# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Planejado
- [ ] Sistema de notificações push
- [ ] Relatórios em PDF
- [ ] Integração com e-mail
- [ ] Dashboard customizável
- [ ] Exportação para Excel
- [ ] App mobile

---

## [2.0.0] - 2025-01-27

### Added
- ✨ Sistema multi-tenant completo
- ✨ Autenticação JWT com refresh tokens
- ✨ Rate limiting inteligente por IP e usuário
- ✨ Sistema de permissões granular baseado em cargo
- ✨ Logs de segurança detalhados com Winston
- ✨ Docker e Docker Compose para deploy fácil
- ✨ CI/CD com GitHub Actions
- ✨ Health checks para monitoramento
- ✨ Validação robusta com express-validator
- ✨ Sistema de backup automatizado
- ✨ Dashboard com estatísticas em tempo real
- ✨ Gestão completa de atendimentos
- ✨ Controle de estoque integrado
- ✨ Agendamentos e calendário

### Changed
- 🔄 Refatoração completa da arquitetura
- 🔄 Migração para estrutura modular
- 🔄 Atualização de todas as dependências
- 🔄 Melhoria na performance de queries
- 🔄 Otimização do pool de conexões MySQL

### Fixed
- 🐛 Correção do nome do arquivo `atendimento.app.js` → `atendimento_app.js`
- 🐛 Correção de rotas estáticas no Express
- 🐛 Correção de redirecionamentos de login/logout
- 🐛 Correção de vazamento de memória em conexões
- 🐛 Correção de validações de CPF

### Security
- 🔒 Implementação de CSRF protection
- 🔒 Sanitização contra XSS
- 🔒 Detecção de SQL Injection
- 🔒 Headers de segurança com Helmet
- 🔒 Bloqueio automático após tentativas falhadas

---

## [1.0.0] - 2024-12-15

### Added
- ✨ Versão inicial do sistema
- ✨ Cadastro de atendimentos
- ✨ Gestão de usuários
- ✨ Login básico
- ✨ Dashboard simples

### Changed
- 🔄 Estrutura inicial do projeto

---

## Tipos de Mudanças

- `Added` - Novas funcionalidades
- `Changed` - Mudanças em funcionalidades existentes
- `Deprecated` - Funcionalidades que serão removidas
- `Removed` - Funcionalidades removidas
- `Fixed` - Correções de bugs
- `Security` - Correções de vulnerabilidades

---

## Links

- [Unreleased]: https://github.com/silasjosiqueira-oss/FORTALECESUAS/compare/v2.0.0...HEAD
- [2.0.0]: https://github.com/silasjosiqueira-oss/FORTALECESUAS/compare/v1.0.0...v2.0.0
- [1.0.0]: https://github.com/silasjosiqueira-oss/FORTALECESUAS/releases/tag/v1.0.0
