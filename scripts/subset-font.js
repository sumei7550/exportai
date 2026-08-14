/**
 * Phase 6.0.1 Static Subset Font Prototype
 *
 * Subsets Noto Sans SC to only the characters needed for feasibility test.
 * Uses fontmin to:
 * 1. Read source OTF font
 * 2. Extract only glyphs for specified characters
 * 3. Output subset TTF font
 *
 * Then encodes as base64 JS module for jsPDF import.
 *
 * This is a BUILD-TIME script, NOT runtime.
 */

import Fontmin from 'fontmin';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_FONT = resolve(__dirname, '../src/assets/fonts/NotoSansSC-Regular.otf');
const OUTPUT_DIR = resolve(__dirname, '../src/assets/fonts-subset');
const OUTPUT_TTF = resolve(OUTPUT_DIR, 'NotoSansSC-Subset.ttf');
const OUTPUT_JS = resolve(OUTPUT_DIR, 'NotoSansSC-Subset.js');

// Characters to include in subset (feasibility test scope)
// English: standard alphabet + numbers + punctuation
// Chinese: characters used in feasibility test + common punctuation
const TEST_CHARS = [
  // English test string chars
  'Hello ExportAI',
  'ExportAI 中文 PDF',
  // Chinese test string chars
  '你好，世界。',
  'ExportAI 中文测试',
  // Full ASCII for feasibility
  ' !"#$%&\'()*+,-./0123456789:;<=>?@',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '[\\]^_`',
  'abcdefghijklmnopqrstuvwxyz',
  '{|}~',
].join('');

async function subsetFont() {
  console.log('Phase 6.0.1 Font Subsetting');
  console.log('===========================');

  // Check source
  if (!existsSync(SOURCE_FONT)) {
    console.error(`Source font not found: ${SOURCE_FONT}`);
    process.exit(1);
  }

  const sourceSize = readFileSync(SOURCE_FONT).length;
  console.log(`Source: ${SOURCE_FONT}`);
  console.log(`Source size: ${(sourceSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Test chars: ${TEST_CHARS.length}`);
  console.log(`Unique chars: ${new Set(TEST_CHARS.split('')).size}`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Configure fontmin
  const fontmin = new Fontmin()
    .src(SOURCE_FONT)
    .use(Fontmin.otf2ttf())
    .use(Fontmin.glyph({
      text: TEST_CHARS,
      hinting: false,
    }))
    .dest(OUTPUT_DIR);

  // Run subsetting
  console.log('\nSubsetting...');

  const files = await new Promise((resolvePromise, rejectPromise) => {
    fontmin.run((err, files) => {
      if (err) rejectPromise(err);
      else resolvePromise(files);
    });
  });

  // Find the TTF file
  const ttfFile = files.find(f => f.path.endsWith('.ttf'));
  if (!ttfFile) {
    throw new Error('No TTF file generated');
  }

  const ttfPath = ttfFile.path;
  const ttfBuffer = ttfFile.contents;
  const subsetSize = ttfBuffer.length;

  console.log(`\nSubset TTF: ${ttfPath}`);
  console.log(`Subset size: ${(subsetSize / 1024).toFixed(2)} KB`);
  console.log(`Reduction: ${((1 - subsetSize / sourceSize) * 100).toFixed(2)}%`);

  // Convert to base64
  const base64 = ttfBuffer.toString('base64');

  // Generate JS module
  const jsContent = `/**
 * Phase 6.0.1 Static Subset Font (Auto-generated)
 *
 * Source: NotoSansSC-Regular.otf (${(sourceSize / 1024 / 1024).toFixed(2)} MB)
 * Subset TTF size: ${(subsetSize / 1024).toFixed(2)} KB
 * Base64 length: ${base64.length}
 * Characters: ${TEST_CHARS.length}
 * Unique chars: ${new Set(TEST_CHARS.split('')).size}
 * Generated: ${new Date().toISOString()}
 *
 * License: SIL Open Font License 1.1 (see src/assets/fonts/OFL.txt)
 *
 * DO NOT EDIT MANUALLY - regenerate with: node scripts/subset-font.js
 */

export const NOTO_SANS_SC_SUBSET_BASE64 = "${base64}";

export const NOTO_SANS_SC_SUBSET_METADATA = {
  fontName: 'NotoSansSC-Subset',
  sourceSize: ${sourceSize},
  subsetSize: ${subsetSize},
  base64Length: ${base64.length},
  characters: ${JSON.stringify(TEST_CHARS.length)},
  uniqueChars: ${new Set(TEST_CHARS.split('')).size},
};
`;

  writeFileSync(OUTPUT_JS, jsContent, 'utf-8');
  writeFileSync(OUTPUT_TTF, ttfBuffer);

  const jsSize = jsContent.length;
  console.log(`\nJS Module: ${OUTPUT_JS}`);
  console.log(`JS Module size: ${(jsSize / 1024).toFixed(2)} KB`);
  console.log(`Base64 size: ${(base64.length / 1024).toFixed(2)} KB`);

  console.log('\nDone!');
}

subsetFont().catch((err) => {
  console.error('Subsetting failed:', err);
  process.exit(1);
});
