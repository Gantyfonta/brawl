import fs from 'fs';
const content = fs.readFileSync('index.html', 'utf-8');
const wMatch = content.match(/var w=\{.*?\};/);
if (wMatch) {
  eval(wMatch[0]);
  let hasUndefined = false;
  Object.values(w).forEach((b, i) => {
    if (!b) {
      console.log('UNDEFINED AT INDEX', i);
      hasUndefined = true;
    } else if (!b.emoji) {
      console.log('MISSING EMOJI FOR', b.name);
    }
  });
  if (!hasUndefined) console.log('All brawlers valid.');
} else {
  console.log('w not found');
}
