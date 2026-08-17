// Génère cartes/bien-vivre-sante-mentale/communes-density.json
// Un seul appel API (toutes communes de France), filtré aux 96 départements
// métropolitains utilisés par la carte "bien-vivre-sante-mentale".
// Chaque commune est réduite à un tier de densité (0-7, même paliers que
// communeModifiers() côté client) + un flag "grande métropole" (pop >= 500 000),
// encodés en un seul entier : tier + (grosse métropole ? 10 : 0).
// Ça permet au client de recalculer un score exact par commune (respectant les
// critères actifs) sans avoir à télécharger pop/surface de 35 000 communes.
const fs = require('fs');
const path = require('path');

const VALID_DEPTS = [
  '01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','2A','2B',
  '21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41',
  '42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','60','61','62',
  '63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83',
  '84','85','86','87','88','89','90','91','92','93','94','95'
];

function densityTier(pop, surface) {
  var dens;
  if (surface && surface > 0) {
    dens = pop / (surface / 100); // surface en ha -> /100 = km²
  } else {
    if (pop < 500) dens = 18;
    else if (pop < 2000) dens = 55;
    else if (pop < 10000) dens = 180;
    else if (pop < 50000) dens = 650;
    else if (pop < 200000) dens = 1800;
    else dens = 5500;
  }
  if (dens < 20) return 0;
  if (dens < 60) return 1;
  if (dens < 150) return 2;
  if (dens < 400) return 3;
  if (dens < 1200) return 4;
  if (dens < 3500) return 5;
  if (dens < 7000) return 6;
  return 7;
}

async function main() {
  const url = 'https://geo.api.gouv.fr/communes?fields=code,codeDepartement,population,surface&format=json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const communes = await res.json();

  const validSet = new Set(VALID_DEPTS);
  const byDept = {};
  let total = 0;

  for (const c of communes) {
    if (!c.codeDepartement || !validSet.has(c.codeDepartement)) continue;
    const pop = c.population || 0;
    const surface = c.surface || 0;
    const tier = densityTier(pop, surface);
    const bigMetro = pop >= 500000 ? 10 : 0;
    const code = tier + bigMetro;
    (byDept[c.codeDepartement] = byDept[c.codeDepartement] || []).push(code);
    total++;
  }

  for (const d of VALID_DEPTS) {
    if (!byDept[d]) console.warn('AVERTISSEMENT : aucune commune trouvée pour le département', d);
  }

  const out = { total: total, depts: byDept };
  const outPath = path.join(__dirname, 'cartes', 'bien-vivre-sante-mentale', 'communes-density.json');
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log('Écrit', outPath, '—', total, 'communes,', Object.keys(byDept).length, 'départements');
  console.log('Taille fichier :', (fs.statSync(outPath).size / 1024).toFixed(1), 'Ko');
}

main().catch(function(e) { console.error(e); process.exit(1); });
