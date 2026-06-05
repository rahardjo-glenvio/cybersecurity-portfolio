const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

(async () => {
  console.log('=== Sentinel Admin Password Generator ===\n');
  
  rl.question('Enter admin password (min 12 chars, uppercase, lowercase, number, symbol): ', async (pwd) => {
    if (pwd.length < 12) {
      console.error('Error: Min 12 karakter');
      rl.close();
      return;
    }
    
    const hash = await bcrypt.hash(pwd, 12);
    console.log('\n=== Hash (copy ke .env) ===');
    console.log(hash);
    console.log('\nPaste nilai di atas ke ADMIN_PASSWORD_HASH di .env\n');
    rl.close();
  });
})();
