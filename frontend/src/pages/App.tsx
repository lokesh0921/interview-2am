export default function App() {
  return (
    <div className="min-h-screen from-gray-50 via-white to-gray-100 dark:bg-[#010613] text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full border border-gray-300/30 dark:border-white/20"></div>
        <div className="absolute top-40 right-32 w-64 h-64 rounded-full border border-gray-300/20 dark:border-white/10"></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 rounded-full border border-gray-300/25 dark:border-white/15"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-gray-300/30 dark:border-white/20"></div>
      </div>

      {/* Hero Section */}
      <main className="relative z-10 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-tight">
            Instant Insights.
            <br />
            Efficient Decisions.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-white mb-12 sm:mb-16 px-4">
            Turn Raw Data Into{" "}
            <span className="text-[#38BDF8]">Instant Insights.</span>
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-12 sm:mt-20">
            {/* Tax Ready Card */}
            <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-left">
                  Be market ready
                </h3>
                <div className="bg-gray-100/80 dark:bg-[#010613]/70 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-white text-xs sm:text-sm">
                      FTSE:
                    </span>
                    <span className="text-[#38BDF8] text-xs sm:text-sm">
                      41268 (+0.04%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-white text-xs sm:text-sm">
                      CAC:
                    </span>
                    <span className="text-[#38BDF8] text-xs sm:text-sm">
                      7588 (+0.31%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-white text-xs sm:text-sm">
                      DAX:
                    </span>
                    <span className="text-[#38BDF8] text-xs sm:text-sm">
                      18765 (+0.37%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fundraise Ready Card */}
            <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
              <div className="mb-2">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-left">
                  Get market insights
                </h3>
                <div className="bg-gray-100/80 dark:bg-[#010613]/70 rounded-lg p-3 sm:p-4">
                  <div className="bg-[#0D1117] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center">
                    <h3 className="text-white text-xs sm:text-sm mb-2">
                      Market Trend
                    </h3>
                    <div className="w-full h-20">
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-full"
                      >
                        <polyline
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth="2"
                          points="0,70 15,60 30,75 45,50 60,55 75,30 90,40 100,20"
                        />
                        <defs>
                          <linearGradient
                            id="lineGradient"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#BE1417" />
                            <stop offset="100%" stopColor="#0CA054" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">
                      Nifty 50 • +0.48%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accurate Books Card */}
            <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-left">
                  Get instant data, faster
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 relative">
                        <div className="absolute inset-1 bg-gray-100 dark:bg-[#010613] rounded-full"></div>
                        <div className="absolute top-1 left-1 w-4 h-2 sm:w-6 sm:h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-medium">
                        Nifty ⬆️ 81 points (+0.33%)
                      </div>
                      <div className="text-xs text-gray-500 dark:text-white"></div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-500 relative">
                        <div className="absolute inset-1 bg-gray-100 dark:bg-[#010613] rounded-full"></div>
                        <div className="absolute top-1 left-1 w-4 h-2 sm:w-6 sm:h-3 bg-purple-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-medium">
                        Sensex had dropped 3.30% over the past eight days.
                      </div>
                      <div className="text-xs text-gray-500 dark:text-white"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
