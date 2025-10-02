import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";
import Header from "@/components/Header";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { SummaryItemSkeleton } from "../components/ui/skeleton";

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
  }, [currentPage, hasMore, loadItems]);

  const { isFetching = false, lastElementRef } = useInfiniteScroll(
    fetchMoreItems,
    hasMore,
    { rootMargin: "200px" }
  );

  useEffect(() => {
    console.log("[Summary] Component mounted, loading initial items...");
    loadItems(1, true);
  }, [loadItems]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
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
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010613] text-gray-900 dark:text-white space-y-6 sm:space-y-8">
      <Header />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
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
          {totalItems > 0 && (
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
        </div>
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

      {loading ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, index) => (
              <SummaryItemSkeleton key={index} />
            ))}
          </div>
        </div>
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
                    <div>
                      <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">
                        {item.filename}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.categories?.map((category, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 bg-slate-100 dark:bg-gray-500 text-gray-950 dark:text-gray-950 rounded-full text-xs font-medium ${
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
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Raw Data Section */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Raw Data
                      </h4>
                      <div className="bg-gray-100 dark:bg-[#010613] rounded-lg p-3 h-96 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                          {item.text || "No raw data available"}
                        </pre>
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Summary
                      </h4>
                      <div className="bg-gray-100 dark:bg-[#010613] rounded-lg p-3 h-96 overflow-y-auto">
                        <p className="text-xs text-gray-900 dark:text-gray-100">
                          {item.summary || "No summary available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700">
                    <button
                      onClick={() => copyToClipboard(item.text || "")}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-500 hover:bg-gray-200 text-gray-950 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
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
                      onClick={() => copyToClipboard(item.summary || "")}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-500 hover:bg-gray-200 text-gray-950 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
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
                      className="px-3 py-1.5 bg-slate-100 dark:bg-gray-500 hover:bg-blue-200 text-gray-950 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
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
    </div>
  );
}
