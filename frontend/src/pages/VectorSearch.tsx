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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import FilePreview from "../components/FilePreview";

interface SearchResult {
  file_id: string;
  summary_text: string;
  extracted_tags: {
    industries: string[];
    sectors: string[];
    stock_names: string[];
    general_tags: string[];
  };
  reference_date?: string;
  similarity_score: number;
  filename: string;
  upload_date: string;
  file_size: number;
  mime_type: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
  sources: {
    file_id: string;
    filename: string;
    similarity_score: number;
    summary: string;
    upload_date: string;
    file_size: number;
    mime_type: string;
    reference_date?: string;
  }[];
}

export default function VectorSearch() {
  const { session } = useSupabase();
  const { toast } = useToast();

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [questionAnswer, setQuestionAnswer] = useState<QuestionAnswer | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minScore, setMinScore] = useState(0.1);

  // Data state
  const [activeTab, setActiveTab] = useState<"search" | "upload">("search");
  const [expandedFileIds, setExpandedFileIds] = useState<
    Record<string, boolean>
  >({});

  // Load initial data
  useEffect(() => {
    // No initial data loading needed without tags
  }, [session]);

  const toggleFileExpanded = (id: string) => {
    setExpandedFileIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-expand file previews when new results are loaded
  const autoExpandFilePreviews = (results: any[]) => {
    const newExpandedIds: Record<string, boolean> = {};
    results.forEach((result) => {
      if (result.file_id) {
        newExpandedIds[result.file_id] = true;
      }
      if (result.sources) {
        result.sources.forEach((source: any) => {
          if (source.file_id) {
            newExpandedIds[source.file_id] = true;
          }
        });
      }
    });
    setExpandedFileIds((prev) => ({ ...prev, ...newExpandedIds }));
  };

  const handleAskQuestion = async () => {
    try {
      if (!searchQuery.trim()) {
        toast({
          title: "Input Error",
          description: "Please enter a question",
          variant: "destructive",
        });
        return;
      }

      if (!session) {
        toast({
          title: "Authentication Error",
          description: "Please log in to ask questions",
          variant: "destructive",
        });
        return;
      }

      console.log(`[VectorSearch Frontend] Asking question: "${searchQuery}"`);
      setIsSearching(true);
      setLastSearchQuery(searchQuery);

      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      if (!token) {
        throw new Error("No authentication token available");
      }

      console.log(
        `[VectorSearch Frontend] Using token:`,
        token ? "Token present" : "No token"
      );

      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/ask`;

      console.log(`[VectorSearch Frontend] Making request to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: searchQuery,
        }),
      });

      console.log(
        `[VectorSearch Frontend] Response status: ${response.status}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[VectorSearch Frontend] HTTP Error ${response.status}:`,
          errorText
        );
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`[VectorSearch Frontend] Response data:`, responseData);

      if (!responseData || typeof responseData !== "object") {
        throw new Error("Invalid response format from server");
      }

      if (responseData.success) {
        const newQuestionAnswer = {
          question: responseData.question,
          answer: responseData.answer,
          sources: responseData.sources || [],
        };
        setQuestionAnswer(newQuestionAnswer);
        setSearchResults([]); // Clear old search results

        // Auto-expand file previews for question answer sources
        if (responseData.sources && responseData.sources.length > 0) {
          autoExpandFilePreviews([{ sources: responseData.sources }]);
        }

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
      console.error("[VectorSearch Frontend] Question failed:", error);
      setQuestionAnswer(null);
      setSearchResults([]);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Question Error",
        description: `Failed to answer question: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSimpleSearch = async () => {
    try {
      if (!searchQuery.trim()) {
        toast({
          title: "Input Error",
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
        `[VectorSearch Frontend] Starting simple search for: "${searchQuery}"`
      );
      setIsSearching(true);
      setLastSearchQuery(searchQuery);

      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      if (!token) {
        throw new Error("No authentication token available");
      }

      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/simple-search`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      console.log(
        `[VectorSearch Frontend] Simple search response:`,
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
          `[VectorSearch Frontend] Simple search found ${results.length} results`
        );

        setSearchResults(results);

        // Auto-expand file previews for search results
        if (results.length > 0) {
          autoExpandFilePreviews(results);
        }

        toast({
          title: "Simple Search Complete",
          description: `Found ${responseData.data.total_results || 0} results`,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("[VectorSearch Frontend] Simple search failed:", error);
      setSearchResults([]);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Simple Search Error",
        description: `Failed to perform simple search: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDebugCheck = async () => {
    try {
      console.log(`[VectorSearch Frontend] Starting debug check`);
      setIsSearching(true);

      if (!session) {
        toast({
          title: "Authentication Error",
          description: "Please log in to perform debug check",
          variant: "destructive",
        });
        return;
      }

      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      if (!token) {
        throw new Error("No authentication token available");
      }

      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/debug`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`[VectorSearch Frontend] Debug response:`, responseData);

      if (!responseData || typeof responseData !== "object") {
        throw new Error("Invalid response format from server");
      }

      if (responseData.success && responseData.data) {
        const stats = responseData.data.database_stats;
        if (stats && typeof stats === "object") {
          toast({
            title: "Debug Check Complete (Global Access)",
            description: `DB: ${stats.total_raw_docs || 0} raw docs, ${
              stats.total_summaries || 0
            } summaries, ${stats.completed_docs || 0} completed, ${
              stats.completed_with_summaries || 0
            } with summaries`,
          });
        } else {
          throw new Error("Invalid database stats format");
        }
      } else {
        throw new Error(responseData.error || "Invalid debug response format");
      }
    } catch (error) {
      console.error("[VectorSearch Frontend] Debug check failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Debug Check Error",
        description: `Failed to perform debug check: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    try {
      setDateFrom("");
      setDateTo("");
      setMinScore(0.1);

      toast({
        title: "Filters Cleared",
        description: "All search filters have been reset",
      });
    } catch (error) {
      console.error("Error clearing filters:", error);
      toast({
        title: "Filter Clear Error",
        description: "Failed to clear filters",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    try {
      if (!bytes || isNaN(bytes) || bytes < 0) {
        console.warn(`[VectorSearch] Invalid file size: ${bytes}`);
        return "Unknown size";
      }
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    } catch (error) {
      console.error("Error formatting file size:", error);
      return "Unknown size";
    }
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    try {
      if (!dateString) return "Unknown date";

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`[VectorSearch] Invalid date: ${dateString}`);
        return "Invalid date";
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error(
        `[VectorSearch] Date formatting error:`,
        error,
        `Input: ${dateString}`
      );
      return "Invalid date";
    }
  };

  // console.log("upload_date raw value:", searchResults[0].raw_doc.upload_date);

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
          {/* <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload New Document</TabsTrigger>
          </TabsList> */}

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
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                    {/* <Button
                      onClick={handleSimpleSearch}
                      disabled={isSearching}
                      variant="outline"
                      className="w-full sm:w-auto px-4"
                    >
                      Simple Search
                    </Button> */}
                    {/* <Button
                      onClick={handleDebugCheck}
                      disabled={isSearching}
                      variant="outline"
                      className="w-full sm:w-auto px-4"
                    >
                      Debug
                    </Button> */}
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
                      onChange={(e) => setMinScore(parseFloat(e.target.value))}
                    />
                  </div>
                  {/* <div>
                    <label className="text-sm font-medium mb-2 block">
                      Date Range (Calendar)
                    </label>
                    <DatePicker
                      startDate={dateFrom}
                      endDate={dateTo}
                      onDateChange={(start, end) => {
                        setDateFrom(start);
                        setDateTo(end);
                      }}
                      placeholder="Select date range"
                    />
                  </div> */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
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
                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                          <span>
                                            {formatFileSize(source.file_size)}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <svg
                                              className="h-3 w-3 text-gray-400"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                              />
                                            </svg>
                                            <span>
                                              Uploaded:{" "}
                                              {formatDate(source.upload_date)}
                                            </span>
                                          </div>
                                          {source.reference_date && (
                                            <div className="flex items-center gap-1">
                                              <svg
                                                className="h-3 w-3 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                              </svg>
                                              <span>
                                                Reference:{" "}
                                                {formatDate(
                                                  source.reference_date
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </div>
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
                                  {/* Summary Section */}
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                      Summary:
                                    </h4>
                                    <div className="markdown bg-gray-50 dark:bg-[#010613] rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                      <ReactMarkdown
                                        remarkPlugins={[
                                          remarkGfm,
                                          remarkBreaks,
                                        ]}
                                        components={{
                                          h1: ({ children }) => (
                                            <h1 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                              {children}
                                            </h1>
                                          ),
                                          h2: ({ children }) => (
                                            <h2 className="text-xl font-semibold mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
                                              {children}
                                            </h2>
                                          ),
                                          h3: ({ children }) => (
                                            <h3 className="text-lg font-semibold mb-2">
                                              {children}
                                            </h3>
                                          ),
                                          p: ({ children }) => (
                                            <p className="mb-3 leading-relaxed">
                                              {children}
                                            </p>
                                          ),
                                          ul: ({ children }) => (
                                            <ul className="mb-4 ml-6 list-disc space-y-1">
                                              {children}
                                            </ul>
                                          ),
                                          ol: ({ children }) => (
                                            <ol className="mb-4 ml-6 list-decimal space-y-1">
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
                                            <div className="overflow-x-auto mb-4">
                                              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                                                {children}
                                              </table>
                                            </div>
                                          ),
                                          th: ({ children }) => (
                                            <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold">
                                              {children}
                                            </th>
                                          ),
                                          td: ({ children }) => (
                                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                              {children}
                                            </td>
                                          ),
                                        }}
                                      >
                                        {source.summary}
                                      </ReactMarkdown>
                                    </div>
                                  </div>

                                  {/* Original File Preview Section */}
                                  <FilePreview
                                    fileId={source.file_id}
                                    filename={source.filename}
                                    mimeType={source.mime_type}
                                    isExpanded={expandedFileIds[source.file_id]}
                                    onToggle={() =>
                                      toggleFileExpanded(source.file_id)
                                    }
                                  />

                                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t dark:border-gray-700">
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

            {/* Legacy Search Results (for Simple Search) */}
            {searchResults && searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    Results for: "{lastSearchQuery}" ({searchResults.length}{" "}
                    found)
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                                {result.filename || "Unknown filename"}
                              </CardTitle>
                              <CardDescription>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                  <span>
                                    {formatFileSize(result.file_size)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <svg
                                      className="h-3 w-3 text-gray-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span>
                                      Uploaded: {formatDate(result.upload_date)}
                                    </span>
                                  </div>
                                  {result.reference_date && (
                                    <div className="flex items-center gap-1">
                                      <svg
                                        className="h-3 w-3 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                      <span>
                                        Reference:{" "}
                                        {formatDate(result.reference_date)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardDescription>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="text-sm font-medium">
                                {result.similarity_score &&
                                !isNaN(result.similarity_score)
                                  ? `${(result.similarity_score * 100).toFixed(
                                      1
                                    )}% match`
                                  : "No score"}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Summary Section */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Summary:
                            </h4>
                            <div className="markdown bg-gray-50 dark:bg-[#010613] rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                  h1: ({ children }) => (
                                    <h1 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-xl font-semibold mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-lg font-semibold mb-2">
                                      {children}
                                    </h3>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-3 leading-relaxed">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="mb-4 ml-6 list-disc space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="mb-4 ml-6 list-decimal space-y-1">
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
                                    <div className="overflow-x-auto mb-4">
                                      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                                      {children}
                                    </td>
                                  ),
                                }}
                              >
                                {result.summary_text || "No summary available"}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Original File Preview Section */}
                          <FilePreview
                            fileId={result.file_id}
                            filename={result.filename}
                            mimeType={result.mime_type}
                            isExpanded={expandedFileIds[result.file_id]}
                            onToggle={() => toggleFileExpanded(result.file_id)}
                          />

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700">
                            <button
                              onClick={() => {
                                const summaryText =
                                  result.summary_text || "No summary available";
                                navigator.clipboard.writeText(summaryText);
                                toast({
                                  title: "Summary Copied",
                                  description:
                                    "Summary has been copied to clipboard",
                                });
                              }}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-500 dark:hover:bg-gray-600 hover:bg-gray-200 text-gray-950 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Document for Vector Search</CardTitle>
                <CardDescription>
                  Upload a new document to be processed with AI summarization
                  and vector search (Available to all users)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VectorFileUploader
                  onUploadSuccess={() => {
                    toast({
                      title: "Upload Complete",
                      description:
                        "Document has been processed and is now searchable",
                    });
                  }}
                  onUploadError={(error) => {
                    try {
                      console.error("Upload failed:", error);
                      const errorMessage =
                        error && typeof error === "object" && "message" in error
                          ? (error as Error).message
                          : "Unknown upload error";
                      toast({
                        title: "Upload Failed",
                        description: `Failed to upload document: ${errorMessage}`,
                        variant: "destructive",
                      });
                    } catch (callbackError) {
                      console.error(
                        "Error in upload error callback:",
                        callbackError
                      );
                      toast({
                        title: "Upload Failed",
                        description: "Failed to upload document",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
