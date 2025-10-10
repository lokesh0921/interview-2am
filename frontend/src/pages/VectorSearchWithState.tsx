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
import { ChevronDown, ChevronRight } from "lucide-react";
import { useVectorSearchState } from "../contexts/AppStateContext";
import {
  useNavigationState,
  useScrollRestoration,
} from "../hooks/useNavigationState";

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
  }[];
}

interface AvailableTags {
  industries: string[];
  sectors: string[];
  stock_names: string[];
  general_tags: string[];
}

export default function VectorSearchWithState() {
  const { session } = useSupabase();
  const { toast } = useToast();

  // Use global state
  const { vectorSearchState, updateVectorSearch } = useVectorSearchState();

  // Navigation and scroll restoration
  useNavigationState();
  useScrollRestoration();

  // Local state for data that doesn't need persistence
  const [availableTags, setAvailableTags] = useState<AvailableTags>({
    industries: [],
    sectors: [],
    stock_names: [],
    general_tags: [],
  });
  const [activeTab, setActiveTab] = useState<"search" | "upload">("search");
  const [isSearching, setIsSearching] = useState(false);

  // Destructure global state for easier access
  const {
    searchQuery,
    selectedIndustries,
    selectedSectors,
    selectedStockNames,
    dateFrom,
    dateTo,
    minScore,
    tagSectionVisibility,
    questionAnswer,
    searchResults,
    lastSearchQuery,
  } = vectorSearchState;

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
    if (session) {
      try {
        loadAvailableTags();
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          title: "Error",
          description: "Failed to load initial data",
          variant: "destructive",
        });
      }
    }
  }, [session, toast]);

  const loadAvailableTags = async () => {
    try {
      const token =
        session?.access_token || localStorage.getItem("sb:token") || "";
      const apiUrl = `${
        import.meta.env.VITE_API_BASE || "http://localhost:4001/api"
      }/vector-search/tags`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAvailableTags(data.data);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error loading available tags:", error);
      toast({
        title: "Error",
        description: "Failed to load available tags",
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
      toast({
        title: "Question Error",
        description: `Failed to answer question: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle tag section visibility
  const toggleTagSection = (
    section: "industries" | "sectors" | "companies"
  ) => {
    updateVectorSearch({
      tagSectionVisibility: {
        ...tagSectionVisibility,
        [section]: !tagSectionVisibility[section],
      },
    });
  };

  // Toggle all sections
  const toggleAllSections = () => {
    const allExpanded = Object.values(tagSectionVisibility).every(Boolean);
    updateVectorSearch({
      tagSectionVisibility: {
        industries: !allExpanded,
        sectors: !allExpanded,
        companies: !allExpanded,
      },
    });
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
        industries: (prev: string[]) => {
          const newIndustries = prev.includes(tag)
            ? prev.filter((t) => t !== tag)
            : [...prev, tag];
          updateVectorSearch({ selectedIndustries: newIndustries });
          return newIndustries;
        },
        sectors: (prev: string[]) => {
          const newSectors = prev.includes(tag)
            ? prev.filter((t) => t !== tag)
            : [...prev, tag];
          updateVectorSearch({ selectedSectors: newSectors });
          return newSectors;
        },
        stock_names: (prev: string[]) => {
          const newStockNames = prev.includes(tag)
            ? prev.filter((t) => t !== tag)
            : [...prev, tag];
          updateVectorSearch({ selectedStockNames: newStockNames });
          return newStockNames;
        },
      };

      const currentValues = {
        industries: selectedIndustries,
        sectors: selectedSectors,
        stock_names: selectedStockNames,
      };

      setters[type](currentValues[type]);
    } catch (error) {
      console.error("Error toggling tag:", error);
      toast({
        title: "Error",
        description: "Failed to toggle tag",
        variant: "destructive",
      });
    }
  };

  const clearAllFilters = () => {
    updateVectorSearch({
      selectedIndustries: [],
      selectedSectors: [],
      selectedStockNames: [],
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
    // Implementation for simple search
    toast({
      title: "Feature Coming Soon",
      description: "Simple search functionality will be available soon",
    });
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

                {/* Tag Filters */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Expand/Collapse All Button */}
                  {(availableTags.industries.length > 0 ||
                    availableTags.sectors.length > 0 ||
                    availableTags.stock_names.length > 0) && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Filter by Tags
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAllSections}
                        className="text-xs w-full sm:w-auto "
                      >
                        {Object.values(tagSectionVisibility).every(Boolean)
                          ? "Collapse All"
                          : "Expand All"}
                      </Button>
                    </div>
                  )}

                  {/* Industries Section */}
                  {availableTags.industries.length > 0 && (
                    <div className="border rounded-lg mb-4">
                      <button
                        onClick={() => toggleTagSection("industries")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTagSection("industries");
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
                        aria-expanded={tagSectionVisibility.industries}
                        aria-controls="industries-tags"
                      >
                        <div className="flex items-center gap-2">
                          {tagSectionVisibility.industries ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                          )}
                          <span className="font-medium text-sm">
                            Industries ({availableTags.industries.length})
                            {selectedIndustries.length > 0 &&
                              !tagSectionVisibility.industries && (
                                <span className="ml-2 text-blue-600 dark:text-blue-400">
                                  • {selectedIndustries.length} selected
                                </span>
                              )}
                          </span>
                        </div>
                        {selectedIndustries.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            {selectedIndustries.length} selected
                          </span>
                        )}
                      </button>
                      <div
                        id="industries-tags"
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          tagSectionVisibility.industries
                            ? "max-h-[800px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="p-3 pt-0 pb-4">
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
                                className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105 min-h-[32px] touch-manipulation"
                              >
                                {industry}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sectors Section */}
                  {availableTags.sectors.length > 0 && (
                    <div className="border rounded-lg mb-4">
                      <button
                        onClick={() => toggleTagSection("sectors")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTagSection("sectors");
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-lg"
                        aria-expanded={tagSectionVisibility.sectors}
                        aria-controls="sectors-tags"
                      >
                        <div className="flex items-center gap-2">
                          {tagSectionVisibility.sectors ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                          )}
                          <span className="font-medium text-sm">
                            Sectors ({availableTags.sectors.length})
                            {selectedSectors.length > 0 &&
                              !tagSectionVisibility.sectors && (
                                <span className="ml-2 text-green-600 dark:text-green-400">
                                  • {selectedSectors.length} selected
                                </span>
                              )}
                          </span>
                        </div>
                        {selectedSectors.length > 0 && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                            {selectedSectors.length} selected
                          </span>
                        )}
                      </button>
                      <div
                        id="sectors-tags"
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          tagSectionVisibility.sectors
                            ? "max-h-[800px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="p-3 pt-0 pb-4">
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
                                onClick={() =>
                                  handleTagToggle(sector, "sectors")
                                }
                                className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105 min-h-[32px] touch-manipulation"
                              >
                                {sector}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Companies Section */}
                  {availableTags.stock_names.length > 0 && (
                    <div className="border rounded-lg mb-4">
                      <button
                        onClick={() => toggleTagSection("companies")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleTagSection("companies");
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded-lg"
                        aria-expanded={tagSectionVisibility.companies}
                        aria-controls="companies-tags"
                      >
                        <div className="flex items-center gap-2">
                          {tagSectionVisibility.companies ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                          )}
                          <span className="font-medium text-sm">
                            Companies ({availableTags.stock_names.length})
                            {selectedStockNames.length > 0 &&
                              !tagSectionVisibility.companies && (
                                <span className="ml-2 text-purple-600 dark:text-purple-400">
                                  • {selectedStockNames.length} selected
                                </span>
                              )}
                          </span>
                        </div>
                        {selectedStockNames.length > 0 && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                            {selectedStockNames.length} selected
                          </span>
                        )}
                      </button>
                      <div
                        id="companies-tags"
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          tagSectionVisibility.companies
                            ? "max-h-[800px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="p-3 pt-0 pb-4">
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
                                className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105 min-h-[32px] touch-manipulation"
                              >
                                {stock}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                      <p className="text-green-800 dark:text-green-200 whitespace-pre-wrap">
                        {questionAnswer.answer}
                      </p>
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
                                  <p className="text-sm mb-3">
                                    {source.summary}
                                  </p>

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
                                {result.reference_date &&
                                  ` • Reference: ${formatDate(
                                    result.reference_date
                                  )}`}
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
                          <p className="text-sm mb-3">{result.summary_text}</p>
                          <div className="flex flex-wrap gap-2">
                            {result.extracted_tags.industries.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {result.extracted_tags.sectors.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {result.extracted_tags.stock_names.map((tag) => (
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <VectorFileUploader onUploadSuccess={loadAvailableTags} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
