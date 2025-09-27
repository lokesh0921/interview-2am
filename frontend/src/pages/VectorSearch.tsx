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
      loadAvailableTags();
      loadDocumentStats();
    }
  }, [session]);

  const loadAvailableTags = async () => {
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";
      console.log(
        "Loading tags with token:",
        token ? "Token present" : "No token"
      );
      console.log("Session:", session ? "Session present" : "No session");

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
        }/vector-search/tags`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setAvailableTags(data.data);
    } catch (error) {
      console.error("Failed to load tags:", error);
      toast({
        title: "Error",
        description: "Failed to load available tags",
        variant: "destructive",
      });
    }
  };

  const loadDocumentStats = async () => {
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
        }/vector-search/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setDocumentStats(data.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    console.log(
      `[VectorSearch Frontend] Starting search for: "${searchQuery}"`
    );
    setIsSearching(true);
    setLastSearchQuery(searchQuery);

    try {
      const searchOptions = {
        limit: 20,
        minScore,
        industries: selectedIndustries,
        sectors: selectedSectors,
        stockNames: selectedStockNames,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        includeMetadata: true,
      };

      console.log(`[VectorSearch Frontend] Search options:`, searchOptions);

      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";
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
      console.log(
        `[VectorSearch Frontend] Response headers:`,
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[VectorSearch Frontend] HTTP Error ${response.status}:`,
          errorText
        );
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData: SearchResponse = await response.json();
      console.log(`[VectorSearch Frontend] Response data:`, responseData);

      if (responseData.success && responseData.data) {
        const results = responseData.data.results || [];
        console.log(
          `[VectorSearch Frontend] Set ${results.length} search results`
        );
        if (results.length > 0) {
          console.log(
            `[VectorSearch Frontend] Sample result structure:`,
            results[0]
          );
        }
        setSearchResults(results);

        toast({
          title: "Search Complete",
          description: `Found ${responseData.data.total_results || 0} results`,
        });
      } else {
        console.error(
          `[VectorSearch Frontend] Invalid response format:`,
          responseData
        );
        setSearchResults([]);
        toast({
          title: "Search Error",
          description: "Invalid response from server",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[VectorSearch Frontend] Search failed:", error);
      setSearchResults([]); // Ensure searchResults is always an array
      toast({
        title: "Search Error",
        description: "Failed to perform search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSimpleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    console.log(
      `[VectorSearch Frontend] Starting simple search for: "${searchQuery}"`
    );
    setIsSearching(true);
    setLastSearchQuery(searchQuery);

    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
        }/vector-search/simple-search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json();
      console.log(
        `[VectorSearch Frontend] Simple search response:`,
        responseData
      );

      if (responseData.success && responseData.data) {
        const results = responseData.data.results || [];
        console.log(
          `[VectorSearch Frontend] Simple search found ${results.length} results`
        );
        if (results.length > 0) {
          console.log(
            `[VectorSearch Frontend] Sample simple search result:`,
            results[0]
          );
        }
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
      toast({
        title: "Simple Search Error",
        description: "Failed to perform simple search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDebugCheck = async () => {
    console.log(`[VectorSearch Frontend] Starting debug check`);
    setIsSearching(true);

    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
        }/vector-search/debug`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json();
      console.log(`[VectorSearch Frontend] Debug response:`, responseData);

      if (responseData.success && responseData.data) {
        const stats = responseData.data.database_stats;
        toast({
          title: "Debug Check Complete (Global Access)",
          description: `DB: ${stats.total_raw_docs} raw docs, ${stats.total_summaries} summaries, ${stats.completed_docs} completed, ${stats.completed_with_summaries} with summaries`,
        });
      } else {
        throw new Error("Invalid debug response format");
      }
    } catch (error) {
      console.error("[VectorSearch Frontend] Debug check failed:", error);
      toast({
        title: "Debug Check Error",
        description: "Failed to perform debug check",
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
    const setters = {
      industries: setSelectedIndustries,
      sectors: setSelectedSectors,
      stock_names: setSelectedStockNames,
    };

    const currentValues = {
      industries: selectedIndustries,
      sectors: selectedSectors,
      stock_names: selectedStockNames,
    };

    const setter = setters[type];
    const current = currentValues[type];

    if (current.includes(tag)) {
      setter(current.filter((t) => t !== tag));
    } else {
      setter([...current, tag]);
    }
  };

  const clearFilters = () => {
    setSelectedIndustries([]);
    setSelectedSectors([]);
    setSelectedStockNames([]);
    setDateFrom("");
    setDateTo("");
    setMinScore(0.1);
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes || isNaN(bytes) || bytes < 0) {
      console.warn(`[VectorSearch] Invalid file size: ${bytes}`);
      return "Unknown size";
    }
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`[VectorSearch] Invalid date: ${dateString}`);
        return "Invalid date";
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.warn(
        `[VectorSearch] Date formatting error:`,
        error,
        `Input: ${dateString}`
      );
      return "Invalid date";
    }
  };

  // console.log("upload_date raw value:", searchResults[0].raw_doc.upload_date);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vector Search</h1>
        <p className="text-muted-foreground">
          Semantic search across all documents with AI-powered summarization and
          tagging (Global Access)
        </p>

        {documentStats && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <CardTitle className="text-sm font-medium">Processed</CardTitle>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload New Document</TabsTrigger>
        </TabsList>

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
                          onClick={() => handleTagToggle(stock, "stock_names")}
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
                  Results for: "{lastSearchQuery}" ({searchResults?.length || 0}{" "}
                  found)
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
                                  ? `${(result.similarity_score * 100).toFixed(
                                      1
                                    )}% match`
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
                            {result.extracted_tags?.stock_names?.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                            <Button size="sm" variant="outline">
                              Download
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
                Upload a new document to be processed with AI summarization and
                vector search (Available to all users)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VectorFileUploader
                onUploadSuccess={() => {
                  // Refresh available tags and stats after successful upload
                  loadAvailableTags();
                  loadDocumentStats();
                  toast({
                    title: "Upload Complete",
                    description:
                      "Document has been processed and is now searchable",
                  });
                }}
                onUploadError={(error) => {
                  console.error("Upload failed:", error);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
