import Header from "../components/Header";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface DocumentStats {
  total_documents: number;
  processed_documents: number;
  processing_status: Record<string, number>;
}

export default function App() {
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocumentStats = async () => {
      try {
        const token = import.meta.env.DEV ? "dev-test-token" : undefined;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await apiFetch("/vector-search/stats", {
          headers: headers as Record<string, string>,
        });

        if (response.success && response.data) {
          setDocumentStats(response.data);
        }
      } catch (error) {
        console.error("Failed to load document stats:", error);
        // Set fallback stats
        setDocumentStats({
          total_documents: 0,
          processed_documents: 0,
          processing_status: {},
        });
      } finally {
        setLoading(false);
      }
    };

    loadDocumentStats();
  }, []);
  return (
    <div>
      <Header />
      <div className="min-h-screen  from-gray-50 via-white to-gray-100 dark:bg-[#010613] text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full border border-gray-300/30 dark:border-white/20"></div>
          <div className="absolute top-40 right-32 w-64 h-64 rounded-full border border-gray-300/20 dark:border-white/10"></div>
          <div className="absolute bottom-32 left-1/3 w-80 h-80 rounded-full border border-gray-300/25 dark:border-white/15"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-gray-300/30 dark:border-white/20"></div>
        </div>

        {/* Hero Section */}
        <main className="relative z-10 px-4 sm:px-6 py-12 sm:py-20 pt-24 sm:pt-28">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl mt-20 md:text-5xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-tight">
              Instant Insights.
              <br />
              Efficient Decisions.
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-white mb-12 sm:mb-16 px-4">
              Turn Raw Data Into{" "}
              <span className="text-[#38BDF8]">Instant Insights.</span>
            </p>

            {/* Document Statistics Cards */}
            <div className="px-4 sm:px-8 lg:px-16 xl:px-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mt-12 sm:mt-20">
              {/* Total Documents Card */}
              <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#38BDF8]/10 dark:bg-[#38BDF8]/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#38BDF8]"
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
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {loading ? "..." : documentStats?.total_documents || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Total Documents
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  All uploaded documents in the system
                </div>
              </div>

              {/* Processed Documents Card */}
              <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {loading
                        ? "..."
                        : documentStats?.processed_documents || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Processed
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Successfully processed and summarized documents
                </div>
              </div>

              {/* Processing Rate Card */}
              {/* <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {loading
                        ? "..."
                        : documentStats && documentStats.total_documents > 0
                        ? Math.round(
                            ((documentStats.processed_documents || 0) /
                              documentStats.total_documents) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Processing Rate
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Successfully processed documents
                </div>
              </div> */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
