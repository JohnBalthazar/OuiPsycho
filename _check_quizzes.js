const fs = require('fs');
const path = require('path');
const dir = 'articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const missing = [];
const ok = [];
for (const file of files) {
  // Lire le JSON parsé pour avoir le vrai contenu HTML
  const j = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const content = j.content || '';
  // Dans le HTML décodé, les iframes ont src="/tests/..." ou src="tests/..."
  const re = /src="(\/?tests\/[^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const src = m[1].replace(/^\//, '');
    const exists = fs.existsSync(src);
    if (exists) ok.push(file + ' -> ' + src);
    else missing.push(file + ' -> ' + src);
  }
}
console.log('MANQUANT:');
missing.forEach(m => console.log('  ' + m));
console.log('\nOK:');
ok.forEach(o => console.log('  ' + o));
