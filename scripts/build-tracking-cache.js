require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { trackPackages } = require('../lib/track-envios');

const codesFile = path.join(__dirname, '..', 'envios-codes.txt');
const outFile = path.join(__dirname, '..', 'tracking-cache.json');

async function main() {
  const text = fs.readFileSync(codesFile, 'utf8');
  const codes = [...new Set(
    text.split(/[\n,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
  )];

  const result = await trackPackages(codes);
  const payload = {
    updatedAt: new Date().toISOString(),
    ...result
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`Cache escrito: ${outFile} (${result.packages.length} envíos)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
