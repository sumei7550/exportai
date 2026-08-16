export type PdfTemplateId = "default" | "dark";

export interface PdfTemplateConfig {
  pageBackground: [number, number, number];
  surface: [number, number, number];
  text: [number, number, number];
  link: [number, number, number];
  border: [number, number, number];
  codeBackground: [number, number, number];
  tableHeader: [number, number, number];
  tableAlternate: [number, number, number];
}

export const PDF_TEMPLATES: Readonly<Record<PdfTemplateId, PdfTemplateConfig>> = {
  default: { pageBackground: [255, 255, 255], surface: [248, 248, 248], text: [0, 0, 0], link: [0, 51, 153], border: [180, 180, 180], codeBackground: [245, 245, 245], tableHeader: [238, 242, 247], tableAlternate: [250, 250, 250] },
  dark: { pageBackground: [24, 24, 27], surface: [39, 39, 42], text: [244, 244, 245], link: [125, 211, 252], border: [82, 82, 91], codeBackground: [9, 9, 11], tableHeader: [63, 63, 70], tableAlternate: [39, 39, 42] },
};

export function getPdfTemplate(template: PdfTemplateId = "default"): PdfTemplateConfig {
  return PDF_TEMPLATES[template];
}
