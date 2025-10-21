// find-router-error.js - Execute com: node find-router-error.js

const fs = require('fs');
const path = require('path');

function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      findJSFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function findRouterIssues(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, lineNumber) => {
      const trimmed = line.trim();

      // Procurar por router.use() ou app.use()
      if (trimmed.includes('router.use(') || trimmed.includes('app.use(')) {
        console.log(`📍 ENCONTRADO em ${filePath}:${lineNumber + 1}`);
        console.log(`   ${trimmed}`);

        // Verificar se está passando undefined ou variável não definida
        const match = trimmed.match(/\.(use|get|post|put|delete)\s*\(\s*([^,\)]+)/);
        if (match) {
          const param = match[2].trim();

          if (param === 'undefined' || param === 'null') {
            console.log(`   ❌ PROBLEMA: Passando ${param} como middleware`);
          }

          // Verificar imports suspeitos
          const requireMatch = content.match(new RegExp(`require\\s*\\(.*${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\)`, 'g'));
          if (requireMatch) {
            console.log(`   📦 Import relacionado: ${requireMatch[0]}`);
          }
        }
        console.log('---');
      }

      // Procurar por requires de middleware
      if (trimmed.includes('require(') &&
          (trimmed.includes('middleware') || trimmed.includes('security') || trimmed.includes('validator'))) {
        console.log(`📦 IMPORT encontrado em ${filePath}:${lineNumber + 1}`);
        console.log(`   ${trimmed}`);
        console.log('---');
      }
    });

  } catch (error) {
    console.log(`❌ Erro ao ler ${filePath}:`, error.message);
  }
}

console.log('🔍 Procurando por problemas de Router/Middleware...\n');

const jsFiles = findJSFiles('.');
jsFiles.forEach(findRouterIssues);

console.log(`\n✅ Verificação completa! Analisados ${jsFiles.length} arquivos.`);
console.log('\n💡 DICA: Verifique se todos os middlewares estão sendo exportados corretamente.');
console.log('💡 DICA: Verifique se as importações estão corretas (require/import).');
