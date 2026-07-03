const fs = require('fs');

function findClose(text, start) {
  const o = text[start], cl = o==='['?']':o==='{'?'}':null;
  if (!cl) return start+1;
  let depth=0, inStr=false, strCh='', esc=false;
  for (let i=start; i<text.length; i++) {
    const c=text[i];
    if (esc){esc=false;continue;}
    if (c==='\\'&&inStr){esc=true;continue;}
    if (!inStr&&(c==='"'||c==="'"||c==='`')){inStr=true;strCh=c;continue;}
    if (inStr&&c===strCh){inStr=false;continue;}
    if (inStr) continue;
    if (c===o) depth++;
    if (c===cl){depth--;if(depth===0)return i+1;}
  }
  return -1;
}

function extractVar(scriptText, varName) {
  const re = new RegExp(`(?:var|const|let)\\s+${varName}\\s*=\\s*`);
  const match = re.exec(scriptText);
  if (!match) return null;
  const afterEq = scriptText.slice(match.index + match[0].length);
  const trimmed = afterEq.trimStart();
  const skip = afterEq.length - trimmed.length;
  const start = match.index + match[0].length + skip;
  const end = findClose(scriptText, start);
  if (end===-1) return null;
  const src = scriptText.slice(start, end);
  try { return (new Function('return ' + src + ';'))(); }
  catch(e) { return 'ERROR: '+e.message; }
}

const tests = [
  {file:'tests/psychologie-du-masculinisme-quiz.html', q:'QUESTIONS', p:'BANDS'},
  {file:'tests/quel-signe-etes-vous.html', q:'QUESTIONS', p:'SIGNS'},
  {file:'tests/reine-des-neiges-quiz.html', q:'questions', p:'results'},
  {file:'tests/louis-xiv-sur-le-divan-quiz.html', q:'Q', p:'R'},
  {file:'tests/ecran-sante-mentale-quiz.html', q:'questions', p:'profiles'},
];

for (const {file, q, p} of tests) {
  const html = fs.readFileSync(file,'utf8');
  const scRe = /<script(?:\s[^>]*)?>([^]*?)<\\?\/script>/gi;
  let script = '';
  let m;
  while((m=scRe.exec(html))!==null){ if(m[1].trim().length>200) script=m[1]; }
  const qs = extractVar(script, q);
  const ps = extractVar(script, p);
  console.log('\n---', file.split('/').pop());
  if(Array.isArray(qs)) {
    const q0 = qs[0];
    const opts = q0.a || q0.options || [];
    console.log(`  Q: ${qs.length} questions, first q:`, JSON.stringify(q0).slice(0,120));
  } else {
    console.log('  Q ERROR:', qs);
  }

  if (Array.isArray(ps)) {
    console.log(`  P: ${ps.length} items (array). first:`, JSON.stringify(ps[0]).slice(0,100));
    // BANDS heuristic
    const isBands = 't' in ps[0] && !('title' in ps[0]) && !('min' in ps[0]) && !('sub' in ps[0]);
    console.log('  isBands:', isBands);
  } else if (ps && typeof ps==='object') {
    const keys = Object.keys(ps);
    console.log(`  P: ${keys.length} keys (object). first key:`, keys[0], '| val:', JSON.stringify(ps[keys[0]]).slice(0,100));
    // SIGNS heuristic
    const first = ps[keys[0]];
    const isSigns = 'n' in first && 'd' in first;
    console.log('  isSigns:', isSigns);
  } else {
    console.log('  P ERROR:', ps);
  }
}
