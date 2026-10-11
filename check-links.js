const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html') || f.endsWith('.js'));
let found = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/href=[\"'][^\"']*\.php[\"']/g) || content.match(/location\.href\s*=\s*[\"'][^\"']*\.php[\"']/g);
  if (matches) {
    console.log(f, 'has PHP references:', matches);
    found++;
  }
}
if (found === 0) {
  console.log('Zero PHP references in any HTML or JS file!');
}
