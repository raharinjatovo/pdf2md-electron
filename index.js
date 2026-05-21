import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pdf2md from '@opendocsg/pdf2md';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_DIR = path.join(__dirname, 'pdf');
const OUTPUT_DIR = path.join(__dirname, 'output');

async function convertOne(inputPath, outputPath) {
  const buffer = await fs.readFile(inputPath);
  const markdown = await pdf2md(buffer);
  await fs.writeFile(outputPath, markdown, 'utf8');
}

async function main() {
  try {
    await fs.access(INPUT_DIR);
  } catch {
    console.error(`Input folder not found: ${INPUT_DIR}`);
    console.error('Create a "pdf" folder and place your PDFs inside.');
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });
  const pdfs = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
    .map((e) => e.name);

  if (pdfs.length === 0) {
    console.log(`No PDF files in ${INPUT_DIR}`);
    return;
  }

  console.log(`Found ${pdfs.length} PDF(s). Converting...`);

  let ok = 0;
  let fail = 0;
  for (const name of pdfs) {
    const inputPath = path.join(INPUT_DIR, name);
    const outName = path.basename(name, path.extname(name)) + '.md';
    const outputPath = path.join(OUTPUT_DIR, outName);
    try {
      await convertOne(inputPath, outputPath);
      console.log(`  OK  ${name} -> ${outName}`);
      ok++;
    } catch (err) {
      console.error(`  FAIL ${name}: ${err.message}`);
      fail++;
    }
  }

  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
