import { useEffect, useMemo, useState } from "react";

interface LocalFilePreviewProps {
  files: FileList;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectNewFiles: () => void;
  loading?: boolean;
}

type DetectedType = "pdf" | "image" | "text" | "other";

function detectType(file: File): DetectedType {
  const name = file.name.toLowerCase();
  const type = file.type;
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    type.startsWith("image/") ||
    /(jpg|jpeg|png|gif|bmp|webp|tiff)$/.test(name)
  )
    return "image";
  if (type.startsWith("text/") || /(txt|md|csv|json)$/i.test(name))
    return "text";
  return "other";
}

export default function LocalFilePreview({
  files,
  onConfirm,
  onCancel,
  onSelectNewFiles,
  loading = false,
}: LocalFilePreviewProps) {
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});

  const fileArray = useMemo(() => Array.from(files), [files]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    fileArray.forEach((file) => {
      try {
        urls[file.name] = URL.createObjectURL(file);
      } catch {
        // ignore url creation errors
      }
    });
    setObjectUrls(urls);
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [fileArray]);

  return (
    <div className="rounded-xl border p-4 bg-white dark:bg-[#0A1329]">
      <div className="mb-3 text-sm font-medium">Preview selected files</div>
      <div className="space-y-4">
        {fileArray.map((file) => {
          const kind = detectType(file);
          const url = objectUrls[file.name];
          return (
            <div key={file.name} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 text-sm flex items-center justify-between bg-gray-50 dark:bg-[#010613]">
                <div className="font-medium truncate mr-2">{file.name}</div>
                <div className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <div className="p-3">
                {kind === "pdf" && url ? (
                  <iframe
                    src={url}
                    className="w-full h-[500px] border rounded"
                    title={`Preview ${file.name}`}
                  />
                ) : kind === "image" && url ? (
                  <div className="flex justify-center">
                    <img
                      src={url}
                      alt={file.name}
                      className="max-h-[500px] object-contain rounded shadow"
                    />
                  </div>
                ) : kind === "text" && url ? (
                  <iframe
                    src={url}
                    className="w-full h-[400px] border rounded bg-white dark:bg-gray-800"
                    title={`Preview ${file.name}`}
                  />
                ) : (
                  <div className="text-sm text-gray-500">
                    Preview not available for this file type.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-900 text-white disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Confirm Upload"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#010613]"
        >
          Cancel
        </button>
        <button
          onClick={onSelectNewFiles}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#010613]"
        >
          Select New Files
        </button>
      </div>
    </div>
  );
}
