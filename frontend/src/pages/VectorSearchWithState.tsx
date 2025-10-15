import { useState, useEffect } from "react";
import { useSupabase } from "../supabase/SupabaseProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Tabs, TabsContent } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import VectorFileUploader from "../components/VectorFileUploader";
import Header from "@/components/Header";
import { useVectorSearchState } from "../contexts/AppStateContext";
import {
  useNavigationState,
  useScrollRestoration,
} from "../hooks/useNavigationState";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import FilePreview from "../components/FilePreview";
import * as ReactWindow from "react-window";
const List: any =
  (ReactWindow as any).FixedSizeList || (ReactWindow as any).List;

// Item data type for react-window List
interface SearchResultItemData {
  results: any[];
  expandedFileIds: Record<string, boolean>;
  visibleFileIds: Set<string>;
  toggleFileExpanded: (id: string) => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
}

// Individual search result item component for virtual scrolling
interface SearchResultItemProps {
  index: number;
  style: React.CSSProperties;
  data: SearchResultItemData;
}

const SearchResultItem = ({ index, style, data }: SearchResultItemProps) => {
  const {
    results,
    expandedFileIds,
    visibleFileIds,
    toggleFileExpanded,
    formatFileSize,
    formatDate,
  } = data;
  const result = results[index];

  return (
    <div style={style} className="px-2">
      <Card className="border-l-4 border-l-blue-500 h-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg">{result.filename}</CardTitle>
              <CardDescription>
                {formatFileSize(result.file_size)} • Uploaded{" "}
                {formatDate(result.upload_date)}
                {result.reference_date && (
                  <> • Reference: {formatDate(result.reference_date)}</>
                )}
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm font-medium">
                {result.similarity_score && !isNaN(result.similarity_score)
                  ? `${(result.similarity_score * 100).toFixed(1)}% match`
                  : "No score"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="markdown text-sm mb-3 prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mb-3 pb-1 border-b border-gray-300 dark:border-gray-600">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-2 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>
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
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    {children}
                  </strong>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-3">
                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                    {children}
                  </td>
                ),
              }}
            >
              {result.summary_text}
            </ReactMarkdown>
          </div>

          {/* Original File Preview Section */}
          <div data-file-id={result.file_id}>
            <FilePreview
              fileId={result.file_id}
              filename={result.filename}
              mimeType={result.mime_type}
              isExpanded={expandedFileIds[result.file_id]}
              onToggle={() => toggleFileExpanded(result.file_id)}
              isVisible={visibleFileIds.has(result.file_id)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {result.extracted_tags.industries.map((tag: string) => (
              <span
                key={tag}
                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {result.extracted_tags.sectors.map((tag: string) => (
              <span
                key={tag}
                className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {result.extracted_tags.stock_names.map((tag: string) => (
              <span
                key={tag}
                className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function VectorSearchWithState() {
  const { session } = useSupabase();
  const { toast } = useToast();

  // Use global state
  const { vectorSearchState, updateVectorSearch } = useVectorSearchState();

  // Navigation and scroll restoration
  useNavigationState();
  useScrollRestoration();

  // Local state for data that doesn't need persistence
  const [activeTab, setActiveTab] = useState<"search" | "upload">("search");
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFileIds, setExpandedFileIds] = useState<
    Record<string, boolean>
  >({});

  // Destructure global state for easier access
  const {
    searchQuery,
    dateFrom,
    dateTo,
    minScore,
    questionAnswer,
    searchResults,
    lastSearchQuery,
  } = vectorSearchState;

  // Limit concurrent file previews to prevent performance issues
  const MAX_EXPANDED_PREVIEWS = 3;

  const toggleFileExpanded = (id: string) => {
    setExpandedFileIds((prev) => {
      const newState = { ...prev, [id]: !prev[id] };
      const expandedCount = Object.values(newState).filter(Boolean).length;

      // If we're trying to expand more than the limit, close the oldest one
      if (expandedCount > MAX_EXPANDED_PREVIEWS) {
        const expandedIds = Object.entries(newState)
          .filter(([_, isExpanded]) => isExpanded)
          .map(([id, _]) => id);

        if (expandedIds.length > 0) {
          newState[expandedIds[0]] = false;
        }
      }

      return newState;
    });
  };

  // Intersection Observer for lazy loading
  const [visibleFileIds, setVisibleFileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const fileId = entry.target.getAttribute("data-file-id");
            if (fileId) {
              setVisibleFileIds((prev) => new Set([...prev, fileId]));
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    // Observe all file preview containers
    const elements = document.querySelectorAll("[data-file-id]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [searchResults, questionAnswer]);

  // Global error handler for any unhandled errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Global error caught:", error);
      toast({
        title: "Application Error",
        description: "An unexpected error occurred. Please refresh the page.",
        variant: "destructive",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event);
      toast({
        title: "Application Error",
        description: "An unexpected error occurred. Please refresh the page.",
        variant: "destructive",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, [toast]);

  // Load initial data
  useEffect(() => {
    // No initial data loading needed without tags
  }, [session, toast]);

  const handleAskQuestion = async () => {
    try {
      if (!searchQuery.trim()) {
        toast({
          title: "Input Required",
          description: "Please enter a question",
          variant: "destructive",
        });
        return;
      }

      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to ask questions",
          variant: "destructive",
        });
        return;
      }

      console.log(`[VectorSearch Frontend] Asking question: "${searchQuery}"`);
      setIsSearching(true);

      // Update global state with the search query
      updateVectorSearch({ lastSearchQuery: searchQuery });

      const token =
        session.access_token || localStorage.getItem("sb:token") || "";
      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/ask`;

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 60000);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: searchQuery,
          min_score: minScore,
          top_k: 3,
          fast: true,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        signal: ac.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      const responseData = await response.json();
      if (responseData.success) {
        // Update global state with the answer
        updateVectorSearch({
          questionAnswer: {
            question: responseData.question,
            answer: responseData.answer,
            sources: responseData.sources || [],
          },
          searchResults: [], // Clear old search results
        });

        toast({
          title: "Question Answered",
          description: `Answer generated based on ${
            responseData.sources?.length || 0
          } document(s)`,
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error asking question:", error);
      if ((error as any)?.name === "AbortError") {
        toast({
          title: "Request Timed Out",
          description:
            "The server took too long to respond. Please try again, refine your query, or reduce the date range.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Question Error",
          description: `Failed to answer question: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearAllFilters = () => {
    updateVectorSearch({
      dateFrom: "",
      dateTo: "",
      minScore: 0.1,
    });
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset",
    });
  };

  const handleSimpleSearch = async () => {
    try {
      if (!searchQuery.trim()) {
        toast({
          title: "Input Required",
          description: "Please enter a search query",
          variant: "destructive",
        });
        return;
      }

      if (!session) {
        toast({
          title: "Authentication Error",
          description: "Please log in to perform searches",
          variant: "destructive",
        });
        return;
      }

      console.log(
        `[VectorSearchWithState Frontend] Starting simple search for: "${searchQuery}"`
      );
      setIsSearching(true);

      // Update global state with the search query
      updateVectorSearch({ lastSearchQuery: searchQuery });

      const token =
        session.access_token || localStorage.getItem("sb:token") || "";
      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/simple-search`;

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 60000);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          min_score: minScore,
          limit: 10,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        signal: ac.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      const responseData = await response.json();
      console.log(
        `[VectorSearchWithState Frontend] Simple search response:`,
        responseData
      );

      if (!responseData || typeof responseData !== "object") {
        throw new Error("Invalid response format from server");
      }

      if (responseData.success && responseData.data) {
        const results = Array.isArray(responseData.data.results)
          ? responseData.data.results
          : [];
        console.log(
          `[VectorSearchWithState Frontend] Simple search found ${results.length} results`
        );

        // Update global state with search results
        updateVectorSearch({
          searchResults: results,
          questionAnswer: null, // Clear old question answer
        });

        toast({
          title: "Simple Search Complete",
          description: `Found ${responseData.data.total_results || 0} results`,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(
        "[VectorSearchWithState Frontend] Simple search failed:",
        error
      );
      updateVectorSearch({ searchResults: [] });
      if ((error as any)?.name === "AbortError") {
        toast({
          title: "Request Timed Out",
          description:
            "The search took too long. Please try again or narrow the search scope.",
          variant: "destructive",
        });
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast({
          title: "Search Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error(
        `[VectorSearch] Date formatting error:`,
        error,
        `Input: ${dateString}`
      );
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010613] text-gray-900 dark:text-white">
      <Header />
      <div className="container mx-auto px-3 sm:px-6 max-w-7xl pt-20 sm:pt-28">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Document Q&A</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-white">
            Ask questions about your documents and get AI-powered answers with
            source references
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "search" | "upload")}
        >
          <TabsContent value="search" className="space-y-4 sm:space-y-6">
            {/* Search Interface */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">
                  Ask Questions About Your Documents
                </CardTitle>
                <CardDescription className="text-sm">
                  Ask specific questions and get AI-powered answers based on
                  your uploaded documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Input - Mobile Responsive */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-3">
                    <Input
                      placeholder="Ask a question about your documents..."
                      value={searchQuery}
                      onChange={(e) =>
                        updateVectorSearch({ searchQuery: e.target.value })
                      }
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleAskQuestion()
                      }
                      className="w-full text-base"
                    />
                    <Button
                      onClick={handleAskQuestion}
                      disabled={isSearching}
                      className="w-full sm:w-auto sm:px-8"
                      size="lg"
                    >
                      {isSearching ? "Thinking..." : "Ask Question"}
                    </Button>
                  </div>

                  {/* Action Buttons - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleSimpleSearch}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      Simple Search
                    </Button>
                    <Button
                      onClick={() =>
                        window.open("/vector-search/debug", "_blank")
                      }
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      Debug
                    </Button>
                  </div>
                </div>

                {/* Example Questions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                    Example Questions:
                  </h4>
                  <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <p>
                      • "What are the main business segments of this company?"
                    </p>
                    <p>• "What is the current market capitalization?"</p>
                    <p>• "What are the key risk factors mentioned?"</p>
                    <p>• "What is the revenue growth rate?"</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Min Similarity Score
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={minScore}
                      onChange={(e) =>
                        updateVectorSearch({
                          minScore: parseFloat(e.target.value) || 0.1,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) =>
                        updateVectorSearch({ dateFrom: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) =>
                        updateVectorSearch({ dateTo: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={clearAllFilters}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Question Answer Results */}
            {questionAnswer && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">Answer</CardTitle>
                  <CardDescription className="text-sm">
                    Question: "{questionAnswer.question}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Answer */}
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg border-l-4 border-l-green-500">
                      <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">
                        Answer:
                      </h4>
                      <div className="markdown text-green-800 dark:text-green-200 prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-lg font-bold mb-3 pb-1 border-b border-green-300 dark:border-green-600">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-semibold mb-2 pb-1 border-b border-green-200 dark:border-green-700">
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
                                <table className="min-w-full border-collapse border border-green-300 dark:border-green-600 text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border border-green-300 dark:border-green-600 bg-green-100 dark:bg-green-800 px-2 py-1 text-left font-semibold">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-green-300 dark:border-green-600 px-2 py-1">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {questionAnswer.answer}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Sources */}
                    {questionAnswer.sources &&
                      questionAnswer.sources.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">
                            Sources ({questionAnswer.sources.length}{" "}
                            document(s)):
                          </h4>
                          <div className="space-y-3">
                            {questionAnswer.sources.map((source, index) => (
                              <Card
                                key={index}
                                className="border-l-4 border-l-blue-500"
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div className="flex-1">
                                      <CardTitle className="text-base sm:text-lg">
                                        {source.filename || "Unknown filename"}
                                      </CardTitle>
                                      <CardDescription>
                                        {formatFileSize(source.file_size)} •
                                        Uploaded{" "}
                                        {formatDate(source.upload_date)}
                                        {(source as any).reference_date && (
                                          <>
                                            {" "}
                                            • Reference:{" "}
                                            {formatDate(
                                              (source as any).reference_date
                                            )}
                                          </>
                                        )}
                                      </CardDescription>
                                    </div>
                                    <div className="text-left sm:text-right">
                                      <div className="text-sm font-medium">
                                        {(
                                          source.similarity_score * 100
                                        ).toFixed(1)}
                                        % match
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="markdown text-sm mb-3 prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkBreaks]}
                                      components={{
                                        h1: ({ children }) => (
                                          <h1 className="text-lg font-bold mb-3 pb-1 border-b border-gray-300 dark:border-gray-600">
                                            {children}
                                          </h1>
                                        ),
                                        h2: ({ children }) => (
                                          <h2 className="text-base font-semibold mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                                            {children}
                                          </h2>
                                        ),
                                        h3: ({ children }) => (
                                          <h3 className="text-sm font-semibold mb-2">
                                            {children}
                                          </h3>
                                        ),
                                        p: ({ children }) => (
                                          <p className="mb-2 leading-relaxed">
                                            {children}
                                          </p>
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
                                          <li className="leading-relaxed">
                                            {children}
                                          </li>
                                        ),
                                        strong: ({ children }) => (
                                          <strong className="font-semibold text-gray-900 dark:text-gray-100">
                                            {children}
                                          </strong>
                                        ),
                                        table: ({ children }) => (
                                          <div className="overflow-x-auto mb-3">
                                            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs">
                                              {children}
                                            </table>
                                          </div>
                                        ),
                                        th: ({ children }) => (
                                          <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-left font-semibold">
                                            {children}
                                          </th>
                                        ),
                                        td: ({ children }) => (
                                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                                            {children}
                                          </td>
                                        ),
                                      }}
                                    >
                                      {source.summary}
                                    </ReactMarkdown>
                                  </div>

                                  {/* Original File Preview Section */}
                                  <div data-file-id={source.file_id}>
                                    <FilePreview
                                      fileId={source.file_id}
                                      filename={source.filename}
                                      mimeType={source.mime_type}
                                      isExpanded={
                                        expandedFileIds[source.file_id]
                                      }
                                      onToggle={() =>
                                        toggleFileExpanded(source.file_id)
                                      }
                                      isVisible={visibleFileIds.has(
                                        source.file_id
                                      )}
                                    />
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full sm:w-auto"
                                      onClick={async () => {
                                        try {
                                          const token =
                                            session?.access_token ||
                                            localStorage.getItem("sb:token") ||
                                            "";
                                          const apiUrl = `${
                                            import.meta.env.VITE_API_BASE ||
                                            "http://localhost:4001/api"
                                          }/vector-search/documents/${
                                            source.file_id
                                          }/download`;

                                          const response = await fetch(apiUrl, {
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          });

                                          if (response.ok) {
                                            const blob = await response.blob();
                                            const url =
                                              window.URL.createObjectURL(blob);
                                            const a =
                                              document.createElement("a");
                                            a.href = url;
                                            a.download = source.filename;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);

                                            toast({
                                              title: "Download Started",
                                              description: `Downloading ${source.filename}`,
                                            });
                                          } else {
                                            throw new Error("Download failed");
                                          }
                                        } catch (error) {
                                          console.error(
                                            "Error downloading file:",
                                            error
                                          );
                                          toast({
                                            title: "Download Failed",
                                            description:
                                              "Failed to download the file",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      Download File
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full sm:w-auto"
                                      onClick={async () => {
                                        try {
                                          const summaryText = source.summary;

                                          if (
                                            navigator.clipboard &&
                                            navigator.clipboard.writeText
                                          ) {
                                            await navigator.clipboard.writeText(
                                              summaryText
                                            );
                                            toast({
                                              title: "Summary Copied",
                                              description:
                                                "Summary has been copied to clipboard",
                                            });
                                          } else {
                                            const textArea =
                                              document.createElement(
                                                "textarea"
                                              );
                                            textArea.value = summaryText;
                                            document.body.appendChild(textArea);
                                            textArea.select();
                                            document.execCommand("copy");
                                            document.body.removeChild(textArea);

                                            toast({
                                              title: "Summary Copied",
                                              description:
                                                "Summary has been copied to clipboard (fallback method)",
                                            });
                                          }
                                        } catch (error) {
                                          console.error(
                                            "Error copying summary:",
                                            error
                                          );
                                          toast({
                                            title: "Copy Failed",
                                            description:
                                              "Failed to copy summary to clipboard",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      Copy Summary
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    Results for: "{lastSearchQuery}" ({searchResults.length}{" "}
                    found)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchResults.length > 10 ? (
                    // Use virtual scrolling for large result sets
                    <List
                      height={600}
                      itemCount={searchResults.length}
                      itemSize={400}
                      itemData={
                        {
                          results: searchResults,
                          expandedFileIds,
                          visibleFileIds,
                          toggleFileExpanded,
                          formatFileSize,
                          formatDate,
                        } as SearchResultItemData
                      }
                    >
                      {SearchResultItem as any}
                    </List>
                  ) : (
                    // Use regular rendering for small result sets
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <Card
                          key={result.file_id}
                          className="border-l-4 border-l-blue-500"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="flex-1">
                                <CardTitle className="text-lg">
                                  {result.filename}
                                </CardTitle>
                                <CardDescription>
                                  {formatFileSize(result.file_size)} • Uploaded{" "}
                                  {formatDate(result.upload_date)}
                                  {result.reference_date && (
                                    <>
                                      {" "}
                                      • Reference:{" "}
                                      {formatDate(result.reference_date)}
                                    </>
                                  )}
                                </CardDescription>
                              </div>
                              <div className="text-left sm:text-right">
                                <div className="text-sm font-medium">
                                  {result.similarity_score &&
                                  !isNaN(result.similarity_score)
                                    ? `${(
                                        result.similarity_score * 100
                                      ).toFixed(1)}% match`
                                    : "No score"}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="markdown text-sm mb-3 prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-bold mb-3 pb-1 border-b border-gray-300 dark:border-gray-600">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-semibold mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-semibold mb-2">
                                      {children}
                                    </h3>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-2 leading-relaxed">
                                      {children}
                                    </p>
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
                                    <li className="leading-relaxed">
                                      {children}
                                    </li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-gray-900 dark:text-gray-100">
                                      {children}
                                    </strong>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto mb-3">
                                      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-left font-semibold">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                                      {children}
                                    </td>
                                  ),
                                }}
                              >
                                {result.summary_text}
                              </ReactMarkdown>
                            </div>

                            {/* Original File Preview Section */}
                            <div data-file-id={result.file_id}>
                              <FilePreview
                                fileId={result.file_id}
                                filename={result.filename}
                                mimeType={result.mime_type}
                                isExpanded={expandedFileIds[result.file_id]}
                                onToggle={() =>
                                  toggleFileExpanded(result.file_id)
                                }
                                isVisible={visibleFileIds.has(result.file_id)}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {result.extracted_tags.industries.map(
                                (tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                )
                              )}
                              {result.extracted_tags.sectors.map(
                                (tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                )
                              )}
                              {result.extracted_tags.stock_names.map(
                                (tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                )
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <VectorFileUploader
              onUploadSuccess={() => {
                toast({
                  title: "Upload Complete",
                  description:
                    "Document has been processed and is now searchable",
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
