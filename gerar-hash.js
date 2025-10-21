const bcrypt = require('bcrypt');

async function gerarHash() {
    const senha = '123456';

    console.log('\n=== GERANDO HASH PARA SENHA ===');
    console.log('Senha:', senha);

    const hash = await bcrypt.hash(senha, 10);

    console.log('Hash gerado:', hash);
    console.log('\n=== EXECUTE ESTE SQL ===');
    console.log(`UPDATE usuarios SET senha_hash = '${hash}' WHERE id = 1;`);
    console.log('\n=== TESTANDO O HASH ===');

    const teste = await bcrypt.compare(senha, hash);
    console.log('Teste de comparação:', teste ? '✅ SUCESSO' : '❌ FALHOU');
}

gerarHash();
