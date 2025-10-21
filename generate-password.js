const bcrypt = require('bcrypt');

bcrypt.hash('admin123', 10, function(err, hash) {
    console.log('Hash da senha admin123:');
    console.log(hash);
    console.log('\nCopie e use no INSERT do SQL!');
});
