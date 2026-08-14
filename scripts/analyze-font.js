/**
 * Phase 6.0.1 Font Pipeline Diagnosis
 *
 * Analyzes font cmap tables to identify why Unicode mapping fails.
 * Uses fontkit to parse TTF and extract cmap information.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fontkit from 'fontkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHARS_TO_CHECK = [
  { char: '你', unicode: 0x4F60, description: 'CJK: you' },
  { char: '好', unicode: 0x597D, description: 'CJK: good' },
  { char: '，', unicode: 0xFF0C, description: 'CJK punct: fullwidth comma' },
  { char: '世', unicode: 0x4E16, description: 'CJK: world' },
  { char: '界', unicode: 0x754C, description: 'CJK: boundary' },
  { char: '中', unicode: 0x4E2D, description: 'CJK: middle' },
  { char: '文', unicode: 0x6587, description: 'CJK: text' },
  { char: '测', unicode: 0x6D4B, description: 'CJK: test' },
  { char: '试', unicode: 0x8BD5, description: 'CJK: try' },
  { char: '。', unicode: 0x3002, description: 'CJK punct: period' },
  { char: 'H', unicode: 0x0048, description: 'ASCII: H' },
  { char: 'e', unicode: 0x0065, description: 'ASCII: e' },
];

function analyzeFont(fontPath, label) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`ANALYZING: ${label}`);
  console.log(`Path: ${fontPath}`);
  console.log('='.repeat(70));

  const buffer = readFileSync(fontPath);
  console.log(`File size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`);

  // Detect format
  const signature = buffer.slice(0, 4).toString('binary');
  const asciiSignature = buffer.slice(0, 4).toString('ascii');
  console.log(`Signature: ${asciiSignature} (hex: ${buffer.slice(0, 4).toString('hex')})`);

  let format = 'unknown';
  if (buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00) {
    format = 'TrueType (TTF)';
  } else if (asciiSignature === 'OTTO') {
    format = 'OpenType with CFF (OTF)';
  } else if (asciiSignature === 'true') {
    format = 'TrueType (Apple)';
  } else if (asciiSignature === 'ttcf') {
    format = 'TrueType Collection';
  }
  console.log(`Format: ${format}`);

  let font;
  try {
    font = fontkit.create(buffer);
  } catch (err) {
    console.error(`Failed to parse font: ${err.message}`);
    return;
  }

  console.log(`\nFont info:`);
  console.log(`  Family: ${font.familyName}`);
  console.log(`  Subfamily: ${font.subfamilyName}`);
  console.log(`  Full name: ${font.fullName}`);
  console.log(`  Version: ${font.version || 'N/A'}`);
  console.log(`  Num glyphs: ${font.numGlyphs}`);

  // Analyze cmap
  console.log(`\ncmap analysis:`);
  const cmap = font.cmap;
  if (cmap) {
    console.log(`  cmap present: YES`);
    if (cmap.tables && Array.isArray(cmap.tables)) {
      console.log(`  cmap tables: ${cmap.tables.length}`);
      cmap.tables.forEach((table, i) => {
        console.log(`    Table ${i}: platform=${table.platformID}, encoding=${table.encodingID}, format=${table.format || 'N/A'}`);
      });
    }
  } else {
    console.log(`  cmap present: NO`);
  }

  // Check specific character mappings
  console.log(`\nCharacter → Glyph ID mappings:`);
  console.log(`${'Char'.padEnd(6)} ${'Unicode'.padEnd(10)} ${'GlyphID'.padEnd(10)} ${'Description'}`);
  console.log('-'.repeat(70));

  for (const item of CHARS_TO_CHECK) {
    const gid = font.glyphForCodePoint(item.unicode);
    const glyphId = gid ? gid.id : 'MISSING';
    const status = gid && gid.id > 0 ? '✓' : '❌';
    console.log(
      `${status} ${item.char.padEnd(4)} U+${item.unicode.toString(16).toUpperCase().padStart(4, '0')}   ${String(glyphId).padEnd(10)} ${item.description}`
    );
  }

  return {
    format,
    size: buffer.length,
    numGlyphs: font.numGlyphs,
    mappings: CHARS_TO_CHECK.map((item) => {
      const gid = font.glyphForCodePoint(item.unicode);
      return {
        char: item.char,
        unicode: item.unicode,
        glyphId: gid ? gid.id : null,
        found: gid && gid.id > 0,
      };
    }),
  };
}

const results = {};

// Analyze source OTF
try {
  results.otf = analyzeFont(
    resolve(__dirname, '../src/assets/fonts/NotoSansSC-Regular.otf'),
    'Source OTF (raw OpenType)'
  );
} catch (err) {
  console.error(`OTF analysis failed: ${err.message}`);
}

// Analyze subset TTF
try {
  results.subset = analyzeFont(
    resolve(__dirname, '../src/assets/fonts-subset/NotoSansSC-Regular.ttf'),
    'Subset TTF (fontmin output)'
  );
} catch (err) {
  console.error(`Subset TTF analysis failed: ${err.message}`);
}

console.log(`\n${'='.repeat(70)}`);
console.log('COMPARISON');
console.log('='.repeat(70));

if (results.otf && results.subset) {
  console.log(`\nGlyph mapping comparison:`);
  console.log(`${'Char'.padEnd(6)} ${'OTF GID'.padEnd(12)} ${'Subset GID'.padEnd(12)} ${'Status'}`);
  console.log('-'.repeat(60));

  for (let i = 0; i < CHARS_TO_CHECK.length; i++) {
    const char = CHARS_TO_CHECK[i];
    const otfMap = results.otf.mappings[i];
    const subsetMap = results.subset.mappings[i];

    const match = otfMap.found && subsetMap.found;
    const status = match ? '✓ both found' : (subsetMap.found ? '⚠️ only subset' : '❌ missing in subset');

    console.log(
      `${char.char.padEnd(4)} ${String(otfMap.glyphId).padEnd(12)} ${String(subsetMap.glyphId).padEnd(12)} ${status}`
    );
  }
}

console.log('\nDone.');
