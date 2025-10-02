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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import VectorFileUploader from "../components/VectorFileUploader";
import Header from "@/components/Header";

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

interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    results: SearchResult[];
    total_results: number;
    search_options: any;
  };
}

interface AvailableTags {
  industries: string[];
  sectors: string[];
  stock_names: string[];
  general_tags: string[];
}

interface DocumentStats {
  total_documents: number;
  processed_documents: number;
  processing_status: Record<string, number>;
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
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Filter state
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedStockNames, setSelectedStockNames] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minScore, setMinScore] = useState(0.1);

  // Data state
  const [availableTags, setAvailableTags] = useState<AvailableTags>({
    industries: [],
    sectors: [],
    stock_names: [],
    general_tags: [],
  });
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"search" | "upload">("search");

  // Load initial data
  useEffect(() => {
    if (session) {
      try {
        loadAvailableTags();
        loadDocumentStats();
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          title: "Loading Error",
          description: "Failed to load initial data. Please refresh the page.",
          variant: "destructive",
        });
      }
    }
  }, [session]);

  const loadAvailableTags = async () => {
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      if (!token) {
        throw new Error("No authentication token available");
      }

      console.log(
        "Loading tags with token:",
        token ? "Token present" : "No token"
      );
      console.log("Session:", session ? "Session present" : "No session");

      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/tags`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data || !data.data) {
        throw new Error("Invalid response format from server");
      }

      setAvailableTags(data.data);
    } catch (error) {
      console.error("Failed to load tags:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Loading Error",
        description: `Failed to load available tags: ${errorMessage}`,
        variant: "destructive",
      });
      // Set empty tags as fallback
      setAvailableTags({
        industries: [],
        sectors: [],
        stock_names: [],
        general_tags: [],
      });
    }
  };

  const loadDocumentStats = async () => {
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      if (!token) {
        throw new Error("No authentication token available");
      }

      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/stats`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data || !data.data) {
        throw new Error("Invalid response format from server");
      }

      setDocumentStats(data.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Loading Error",
        description: `Failed to load document statistics: ${errorMessage}`,
        variant: "destructive",
      });
      // Set fallback stats
      setDocumentStats({
        total_documents: 0,
        processed_documents: 0,
        processing_status: {},
      });
    }
  };

  const handleSearch = async () => {
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
        `[VectorSearch Frontend] Starting search for: "${searchQuery}"`
      );
      setIsSearching(true);
      setLastSearchQuery(searchQuery);

      const searchOptions = {
        limit: 20,
        minScore: isNaN(minScore) ? 0.1 : minScore,
        industries: Array.isArray(selectedIndustries) ? selectedIndustries : [],
        sectors: Array.isArray(selectedSectors) ? selectedSectors : [],
        stockNames: Array.isArray(selectedStockNames) ? selectedStockNames : [],
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        includeMetadata: true,
      };

      console.log(`[VectorSearch Frontend] Search options:`, searchOptions);

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
      }/vector-search/search`;

      console.log(`[VectorSearch Frontend] Making request to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          options: searchOptions,
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

      const responseData: SearchResponse = await response.json();
      console.log(`[VectorSearch Frontend] Response data:`, responseData);

      if (!responseData || typeof responseData !== "object") {
        throw new Error("Invalid response format from server");
      }

      if (responseData.success && responseData.data) {
        const results = Array.isArray(responseData.data.results)
          ? responseData.data.results
          : [];
        console.log(
          `[VectorSearch Frontend] Set ${results.length} search results`
        );

        setSearchResults(results);

        toast({
          title: "Search Complete",
          description: `Found ${responseData.data.total_results || 0} results`,
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("[VectorSearch Frontend] Search failed:", error);
      setSearchResults([]); // Ensure searchResults is always an array
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Search Error",
        description: `Failed to perform search: ${errorMessage}`,
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

  const handleTagToggle = (
    tag: string,
    type: "industries" | "sectors" | "stock_names"
  ) => {
    try {
      if (!tag || typeof tag !== "string") {
        toast({
          title: "Input Error",
          description: "Invalid tag provided",
          variant: "destructive",
        });
        return;
      }

      const setters = {
        industries: setSelectedIndustries,
        sectors: setSelectedSectors,
        stock_names: setSelectedStockNames,
      };

      const currentValues = {
        industries: Array.isArray(selectedIndustries) ? selectedIndustries : [],
        sectors: Array.isArray(selectedSectors) ? selectedSectors : [],
        stock_names: Array.isArray(selectedStockNames)
          ? selectedStockNames
          : [],
      };

      const setter = setters[type];
      const current = currentValues[type];

      if (!setter || !Array.isArray(current)) {
        toast({
          title: "State Error",
          description: "Invalid state configuration",
          variant: "destructive",
        });
        return;
      }

      if (current.includes(tag)) {
        setter(current.filter((t) => t !== tag));
      } else {
        setter([...current, tag]);
      }
    } catch (error) {
      console.error("Error toggling tag:", error);
      toast({
        title: "Tag Toggle Error",
        description: "Failed to toggle tag selection",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    try {
      setSelectedIndustries([]);
      setSelectedSectors([]);
      setSelectedStockNames([]);
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
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vector Search</h1>
          <p className="text-gray-600 dark:text-white">
            Semantic search across all documents with AI-powered summarization
            and tagging (Global Access)
          </p>

          {documentStats && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 ">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {documentStats.total_documents}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Processed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {documentStats.processed_documents}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Processing Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {documentStats.total_documents > 0
                      ? Math.round(
                          (documentStats.processed_documents /
                            documentStats.total_documents) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "search" | "upload")}
        >
          {/* <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload New Document</TabsTrigger>
          </TabsList> */}

          <TabsContent value="search" className="space-y-6">
            {/* Search Interface */}
            <Card>
              <CardHeader>
                <CardTitle>Semantic Search</CardTitle>
                <CardDescription>
                  Search all documents using natural language queries (Global
                  Access)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-8"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                  <Button
                    onClick={handleSimpleSearch}
                    disabled={isSearching}
                    variant="outline"
                    className="px-4"
                  >
                    Simple Search
                  </Button>
                  <Button
                    onClick={handleDebugCheck}
                    disabled={isSearching}
                    variant="outline"
                    className="px-4"
                  >
                    Debug
                  </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Date From
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Date To
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Tag Filters */}
                <div className="space-y-4">
                  {availableTags.industries.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Industries
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.industries.map((industry) => (
                          <Button
                            key={industry}
                            variant={
                              selectedIndustries.includes(industry)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handleTagToggle(industry, "industries")
                            }
                          >
                            {industry}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTags.sectors.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Sectors
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.sectors.map((sector) => (
                          <Button
                            key={sector}
                            variant={
                              selectedSectors.includes(sector)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handleTagToggle(sector, "sectors")}
                          >
                            {sector}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTags.stock_names.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Companies
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.stock_names.map((stock) => (
                          <Button
                            key={stock}
                            variant={
                              selectedStockNames.includes(stock)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handleTagToggle(stock, "stock_names")
                            }
                          >
                            {stock}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {lastSearchQuery && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    Results for: "{lastSearchQuery}" (
                    {searchResults?.length || 0} found)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!searchResults || searchResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No results found. Try adjusting your search query or
                      filters.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <Card
                          key={result.file_id}
                          className="border-l-4 border-l-blue-500"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">
                                  {result.filename || "Unknown filename"}
                                </CardTitle>
                                <CardDescription>
                                  {formatFileSize(result.file_size)} • Uploaded{" "}
                                  {formatDate(result.upload_date)}
                                  {result.reference_date &&
                                    ` • Reference: ${formatDate(
                                      result.reference_date
                                    )}`}
                                </CardDescription>
                              </div>
                              <div className="text-right">
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
                            <p className="text-sm mb-3">
                              {result.summary_text || "No summary available"}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {result.extracted_tags?.industries?.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {result.extracted_tags?.sectors?.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {result.extracted_tags?.stock_names?.map(
                                (tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                )
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const summaryText =
                                      result.summary_text ||
                                      "No summary available";

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
                                      // Fallback for older browsers
                                      const textArea =
                                        document.createElement("textarea");
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
                  )}
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
                    try {
                      // Refresh available tags and stats after successful upload
                      loadAvailableTags();
                      loadDocumentStats();
                      toast({
                        title: "Upload Complete",
                        description:
                          "Document has been processed and is now searchable",
                      });
                    } catch (error) {
                      console.error("Error in upload success callback:", error);
                      toast({
                        title: "Upload Complete",
                        description:
                          "Document uploaded but failed to refresh data",
                        variant: "destructive",
                      });
                    }
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
