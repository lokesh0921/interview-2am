import { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import mammoth from "mammoth";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface FilePreviewProps {
  files: FileList;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectNewFiles: () => void;
  loading?: boolean;
}

type PreviewType = "pdf" | "word" | "image" | "text" | "unsupported" | null;

export default function FilePreview({
  files,
  onConfirm,
  onCancel,
  onSelectNewFiles,
  loading = false,
}: FilePreviewProps) {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewFileBuffer, setPreviewFileBuffer] =
    useState<ArrayBuffer | null>(null);
  const [previewFileBlob, setPreviewFileBlob] = useState<Blob | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // PDF states
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  // Image zoom states
  const [imageZoom, setImageZoom] = useState<number>(100);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const detectFileType = (file: File): PreviewType => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.includes("pdf")) {
      return "pdf";
    } else if (
      type.includes("word") ||
      type.includes("document") ||
      name.endsWith(".docx") ||
      name.endsWith(".doc")
    ) {
      return "word";
    } else if (type.startsWith("image/")) {
      return "image";
    } else if (
      type.includes("text/") ||
      type.includes("json") ||
      type.includes("csv") ||
      name.endsWith(".txt")
    ) {
      return "text";
    } else {
      return "unsupported";
    }
  };

  const handleFilePreview = async (file: File) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewContent("");
    setPreviewImageUrl("");
    setPreviewFileBuffer(null);
    setPreviewFileBlob(null);
    setPreviewFileUrl("");
    setPageNumber(1);
    setScale(1.0);
    setImageZoom(100);

    const type = detectFileType(file);
    setPreviewType(type);

    try {
      switch (type) {
        case "image":
          const imgUrl = URL.createObjectURL(file);
          setPreviewImageUrl(imgUrl);
          break;

        case "text":
          const text = await file.text();
          setPreviewContent(text);
          break;

        case "word":
          console.log("Converting Word file to ArrayBuffer...");
          const wordArrayBuffer = await file.arrayBuffer();
          console.log(
            "Word ArrayBuffer created, size:",
            wordArrayBuffer.byteLength
          );

          // Create a new ArrayBuffer to avoid detachment issues
          const wordBuffer = new ArrayBuffer(wordArrayBuffer.byteLength);
          const wordView = new Uint8Array(wordBuffer);
          wordView.set(new Uint8Array(wordArrayBuffer));

          setPreviewFileBuffer(wordBuffer);
          await handleWordPreview(wordBuffer);
          break;

        case "pdf":
          console.log("Converting PDF file to URL...");
          // Create a URL directly from the file to avoid ArrayBuffer issues
          const pdfUrl = URL.createObjectURL(file);
          console.log("PDF URL created:", pdfUrl);
          setPreviewFileUrl(pdfUrl);
          break;

        default:
          setPreviewError("Preview not available for this file type.");
      }
    } catch (error) {
      console.error("Preview error:", error);
      setPreviewError("Failed to load preview. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleWordPreview = async (arrayBuffer: ArrayBuffer) => {
    try {
      console.log(
        "Starting Word conversion with ArrayBuffer size:",
        arrayBuffer.byteLength
      );
      const result = await mammoth.convertToHtml({ arrayBuffer });
      console.log(
        "Word conversion successful, content length:",
        result.value.length
      );
      setPreviewContent(result.value);

      if (result.messages.length > 0) {
        console.warn("Word conversion warnings:", result.messages);
      }
    } catch (error) {
      console.error("Word conversion error:", error);
      throw new Error(`Failed to convert Word document: ${error.message}`);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewFileBuffer(null);
    setPreviewFileBlob(null);
    setPreviewFileUrl("");
    setPreviewType(null);
    setPreviewContent("");
    setNumPages(0);
    setPageNumber(1);
    setScale(1.0);
    setImageZoom(100);

    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl("");
    }

    if (previewFileUrl) {
      URL.revokeObjectURL(previewFileUrl);
      setPreviewFileUrl("");
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) =>
      Math.min(Math.max(1, prevPageNumber + offset), numPages)
    );
  };

  const goToPage = (page: number) => {
    setPageNumber(Math.min(Math.max(1, page), numPages));
  };

  const zoomIn = () => {
    if (previewType === "pdf") {
      setScale((prev) => Math.min(prev + 0.25, 3.0));
    } else if (previewType === "image") {
      setImageZoom((prev) => Math.min(prev + 25, 300));
    }
  };

  const zoomOut = () => {
    if (previewType === "pdf") {
      setScale((prev) => Math.max(prev - 0.25, 0.5));
    } else if (previewType === "image") {
      setImageZoom((prev) => Math.max(prev - 25, 25));
    }
  };

  const fitToScreen = () => {
    if (previewType === "pdf") {
      setScale(1.0);
    } else if (previewType === "image") {
      setImageZoom(100);
    }
  };

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    if (type.startsWith("image/")) {
      return (
        <svg
          className="h-8 w-8 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    } else if (type.includes("pdf")) {
      return (
        <svg
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    } else if (type.includes("word") || type.includes("document")) {
      return (
        <svg
          className="h-8 w-8 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="h-8 w-8 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
  };

  const totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          File Preview
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {files.length} file{files.length !== 1 ? "s" : ""} •{" "}
          {formatFileSize(totalSize)}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {Array.from(files).map((file, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            {getFileIcon(file)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)} • {file.type || "Unknown type"}
              </p>
            </div>
            <button
              onClick={() => handleFilePreview(file)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Preview
            </button>
          </div>
        ))}
      </div>

      {/* Enhanced File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-6xl max-h-[95vh] w-full overflow-hidden flex flex-col">
            {/* Header with Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b dark:border-gray-700 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {previewFile.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(previewFile.size)} •{" "}
                  {previewType?.toUpperCase()}
                </p>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {(previewType === "pdf" || previewType === "image") && (
                  <>
                    <button
                      onClick={zoomOut}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Zoom Out"
                    >
                      <svg
                        className="h-5 w-5 text-gray-700 dark:text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                        />
                      </svg>
                    </button>

                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                      {previewType === "pdf"
                        ? `${Math.round(scale * 100)}%`
                        : `${imageZoom}%`}
                    </span>

                    <button
                      onClick={zoomIn}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Zoom In"
                    >
                      <svg
                        className="h-5 w-5 text-gray-700 dark:text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={fitToScreen}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Fit to Screen"
                    >
                      <svg
                        className="h-5 w-5 text-gray-700 dark:text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    </button>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  </>
                )}

                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg
                    className="h-5 w-5 text-gray-700 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* PDF Navigation */}
            {previewType === "pdf" && numPages > 0 && (
              <div className="flex items-center justify-center gap-3 p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <button
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="h-5 w-5 text-gray-700 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageNumber}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    of {numPages}
                  </span>
                </div>

                <button
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= numPages}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="h-5 w-5 text-gray-700 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
              {previewLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              )}

              {previewError && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <svg
                      className="h-12 w-12 text-red-500 mx-auto mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-700 dark:text-red-400">
                      {previewError}
                    </p>
                  </div>
                </div>
              )}

              {!previewLoading && !previewError && (
                <>
                  {/* PDF Preview */}
                  {previewType === "pdf" && previewFileUrl && (
                    <div className="flex justify-center">
                      <Document
                        file={previewFileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(error) => {
                          console.error("PDF load error:", error);
                          console.error("Error details:", {
                            message: error.message,
                            name: error.name,
                            stack: error.stack,
                            fileUrl: previewFileUrl,
                            fileType: previewFile?.type,
                          });
                          setPreviewError(
                            `Failed to load PDF: ${error.message}`
                          );
                        }}
                        loading={
                          <div className="flex items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="ml-3 text-gray-600 dark:text-gray-400">
                              Loading PDF...
                            </p>
                          </div>
                        }
                        error={
                          <div className="text-center p-6">
                            <svg
                              className="h-12 w-12 text-red-500 mx-auto mb-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <p className="text-red-600 dark:text-red-400 mb-2">
                              Failed to load PDF
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              The PDF file may be corrupted or encrypted
                            </p>
                          </div>
                        }
                        options={{
                          cMapUrl: `https://unpkg.com/pdfjs-dist@5.3.93/cmaps/`,
                          cMapPacked: true,
                        }}
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="shadow-lg"
                          onLoadError={(error) => {
                            console.error("PDF page load error:", error);
                            setPreviewError(
                              `Failed to load PDF page: ${error.message}`
                            );
                          }}
                        />
                      </Document>
                    </div>
                  )}

                  {/* Image Preview */}
                  {previewType === "image" && previewImageUrl && (
                    <div
                      ref={imageContainerRef}
                      className="flex justify-center items-center min-h-full overflow-auto"
                    >
                      <img
                        src={previewImageUrl}
                        alt={previewFile.name}
                        style={{ width: `${imageZoom}%` }}
                        className="max-w-none object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  )}

                  {/* Word Document Preview */}
                  {previewType === "word" && previewContent && (
                    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
                      <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                      />
                    </div>
                  )}

                  {/* Text File Preview */}
                  {previewType === "text" && previewContent && (
                    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono overflow-auto">
                        {previewContent}
                      </pre>
                    </div>
                  )}

                  {/* Unsupported Type */}
                  {previewType === "unsupported" && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6">
                        <svg
                          className="h-16 w-16 text-gray-400 mx-auto mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Preview not available for this file type
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Download the file to view its contents
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSelectNewFiles}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Select New Files
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </>
          ) : (
            "Confirm Upload"
          )}
        </button>
      </div>
    </div>
  );
}
