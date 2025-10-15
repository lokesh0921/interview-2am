import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  File,
  Download,
} from "lucide-react";

interface FilePreviewProps {
  fileId: string;
  filename: string;
  mimeType: string;
  isExpanded: boolean;
  onToggle: () => void;
  isVisible?: boolean;
}

type PreviewType = "pdf" | "image" | "text" | "unsupported";

export default function FilePreview({
  fileId,
  filename,
  mimeType,
  isExpanded,
  onToggle,
  isVisible = true,
}: FilePreviewProps) {
  const [previewType, setPreviewType] = useState<PreviewType>("unsupported");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Request throttling - limit concurrent requests
  const [requestQueue, setRequestQueue] = useState<Set<string>>(new Set());
  const MAX_CONCURRENT_REQUESTS = 2;

  useEffect(() => {
    if (isExpanded && fileId && isVisible) {
      loadPreview();
    }
  }, [isExpanded, fileId, mimeType, isVisible]);

  // Cleanup blob URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadPreview = async () => {
    // Check if we can make a request (throttling)
    if (requestQueue.size >= MAX_CONCURRENT_REQUESTS) {
      // Wait for a slot to become available
      await new Promise((resolve) => setTimeout(resolve, 200));
      return loadPreview();
    }

    setLoading(true);
    setError("");

    // Add to request queue
    setRequestQueue((prev) => new Set([...prev, fileId]));

    try {
      console.log(
        `[FilePreview] Loading preview for ${filename}, MIME type: ${mimeType}`
      );

      // Determine preview type based on MIME type and file extension
      let type: PreviewType = "unsupported";

      // Check MIME type first
      if (
        mimeType === "application/pdf" ||
        filename.toLowerCase().endsWith(".pdf")
      ) {
        type = "pdf";
      } else if (
        mimeType.startsWith("image/") ||
        filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/)
      ) {
        type = "image";
      } else if (
        mimeType === "text/plain" ||
        mimeType === "text/csv" ||
        mimeType === "application/json" ||
        filename.toLowerCase().endsWith(".txt") ||
        filename.toLowerCase().endsWith(".md") ||
        filename.toLowerCase().endsWith(".csv") ||
        filename.toLowerCase().endsWith(".json")
      ) {
        type = "text";
      }

      setPreviewType(type);
      console.log(`[FilePreview] Detected preview type: ${type}`);

      if (type !== "unsupported") {
        // For PDF and images, we need to fetch with authentication and create blob URL
        if (type === "pdf" || type === "image") {
          try {
            const baseUrl =
              import.meta.env.VITE_API_BASE || "http://localhost:4001/api";
            const token = localStorage.getItem("sb:token") || "dev-test-token";

            const response = await fetch(
              `${baseUrl}/vector-search/documents/${fileId}/preview`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
            } else {
              throw new Error(`Failed to fetch file: ${response.status}`);
            }
          } catch (fetchError) {
            console.error("Error fetching file for preview:", fetchError);
            setError("Failed to load file preview");
          }
        } else {
          // For text files, use direct URL (they don't need special handling)
          const baseUrl =
            import.meta.env.VITE_API_BASE || "http://localhost:4001/api";
          const token = localStorage.getItem("sb:token") || "dev-test-token";
          const url = `${baseUrl}/vector-search/documents/${fileId}/preview?token=${encodeURIComponent(
            token
          )}`;
          setPreviewUrl(url);
        }
      }
    } catch (err) {
      setError("Failed to load preview");
      console.error("Preview error:", err);
    } finally {
      setLoading(false);
      // Remove from request queue
      setRequestQueue((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const getFileIcon = () => {
    switch (previewType) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "text":
        return <File className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading preview...
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8 text-red-600 dark:text-red-400">
          <span>{error}</span>
        </div>
      );
    }

    switch (previewType) {
      case "pdf":
        return (
          <div className="w-full h-[800px]">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 rounded"
              title={`Preview of ${filename}`}
            />
          </div>
        );

      case "image":
        return (
          <div className="flex justify-center p-4">
            <img
              src={previewUrl}
              alt={`Preview of ${filename}`}
              className="max-w-full max-h-[800px] object-contain rounded shadow-lg"
              onError={() => setError("Failed to load image")}
            />
          </div>
        );

      case "text":
        return (
          <div className="w-full h-[800px]">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 rounded bg-white dark:bg-gray-800"
              title={`Preview of ${filename}`}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <File className="h-12 w-12 mb-2" />
            <p>Preview not available for this file type</p>
            <p className="text-sm mt-1">({mimeType})</p>
          </div>
        );
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getFileIcon()}
          <h4 className="font-medium text-gray-700 dark:text-gray-300">
            {filename}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Expand
              </>
            )}
          </button>
          <button
            onClick={async () => {
              try {
                const baseUrl =
                  import.meta.env.VITE_API_BASE || "http://localhost:4001/api";
                const token =
                  localStorage.getItem("sb:token") || "dev-test-token";

                const response = await fetch(
                  `${baseUrl}/vector-search/documents/${fileId}/download`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                if (response.ok) {
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } else {
                  throw new Error(`Download failed: ${response.status}`);
                }
              } catch (error) {
                console.error("Download error:", error);
                setError("Failed to download file");
              }
            }}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Download file"
          >
            <Download className="h-3 w-3" /> Download
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-100 dark:bg-[#010613] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="animate-pulse">
              <div className="flex items-center justify-center h-96 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Loading preview...
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 text-red-500 dark:text-red-400">
              <File className="h-8 w-8 mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            renderPreview()
          )}
        </div>
      )}
    </div>
  );
}
