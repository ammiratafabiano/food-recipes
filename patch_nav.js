const fs = require('fs');
const file = 'frontend/src/app/services/navigation.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const to = [...from, path];",
  `let to = [...from];
    const pathParts = path.split('/');
    for (const part of pathParts) {
      if (part === '..') {
        to.pop();
      } else if (part !== '.' && part !== '') {
        to.push(part);
      }
    }`
);

fs.writeFileSync(file, code);
console.log('patched');
