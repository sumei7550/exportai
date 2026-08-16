import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const input = resolve(
  "src/assets/fonts-test/NotoSansSC-Regular.ttf"
);

const outputJs = resolve(
  "src/assets/fonts-test/NotoSansSC-Regular.js"
);
const outputDts = resolve(
  "src/assets/fonts-test/NotoSansSC-Regular.d.ts"
);

const base64 = readFileSync(input).toString("base64");

const jsContent = `
export const NOTO_SANS_SC_REGULAR_BASE64 = "${base64}";
`;

const dtsContent = `/**
 * Type declaration for full Noto Sans SC TTF font module (test build).
 */

export const NOTO_SANS_SC_REGULAR_BASE64: string;
`;

writeFileSync(outputJs, jsContent, "utf8");
writeFileSync(outputDts, dtsContent, "utf8");

console.log("Generated:", outputJs);
console.log("Generated:", outputDts);
console.log("Size:", base64.length);