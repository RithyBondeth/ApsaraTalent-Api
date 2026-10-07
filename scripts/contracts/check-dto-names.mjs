import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
const names = new Map();
async function scan(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scan(file);
      continue;
    }
    if (!file.endsWith('.dto.ts')) continue;
    const source = ts.createSourceFile(
      file,
      await fs.readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        if (names.has(name))
          throw Error(
            `Duplicate Swagger DTO name ${name}: ${names.get(name)} and ${file}`,
          );
        names.set(name, file);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
await scan('libs/contracts/src/dtos');
console.log(`Verified ${names.size} unique DTO class names.`);
