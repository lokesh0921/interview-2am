import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";
import Header from "@/components/Header";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { SummaryItemSkeleton } from "../components/ui/skeleton";
import { toast } from "../hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import ConfirmationDialog from "../components/ui/confirmation-dialog";
import { Trash2, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

// Local storage cache keys for non-search summary list hydration
const SUMMARY_CACHE_ITEMS_KEY = "summary-cache-items";
const SUMMARY_CACHE_PAGE_KEY = "summary-cache-current-page";
const SUMMARY_CACHE_HAS_MORE_KEY = "summary-cache-has-more";
const SUMMARY_CACHE_TOTAL_KEY = "summary-cache-total-items";
const SUMMARY_CACHE_TIMESTAMP_KEY = "summary-cache-timestamp";

interface FileItem {
  _id: string;
  filename: string;
  sourceType: string;
  categories: string[];
  summary: string;
  text?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface SearchResult {
  _id: string;
  file_id: string;
  filename: string;
  summary_text: string;
  comprehensive_summary?: string;
  extracted_tags: {
    industries: string[];
    sectors: string[];
    stock_names: string[];
    general_tags: string[];
  };
  reference_date?: string;
  summary_date: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  score?: number;
}

interface ApiResponse {
  success: boolean;
  items: FileItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export default function Summary() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [whatCopied, setWhatCopied] = useState("summary");
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    item: FileItem | null;
  }>({ isOpen: false, item: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRawIds, setExpandedRawIds] = useState<Record<string, boolean>>(
    {}
  );

  // Search functionality with state persistence
  const [searchQuery, setSearchQuery] = useState(() => {
    const saved = localStorage.getItem("summary-search-query");
    return saved || "";
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>(() => {
    const saved = localStorage.getItem("summary-search-results");
    return saved ? JSON.parse(saved) : [];
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(() => {
    const saved = localStorage.getItem("summary-search-mode");
    return saved === "true";
  });
  const [searchPage, setSearchPage] = useState(() => {
    const saved = localStorage.getItem("summary-search-page");
    return saved ? parseInt(saved) : 1;
  });
  const [searchHasMore, setSearchHasMore] = useState(() => {
    const saved = localStorage.getItem("summary-search-has-more");
    return saved === "true";
  });
  const [searchTotal, setSearchTotal] = useState(() => {
    const saved = localStorage.getItem("summary-search-total");
    return saved ? parseInt(saved) : 0;
  });
  const [searchType, setSearchType] = useState<"tags" | "text">(() => {
    const saved = localStorage.getItem("summary-search-type");
    return (saved as "tags" | "text") || "tags";
  });

  // Search function
  const handleSearch = useCallback(
    async (query: string, page: number = 1, isInitial = false) => {
      if (!query.trim()) {
        setSearchMode(false);
        setSearchResults([]);
        return;
      }

      try {
        if (isInitial) {
          setIsSearching(true);
          setSearchPage(1);
          setSearchResults([]);
        }

        const token = import.meta.env.DEV ? "dev-test-token" : undefined;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await apiFetch(
          `/vector-search/search-summaries?q=${encodeURIComponent(
            query
          )}&page=${page}&limit=20&type=${searchType}`,
          { headers: headers as Record<string, string> }
        );

        if (response.success) {
          const newResults = response.items || [];

          if (isInitial) {
            setSearchResults(newResults);
          } else {
            setSearchResults((prev) => [...prev, ...newResults]);
          }

          setSearchTotal(response.total || 0);
          setSearchHasMore(response.hasMore || false);
          setSearchPage(page);
          setSearchMode(true);
        } else {
          throw new Error(response.error || "Search failed");
        }
      } catch (error) {
        console.error("Search error:", error);
        toast({
          title: "Search Error",
          description: "Failed to search summaries. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    },
    [searchType, toast]
  );

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchMode(false);
    setSearchPage(1);
    setSearchHasMore(true);
    setSearchTotal(0);
    // Clear localStorage
    localStorage.removeItem("summary-search-query");
    localStorage.removeItem("summary-search-results");
    localStorage.removeItem("summary-search-mode");
    localStorage.removeItem("summary-search-page");
    localStorage.removeItem("summary-search-has-more");
    localStorage.removeItem("summary-search-total");
  };

  // Save search state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("summary-search-query", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem(
      "summary-search-results",
      JSON.stringify(searchResults)
    );
  }, [searchResults]);

  useEffect(() => {
    localStorage.setItem("summary-search-mode", searchMode.toString());
  }, [searchMode]);

  useEffect(() => {
    localStorage.setItem("summary-search-page", searchPage.toString());
  }, [searchPage]);

  useEffect(() => {
    localStorage.setItem("summary-search-has-more", searchHasMore.toString());
  }, [searchHasMore]);

  useEffect(() => {
    localStorage.setItem("summary-search-total", searchTotal.toString());
  }, [searchTotal]);

  useEffect(() => {
    localStorage.setItem("summary-search-type", searchType);
  }, [searchType]);

  const loadItems = useCallback(async (page: number, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }

      console.log(
        `[Summary] Loading page ${page} from vector search database...`
      );

      // Use test token for development
      const token = import.meta.env.DEV ? "dev-test-token" : undefined;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response: ApiResponse = await apiFetch(
        `/vector-search/all-documents?page=${page}&limit=5`,
        { headers: headers as Record<string, string> }
      );
      console.log("[Summary] API response:", response);

      if (response.success && response.items) {
        if (isInitial) {
          setItems(response.items);
        } else {
          setItems((prevItems) => [...prevItems, ...response.items]);
        }

        setHasMore(response.hasMore);
        setTotalItems(response.total);
        setCurrentPage(page);

        console.log(
          `[Summary] Updated state - hasMore: ${response.hasMore}, items.length: ${response.items.length}, total: ${response.total}`
        );

        console.log(
          `[Summary] Loaded ${response.items.length} items for page ${page}`
        );
        console.log(
          `[Summary] Total items: ${response.total}, Has more: ${response.hasMore}`
        );
      } else {
        console.error("[Summary] Invalid response format:", response);
        if (isInitial) {
          setItems([]);
        }
        setError("Failed to load documents");
      }
    } catch (error) {
      console.error("[Summary] Error loading items:", error);
      if (isInitial) {
        setItems([]);
      }
      setError(
        error instanceof Error ? error.message : "Failed to load documents"
      );
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMoreItems = useCallback(async () => {
    if (searchMode) {
      // Handle search results pagination
      if (!searchHasMore || isSearching) return;
      await handleSearch(searchQuery, searchPage + 1, false);
    } else {
      // Handle regular items pagination
      console.log(
        "[Summary] fetchMoreItems called - hasMore:",
        hasMore,
        "currentPage:",
        currentPage
      );
      if (!hasMore) {
        console.log("[Summary] No more items to fetch, returning early");
        return;
      }
      console.log("[Summary] Fetching page:", currentPage + 1);
      await loadItems(currentPage + 1, false);
    }
  }, [
    currentPage,
    hasMore,
    loadItems,
    searchMode,
    searchHasMore,
    isSearching,
    handleSearch,
    searchQuery,
    searchPage,
  ]);

  const { isFetching = false, lastElementRef } = useInfiniteScroll(
    fetchMoreItems,
    searchMode ? searchHasMore : hasMore,
    { rootMargin: "200px" }
  );

  useEffect(() => {
    console.log("[Summary] Component mounted, loading initial items...");

    // Check if we have saved search state
    const savedQuery = localStorage.getItem("summary-search-query");
    const savedResults = localStorage.getItem("summary-search-results");
    const savedMode = localStorage.getItem("summary-search-mode");

    if (savedQuery && savedResults && savedMode === "true") {
      // We have saved search state, don't load regular items
      console.log("[Summary] Restoring saved search state");
      toast({
        title: "Search State Restored",
        description: `Restored search for "${savedQuery}" with ${
          JSON.parse(savedResults).length
        } results`,
      });
      // Ensure we don't show skeleton when restoring search state
      setLoading(false);
      return;
    }

    // Try hydrating list from local storage cache to avoid skeleton on revisit
    try {
      const cachedItemsRaw = localStorage.getItem(SUMMARY_CACHE_ITEMS_KEY);
      const cachedPageRaw = localStorage.getItem(SUMMARY_CACHE_PAGE_KEY);
      const cachedHasMoreRaw = localStorage.getItem(SUMMARY_CACHE_HAS_MORE_KEY);
      const cachedTotalRaw = localStorage.getItem(SUMMARY_CACHE_TOTAL_KEY);

      if (cachedItemsRaw) {
        const cachedItems: FileItem[] = JSON.parse(cachedItemsRaw);
        const cachedPage = cachedPageRaw ? parseInt(cachedPageRaw) : 1;
        const cachedHasMore = cachedHasMoreRaw === "true";
        const cachedTotal = cachedTotalRaw ? parseInt(cachedTotalRaw) : 0;

        if (Array.isArray(cachedItems) && cachedItems.length > 0) {
          console.log("[Summary] Hydrating from cache", {
            cachedLen: cachedItems.length,
            cachedPage,
            cachedHasMore,
            cachedTotal,
          });
          setItems(cachedItems);
          setCurrentPage(cachedPage);
          setHasMore(cachedHasMore);
          setTotalItems(cachedTotal);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("[Summary] Failed to hydrate from cache", e);
    }

    // No saved search state and no cache, load regular items
    loadItems(1, true);
  }, [loadItems]);

  // Persist list cache whenever list state changes (non-search)
  useEffect(() => {
    if (!searchMode) {
      try {
        localStorage.setItem(SUMMARY_CACHE_ITEMS_KEY, JSON.stringify(items));
        localStorage.setItem(SUMMARY_CACHE_PAGE_KEY, String(currentPage));
        localStorage.setItem(SUMMARY_CACHE_HAS_MORE_KEY, String(hasMore));
        localStorage.setItem(SUMMARY_CACHE_TOTAL_KEY, String(totalItems));
        localStorage.setItem(SUMMARY_CACHE_TIMESTAMP_KEY, String(Date.now()));
      } catch (e) {
        console.warn("[Summary] Failed to persist cache", e);
      }
    }
  }, [items, currentPage, hasMore, totalItems, searchMode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (whatCopied === "summary") {
      toast({
        title: "Summary Copied",
        description: "Summary has been copied to clipboard",
      });
    } else {
      toast({
        title: "Raw Copied",
        description: "Raw has been copied to clipboard",
      });
    }
    // Could add a toast notification here
  };

  // Lightweight formatter to make raw text more readable in Markdown:
  // - Promote obvious section titles (lines ending with ':' or ALL CAPS) to ### headings
  // - Ensure a blank line between paragraphs
  const formatRawAsMarkdown = (raw: string | undefined): string => {
    if (!raw) return "";
    const lines = raw.split(/\r?\n/);
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return ""; // keep blank line for paragraph spacing
      const isAllCaps = /^(?:[A-Z0-9&\-/\s]{3,})$/.test(trimmed);
      const looksLikeHeader = /[:：]$/.test(trimmed) || isAllCaps;
      if (looksLikeHeader) {
        return `### ${trimmed.replace(/[:：]$/, "")}`;
      }
      return trimmed;
    });
    // Collapse multiple blank lines to a single blank line
    return formatted.join("\n").replace(/\n{3,}/g, "\n\n");
  };

  const toggleRawExpanded = (id: string) => {
    setExpandedRawIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const downloadJson = (item: FileItem) => {
    const dataStr = JSON.stringify(item, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `${item.filename.split(".")[0]}.json`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    toast({
      title: "JSON Downloaded",
      description: "JSON has been downloaded",
    });
  };

  const handleDeleteClick = (item: FileItem) => {
    setDeleteDialog({ isOpen: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return;

    setIsDeleting(true);
    try {
      const token = import.meta.env.DEV ? "dev-test-token" : undefined;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await apiFetch(`/vector-search/documents/${deleteDialog.item._id}`, {
        method: "DELETE",
        headers: headers as Record<string, string>,
      });

      // Remove the item from the local state
      setItems((prevItems) =>
        prevItems.filter((item) => item._id !== deleteDialog.item!._id)
      );
      setTotalItems((prevTotal) => prevTotal - 1);

      toast({
        title: "Document Deleted",
        description: `${deleteDialog.item.filename} has been permanently deleted`,
      });

      setDeleteDialog({ isOpen: false, item: null });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, item: null });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010613] text-gray-900 dark:text-white space-y-6 sm:space-y-8">
      <Header />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto pt-24 sm:pt-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">
              Summary
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-white">
              View and compare raw data with AI-generated summaries from all
              users (Global Access).
            </p>
          </div>
          {!searchMode && totalItems > 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {items.length} of {totalItems} documents
              <div className="text-xs mt-1">
                Page: {currentPage || 1} | HasMore: {String(hasMore || false)} |
                Loading: {String(isFetching || false)}
              </div>
              <button
                onClick={() => {
                  console.log("[Summary] Manual fetch triggered");
                  fetchMoreItems();
                }}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                disabled={!hasMore || isFetching}
              >
                {isFetching ? "Loading..." : "Load More (Debug)"}
              </button>
            </div>
          )}
          {searchMode && searchTotal > 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Found {searchTotal} results for "{searchQuery}"
              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                State Saved
              </span>
            </div>
          )}
        </div>

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Search Summaries</CardTitle>
            <CardDescription>
              Search through summaries using tags, keywords, or full-text search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search by tags, keywords, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSearch(searchQuery, 1, true);
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={searchType}
                  onChange={(e) =>
                    setSearchType(e.target.value as "tags" | "text")
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="tags">Tag Search</option>
                  <option value="text">Full Text</option>
                </select>
                <Button
                  onClick={() => handleSearch(searchQuery, 1, true)}
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-4"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
                {searchMode && (
                  <Button
                    onClick={clearSearch}
                    variant="outline"
                    className="px-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Search Tips */}
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              <strong>Search Tips:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  <strong>Tag Search:</strong> Search by industries, sectors,
                  company names, or general tags
                </li>
                <li>
                  <strong>Full Text:</strong> Search through summary content
                  using MongoDB text search
                </li>
                <li>
                  Examples: "Technology", "Apple Inc", "financial results",
                  "market analysis"
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading documents
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading || isSearching ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, index) => (
              <SummaryItemSkeleton key={index} />
            ))}
          </div>
        </div>
      ) : searchMode ? (
        // Search Results
        searchResults.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Search className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400" />
            <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              No results found
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Try different keywords or search terms.
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-6">
              {searchResults.map((result, index) => {
                const isLastElement = index === searchResults.length - 1;
                return (
                  <div
                    key={result._id}
                    ref={isLastElement ? lastElementRef : null}
                    className={`bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 overflow-hidden ${
                      isLastElement
                        ? "ring-2 ring-blue-500 ring-opacity-50"
                        : ""
                    }`}
                  >
                    {/* Search Result Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-gray-700">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                          {result.filename}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
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
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Uploaded:{" "}
                              {new Date(
                                result.upload_date
                              ).toLocaleDateString()}
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
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Reference:{" "}
                                {new Date(
                                  result.reference_date
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {result.score && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                              Score: {result.score.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {result.extracted_tags && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {result.extracted_tags.industries?.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {result.extracted_tags.sectors?.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {result.extracted_tags.stock_names?.map(
                            (tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            )
                          )}
                          {result.extracted_tags.general_tags?.map(
                            (tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary Content */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Summary:
                      </h4>
                      <div className="markdown text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                        >
                          {result.summary_text}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => copyToClipboard(result.summary_text)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Copy Summary
                      </button>
                      {result.comprehensive_summary && (
                        <button
                          onClick={() =>
                            copyToClipboard(result.comprehensive_summary || "")
                          }
                          className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Copy Full Summary
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : items.length === 0 && !error ? (
        <div className="text-center py-8 sm:py-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-gray-900 dark:text-white">
            No documents yet
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Upload some files to see them here.
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6">
            {items.map((item, index) => {
              const isLastElement = index === items.length - 1;
              console.log(
                `[Summary] Rendering item ${index}, isLastElement: ${isLastElement}, totalItems: ${items.length}`
              );
              return (
                <div
                  key={item._id}
                  ref={isLastElement ? lastElementRef : null}
                  className={`bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 overflow-hidden ${
                    isLastElement ? "ring-2 ring-blue-500 ring-opacity-50" : ""
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-gray-700">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {item.sourceType === "pdf" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-red-500"
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
                      ) : item.sourceType === "docx" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-blue-500"
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
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-500"
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
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">
                          {item.filename}
                        </h3>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-2 mr-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete document"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Uploaded:{" "}
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {item.categories?.map((category, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 bg-slate-100 dark:bg-gray-500 text-gray-950 dark:text-gray-950 rounded-full text-xs font-medium ${
                              category === "Auto"
                                ? "bg-red-100 text-red-800 dark:text-red-900"
                                : category === "IT"
                                ? "bg-blue-100 text-blue-800 dark:text-blue-900"
                                : category === "Pharma"
                                ? "bg-green-100 text-green-800 dark:text-green-900"
                                : category === "Economics"
                                ? "bg-yellow-100 text-yellow-800 dark:text-yellow-900"
                                : "bg-purple-100 text-purple-800 dark:text-purple-900"
                            }`}
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Body - Summary above, Raw below (collapsible) */}
                  <div className="flex flex-col gap-4 mb-4">
                    {/* Summary Section */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Summary
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
                              <p className="mb-3 leading-relaxed">{children}</p>
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
                              <li className="leading-relaxed">{children}</li>
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
                          {item.summary || "No summary available"}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Raw Data Section (collapsible) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">
                          Raw Data
                        </h4>
                        <button
                          onClick={() => toggleRawExpanded(item._id)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title={
                            expandedRawIds[item._id] ? "Collapse" : "Expand"
                          }
                        >
                          {expandedRawIds[item._id] ? (
                            <>
                              <ChevronUp className="h-3 w-3" /> Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" /> Expand
                            </>
                          )}
                        </button>
                      </div>

                      <div
                        className={`markdown bg-gray-100 dark:bg-[#010613] rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none transition-[max-height] duration-300 ease-in-out overflow-hidden ${
                          expandedRawIds[item._id]
                            ? "max-h-[28rem] overflow-y-auto"
                            : "max-h-16"
                        }`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                        >
                          {formatRawAsMarkdown(item.text) ||
                            "No raw data available"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700">
                    <button
                      onMouseEnter={() => setWhatCopied("raw")}
                      onClick={() => copyToClipboard(item.text || "")}
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
                      Copy Raw
                    </button>

                    <button
                      onMouseEnter={() => setWhatCopied("summary")}
                      onClick={() => copyToClipboard(item.summary || "")}
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

                    <button
                      onClick={() => downloadJson(item)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-950 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download JSON
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading indicator for infinite scroll */}
          {isFetching && (
            <div className="flex justify-center items-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#38BDF8]"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Loading more documents...
                </span>
              </div>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && items.length > 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                You've reached the end of all documents
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${deleteDialog.item?.filename}"? This action cannot be undone and will remove both the summary and raw data.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}
