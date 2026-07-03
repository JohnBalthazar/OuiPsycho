const fs = require('fs');
const files = fs.readdirSync('tests').filter(f => f.endsWith('.html'));
for (const f of files) {
  const html = fs.readFileSync('tests/' + f, 'utf8');
  const qVar = ['Q','questions','QUESTIONS'].find(v => {
    const re = new RegExp('(var|const|let)\\s+' + v + '\\s*=\\s*\\[');
    return re.test(html);
  }) || '?';
  const pVar = ['R','profiles','PROFILES','results','RESULTS'].find(v => {
    const re = new RegExp('(var|const|let)\\s+' + v + '\\s*=');
    return re.test(html);
  }) || '?';
  const arrOpts = /a:\s*\[\[/.test(html) ? '[arr-opts]' : '';
  console.log(f.padEnd(52), 'Q:' + qVar.padEnd(10), 'P:' + pVar.padEnd(8), arrOpts);
}
