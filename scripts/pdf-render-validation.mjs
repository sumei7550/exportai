import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { inflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const samples = [
  ["pdf-002-e2-sample.pdf", "page", false],
  ["pdf-002-e2-long-code-sample.pdf", "page-long-code", false],
  ["pdf-002-e2-text-code-sample.pdf", "page-text-code", false],
  ["pdf-002-e2-pagination-sample.pdf", "page-pagination", true],
];
let pdftoppm = process.env.PDFTOPPM ?? "pdftoppm";
if (!process.env.PDFTOPPM && process.platform === "win32") {
  try { pdftoppm = execFileSync("where.exe", ["pdftoppm"], { encoding: "utf8" }).split(/\r?\n/)[0].trim(); } catch { /* use PATH below */ }
}
if (process.platform === "win32" && pdftoppm.toLowerCase().endsWith(".cmd")) {
  const bundledExe = resolve(dirname(pdftoppm), "..", "..", "native", "poppler", "Library", "bin", "pdftoppm.exe");
  if (existsSync(bundledExe)) pdftoppm = bundledExe;
}

function renderSample(pdf, outputPrefix, allPages) {
  try { execFileSync(pdftoppm, allPages ? ["-png", "-r", "144", pdf, outputPrefix] : ["-f", "1", "-l", "1", "-png", "-r", "144", pdf, outputPrefix], { stdio: "inherit" }); }
  catch (error) { throw new Error(`Poppler pdftoppm is unavailable. Install Poppler or set PDFTOPPM to pdftoppm.cmd. ${error}`); }
}

function validatePng(png, label) {
  if (!existsSync(png)) throw new Error(`${label}: renderer did not produce ${png}.`);

const bytes = readFileSync(png);
if (bytes.toString("ascii", 1, 4) !== "PNG") throw new Error("Renderer did not produce a PNG.");
const chunks = [];
let offset = 8;
let width = 0; let height = 0; let colorType = 0; let raw = Buffer.alloc(0);
while (offset < bytes.length) {
  const length = bytes.readUInt32BE(offset); const type = bytes.toString("ascii", offset + 4, offset + 8);
  const data = bytes.subarray(offset + 8, offset + 8 + length); offset += 12 + length;
  if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
  if (type === "IDAT") chunks.push(data);
  if (type === "IEND") break;
}
if (colorType !== 2 && colorType !== 6) throw new Error(`Expected RGB/RGBA PNG, got color type ${colorType}.`);
const decoded = inflateSync(Buffer.concat(chunks));
const bytesPerPixel = colorType === 6 ? 4 : 3;
const stride = width * bytesPerPixel; const pixels = Buffer.alloc(height * stride); let source = 0;
for (let y = 0; y < height; y++) {
  const filter = decoded[source++]; const row = decoded.subarray(source, source + stride); source += stride; const prev = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
  for (let x = 0; x < stride; x++) { const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0; const up = prev ? prev[x] : 0; const upLeft = prev && x >= bytesPerPixel ? prev[x - bytesPerPixel] : 0; const value = row[x]; pixels[y * stride + x] = filter === 0 ? value : filter === 1 ? value + left : filter === 2 ? value + up : filter === 3 ? value + Math.floor((left + up) / 2) : value + paeth(left, up, upLeft); }
}
function paeth(a, b, c) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
function isCodeBackground(x, y) { const i = (y * width + x) * bytesPerPixel; return pixels[i] === 245 && pixels[i + 1] === 245 && pixels[i + 2] === 245; }
const rows = []; for (let y = 0; y < height; y++) { const xs = []; for (let x = 0; x < width; x++) if (isCodeBackground(x, y)) xs.push(x); if (xs.length > 100) rows.push({ y, min: Math.min(...xs), max: Math.max(...xs), count: xs.length }); }
const bands = []; for (const row of rows) { const last = bands.at(-1); if (!last || row.y > last.end + 1) bands.push({ start: row.y, end: row.y, min: row.min, max: row.max, maxCount: row.count }); else { last.end = row.y; last.min = Math.min(last.min, row.min); last.max = Math.max(last.max, row.max); last.maxCount = Math.max(last.maxCount, row.count); } }
if (bands.length !== 2) throw new Error(`${label}: expected two rendered code background bands, found ${bands.length}.`);
if (!(bands[0].min > 0 && bands[0].max < width - 1)) throw new Error("User code block drifted to or beyond a page edge.");
if (!(bands[1].min <= bands[0].min && bands[1].max > bands[0].max)) throw new Error("Assistant code block did not retain the wider content column.");
for (const band of bands) if (band.maxCount < 100 || band.end <= band.start) throw new Error("Code background is missing, clipped, or does not contain rendered text space.");
const surfaceRows = [];
for (let y = bands[0].start + 8; y <= bands[0].end - 8; y++) {
  let foundSurface = false;
  for (let x = Math.max(0, bands[0].min - 30); x < bands[0].min; x++) {
    const i = (y * width + x) * bytesPerPixel;
    if (pixels[i] >= 247 && pixels[i] <= 249 && pixels[i + 1] >= 247 && pixels[i + 1] <= 249 && pixels[i + 2] >= 247 && pixels[i + 2] <= 249) { foundSurface = true; break; }
  }
  if (foundSurface) surfaceRows.push(y);
}
if (surfaceRows.length < Math.floor((bands[0].end - bands[0].start) * 0.7)) throw new Error(`${label}: User surface does not cover the full code block height.`);
console.log(`PDF renderer screenshot verification: PASS [${label}] (${png}, ${width}x${height}, bands=${JSON.stringify(bands)})`);
}

for (const [filename, prefix, allPages] of samples) {
  const pdf = resolve(root, "tests/output/pdf-render", filename);
  const outputPrefix = resolve(root, "tests/output/pdf-render", prefix);
  let png = `${outputPrefix}-1.png`;
  if (!existsSync(pdf)) throw new Error(`Missing sample PDF: ${pdf}. Run npm run test:pdf-render:sample first.`);
  mkdirSync(dirname(png), { recursive: true });
  if (allPages) for (const oldPage of readdirSync(dirname(outputPrefix)).filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".png"))) unlinkSync(resolve(dirname(outputPrefix), oldPage));
  renderSample(pdf, outputPrefix, allPages);
  if (allPages) {
    const renderedPages = readdirSync(dirname(outputPrefix)).filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".png")).sort();
    if (renderedPages.length < 2) throw new Error(`${filename}: expected at least two rendered pages.`);
    png = resolve(dirname(outputPrefix), renderedPages.at(-1));
  }
  validatePng(png, filename);
}
