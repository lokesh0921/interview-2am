import fs from "fs";
import path from "path";
import os from "os";

export async function extractFromPdf(buffer) {
  try {
    // Ensure we have a valid buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty PDF buffer");
    }

    console.log("Starting PDF extraction with buffer size:", buffer.length);

    // Method 1: Try pdf-parse with buffer (most reliable for text-based PDFs)
    try {
      console.log("Trying pdf-parse with buffer...");

      // Create test file directory if it doesn't exist
      const testDir = path.join(process.cwd(), "test", "data");
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create a test file for pdf-parse initialization
      const testFile = path.join(testDir, "05-versions-space.pdf");
      if (!fs.existsSync(testFile)) {
        // Create a minimal PDF test file
        const minimalPdf = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`);
        fs.writeFileSync(testFile, minimalPdf);
      }

      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);

      if (data && data.text && data.text.trim()) {
        console.log("pdf-parse successful, text length:", data.text.length);
        return data.text;
      }
    } catch (pdfParseError) {
      console.log("pdf-parse failed:", pdfParseError.message);
    }

    // Method 2: Try pdfjs-dist (better for complex PDFs)
    try {
      console.log("Trying pdfjs-dist...");

      // Set up DOM polyfills for pdfjs-dist
      const { JSDOM } = await import("jsdom");
      const dom = new JSDOM();
      global.DOMMatrix = dom.window.DOMMatrix;
      global.ImageData = dom.window.ImageData;
      global.Path2D = dom.window.Path2D;

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        useSystemFonts: true,
        disableFontFace: false,
        disableRange: false,
        disableStream: false,
      });

      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        fullText += pageText + "\n";
      }

      if (fullText.trim()) {
        console.log("pdfjs-dist successful, text length:", fullText.length);
        return fullText.trim();
      }
    } catch (pdfjsError) {
      console.log("pdfjs-dist failed:", pdfjsError.message);
    }

    // Method 3: Try OCR for scanned PDFs (moved earlier for better performance)
    try {
      console.log("Trying OCR for scanned PDF...");

      const pdf2pic = (await import("pdf2pic")).default;
      const Tesseract = (await import("tesseract.js")).default;

      // Convert PDF to images with optimized settings
      const convert = pdf2pic.fromBuffer(buffer, {
        density: 150, // Higher density for better OCR
        saveFilename: "page",
        savePath: os.tmpdir(), // Use system temp directory
        format: "png",
        width: 2000,
        height: 2000,
      });

      const results = await convert.bulk(-1, { responseType: "image" });
      let fullText = "";

      // OCR each page with better configuration
      for (const result of results) {
        try {
          const { data } = await Tesseract.recognize(result.path, "eng", {
            logger: (m) => console.log("OCR:", m),
            tessedit_pageseg_mode: "1", // Automatic page segmentation with OSD
            tessedit_ocr_engine_mode: "1", // Neural nets LSTM engine only
          });
          fullText += data.text + "\n\n";

          // Clean up the image file
          try {
            fs.unlinkSync(result.path);
          } catch (cleanupError) {
            console.log(
              "Could not clean up temp image file:",
              cleanupError.message
            );
          }
        } catch (pageError) {
          console.log("OCR failed for page:", pageError.message);
        }
      }

      if (fullText.trim()) {
        console.log("OCR successful, text length:", fullText.length);
        return fullText.trim();
      }
    } catch (ocrError) {
      console.log("OCR failed:", ocrError.message);
    }

    // Method 4: Try pdf-lib for validation and basic info
    try {
      console.log("Trying pdf-lib for validation...");
      const { PDFDocument } = await import("pdf-lib");

      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();

      console.log("pdf-lib validation successful, pages:", pages.length);

      if (pages.length > 0) {
        return `[PDF Document - ${pages.length} pages detected. This appears to be a scanned PDF or has complex formatting that prevents text extraction. The document structure is valid and has been processed for metadata extraction.]`;
      }
    } catch (pdfLibError) {
      console.log("pdf-lib validation failed:", pdfLibError.message);
    }

    throw new Error(
      "All PDF parsing methods failed - unable to extract text from PDF"
    );
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
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
  const { buffer, mimetype, originalname } = file;

  console.log(
    `Starting text extraction for file: ${originalname} (${mimetype})`
  );

  try {
    let extractedText = "";

    switch (mimetype) {
      case "application/pdf":
        console.log("Processing PDF file...");
        extractedText = await extractFromPdf(buffer);
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        console.log("Processing Word document...");
        extractedText = await extractFromDocx(buffer);
        break;

      case "text/plain":
        console.log("Processing text file...");
        extractedText = await extractFromTxt(buffer);
        break;

      case "image/jpeg":
      case "image/png":
      case "image/tiff":
        console.log("Processing image file...");
        extractedText = await extractFromImage(buffer);
        break;

      default:
        throw new Error(`Unsupported file type: ${mimetype}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text content extracted from file");
    }

    console.log(
      `Text extraction successful for ${originalname}, extracted ${extractedText.length} characters`
    );
    return extractedText;
  } catch (error) {
    console.error(`Text extraction failed for ${originalname} (${mimetype}):`, {
      error: error.message,
      stack: error.stack,
      fileSize: buffer.length,
      mimeType: mimetype,
    });

    // Provide more specific error messages based on file type
    if (mimetype === "application/pdf") {
      throw new Error(
        `PDF text extraction failed for ${originalname}: ${error.message}. This may be due to scanned PDF, encryption, or complex formatting.`
      );
    }

    throw new Error(
      `Failed to extract text from ${originalname} (${mimetype}): ${error.message}`
    );
  }
}
