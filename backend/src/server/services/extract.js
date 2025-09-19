export async function extractFromPdf(buffer) {
  const { default: pdfParse } = await import("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text || "";
}

export async function extractFromDocx(buffer) {
  const { default: mammoth } = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value || "";
}

export async function extractFromTxt(buffer) {
  return buffer.toString("utf-8");
}

export async function extractFromImage(buffer) {
  const { default: Tesseract } = await import("tesseract.js");
  const { data } = await Tesseract.recognize(buffer, "eng");
  return data.text || "";
}
