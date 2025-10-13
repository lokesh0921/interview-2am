import { useState } from "react";
import { useSupabase } from "../supabase/SupabaseProvider";
import FileUploader from "../components/FileUploader";
import FilePreview from "../components/FilePreview";
import { useToast } from "../hooks/use-toast";
import Header from "@/components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function Upload() {
  const { session } = useSupabase();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "text">("files");
  const [showPreview, setShowPreview] = useState(false);

  const handleFilesSelected = (selectedFiles: FileList) => {
    setFiles(selectedFiles);
    setResults([]);
    setShowPreview(true);
  };

  const handlePreviewCancel = () => {
    setFiles(null);
    setShowPreview(false);
  };

  const handleSelectNewFiles = () => {
    setShowPreview(false);
    setFiles(null);
  };

  const handlePreviewConfirm = async () => {
    if (!files) return;

    setLoading(true);
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";
      const apiBase =
        (import.meta as any).env?.VITE_API_BASE || "http://localhost:4001/api";

      // Process files one by one for vector search
      const results = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file); // Single file for vector search
        if (prompt && prompt.trim()) {
          form.append("prompt", prompt.trim());
        }

        const res = await fetch(`${apiBase}/vector-search/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });

        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        results.push(json.data);
      }

      setResults(results);
      setShowPreview(false);
      setFiles(null);
      setPrompt("");

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded and processed ${results.length} file(s)`,
        variant: "default",
      });
    } catch (e: any) {
      console.error("Upload error:", e);
      toast({
        title: "Upload Failed",
        description: e.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessText = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";
      const apiBase =
        (import.meta as any).env?.VITE_API_BASE || "http://localhost:4001/api";

      // Create a text file from the pasted text
      const textBlob = new Blob([text], { type: "text/plain" });
      const textFile = new File([textBlob], "pasted-text.txt", {
        type: "text/plain",
      });

      const form = new FormData();
      form.append("file", textFile);
      if (prompt && prompt.trim()) {
        form.append("prompt", prompt.trim());
      }

      const res = await fetch(`${apiBase}/vector-search/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to process text");
      }

      const result = await res.json();
      setResults([result.data]);
      setPrompt("");

      toast({
        title: "Text Processed Successfully",
        description: "Your text has been processed and is now searchable",
      });
    } catch (e: any) {
      console.error("Text processing error:", e);
      toast({
        title: "Processing Failed",
        description: e.message || "Failed to process text",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010613] text-gray-900 dark:text-white">
      <Header />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pt-24 sm:pt-28">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
          Upload & Process
        </h1>

        <div className="bg-white dark:bg-[#0A1329] rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex space-x-2 sm:space-x-4 mb-4 sm:mb-6">
            <button
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium dark:bg-[#010613] ${
                activeTab === "files"
                  ? "bg-blue-100 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab("files")}
            >
              Upload Files
            </button>
            <button
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium dark:bg-[#010613] ${
                activeTab === "text"
                  ? "bg-blue-100 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab("text")}
            >
              Paste Text
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {activeTab === "files" ? (
              <div className="space-y-3 sm:space-y-4">
                {!showPreview ? (
                  <FileUploader onFilesSelected={handleFilesSelected} />
                ) : files ? (
                  <FilePreview
                    files={files}
                    onConfirm={handlePreviewConfirm}
                    onCancel={handlePreviewCancel}
                    onSelectNewFiles={handleSelectNewFiles}
                    loading={loading}
                  />
                ) : null}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Prompt (optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Provide custom instructions for summarization (e.g., focus on risks, extract KPIs, compare scenarios)"
                    className="w-full h-24 dark:bg-[#010613] border rounded-xl p-3 text-sm text-gray-700 dark:text-white focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If left empty, the default summarization prompt will be
                    used.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste text here for processing..."
                  className="w-full h-40 dark:bg-[#010613] sm:h-60 border rounded-xl p-3 sm:p-4 text-sm sm:text-base text-gray-700 dark:text-white focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all"
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Prompt (optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Provide custom instructions for summarization (e.g., focus on risks, extract KPIs, compare scenarios)"
                    className="w-full h-24 dark:bg-[#010613] border rounded-xl p-3 text-sm text-gray-700 dark:text-white focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If left empty, the default summarization prompt will be
                    used.
                  </p>
                </div>
              </>
            )}

            {activeTab === "text" && (
              <button
                onClick={handleProcessText}
                disabled={loading || !text.trim()}
                className="w-full bg-blue-900 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white "
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
                    Processing...
                  </>
                ) : (
                  "Process Text"
                )}
              </button>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Results
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="border rounded-xl shadow-md p-3 sm:p-5 bg-white overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
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
                      <span className="font-medium text-sm sm:text-base">
                        {r.filename}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {r.sourceType}
                      </span>
                    </div>
                    <button
                      className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1 self-start sm:self-auto"
                      onClick={() => {
                        navigator.clipboard.writeText(r.summary);
                        toast({
                          title: "Summary Copied",
                          description: "Summary has been copied to clipboard",
                          variant: "default",
                        });
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 sm:h-4 sm:w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Summary
                    </button>
                  </div>

                  <div className="mb-2 sm:mb-3">
                    <div className="text-xs sm:text-sm font-medium mb-1">
                      Categories:
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {Array.isArray(r.categories)
                        ? r.categories.map((category: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                                category === "Auto"
                                  ? "bg-red-100 text-red-800"
                                  : category === "IT"
                                  ? "bg-blue-100 text-blue-800"
                                  : category === "Pharma"
                                  ? "bg-green-100 text-green-800"
                                  : category === "Economics"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {category}
                            </span>
                          ))
                        : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs sm:text-sm">
                    {r.location && (
                      <div>
                        <div className="font-medium text-gray-700">
                          Location
                        </div>
                        <div>{r.location}</div>
                      </div>
                    )}
                    {r.positionType && (
                      <div>
                        <div className="font-medium text-gray-700">
                          Position Type
                        </div>
                        <div>{r.positionType}</div>
                      </div>
                    )}
                    {r.company && (
                      <div>
                        <div className="font-medium text-gray-700">Company</div>
                        <div>{r.company}</div>
                      </div>
                    )}
                    {r.date && (
                      <div>
                        <div className="font-medium text-gray-700">Date</div>
                        <div>{r.date}</div>
                      </div>
                    )}
                  </div>

                  <details className="text-xs sm:text-sm">
                    <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 transition-colors">
                      View Summary
                    </summary>
                    <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="markdown prose prose-sm max-w-none text-gray-900">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-lg font-bold mb-3 pb-1 border-b border-gray-300">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-semibold mb-2 pb-1 border-b border-gray-200">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold mb-2">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 leading-relaxed">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-3 ml-4 list-disc space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-3 ml-4 list-decimal space-y-1">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">
                                {children}
                              </strong>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto mb-3">
                                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-gray-300 px-2 py-1">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {r.summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
