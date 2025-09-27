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

/**
 * Extract text from a file based on its MIME type
 * @param {Object} file - Multer file object with buffer and mimetype
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromFile(file) {
  const { buffer, mimetype } = file;

  try {
    switch (mimetype) {
      case "application/pdf":
        return await extractFromPdf(buffer);

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return await extractFromDocx(buffer);

      case "text/plain":
        return await extractFromTxt(buffer);

      case "image/jpeg":
      case "image/png":
      case "image/tiff":
        return await extractFromImage(buffer);

      default:
        throw new Error(`Unsupported file type: ${mimetype}`);
    }
  } catch (error) {
    console.error(`Text extraction failed for ${mimetype}:`, error);
    throw new Error(
      `Failed to extract text from ${mimetype}: ${error.message}`
    );
  }
}
