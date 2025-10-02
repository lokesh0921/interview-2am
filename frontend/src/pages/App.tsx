import Header from "../components/Header";

export default function App() {
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
        <main className="relative z-10 px-6 py-20">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              Instant Insights.
              <br />
              Efficient Decisions.
            </h1>

            <p className="text-xl text-gray-600 dark:text-white mb-16">
              Built native to <span className="text-[#38BDF8]">Stripe</span>
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
              {/* Tax Ready Card */}
              <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-6  ">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-left">
                    Be tax ready
                  </h3>
                  <div className="bg-gray-100/80 dark:bg-[#010613]/70 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-white text-sm">
                        Cash
                      </span>
                      <span className="text-gray-900 dark:text-white">—</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#38BDF8] text-sm">Accrual ✓</span>
                      <span className="text-gray-900 dark:text-white">
                        Cash
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-white mt-3 text-left">
                    Cash & accrual together at last
                  </p>
                </div>
              </div>

              {/* Fundraise Ready Card */}
              <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-left">
                    Be fundraise ready
                  </h3>
                  <div className="bg-gray-100/80 dark:bg-[#010613]/70 rounded-lg p-4">
                    <div className="text-xs text-gray-500 dark:text-white mb-2 text-left">
                      Revenue Recognition &gt;
                    </div>
                    <div className="flex items-end space-x-1 h-16">
                      {[20, 35, 45, 60, 75, 85, 95].map((height, i) => (
                        <div
                          key={i}
                          className="bg-gradient-to-t from-blue-500 to-cyan-400 rounded-sm flex-1"
                          style={{ height: `${height}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Accurate Books Card */}
              <div className="bg-white/80 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-6 hover:bg-white/90 dark:hover:bg-[#010613]/90 transition-all duration-300 shadow-lg dark:shadow-none">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-left">
                    Get accurate books, faster
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 relative">
                          <div className="absolute inset-1 bg-gray-100 dark:bg-[#010613] rounded-full"></div>
                          <div className="absolute top-1 left-1 w-6 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">
                          98% of dollar volume
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white">
                          auto-categorized
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500 relative">
                          <div className="absolute inset-1 bg-gray-100 dark:bg-[#010613] rounded-full"></div>
                          <div className="absolute top-1 left-1 w-6 h-3 bg-purple-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">
                          90% of dollar volume
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white">
                          finalized
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-20 bg-white/60 dark:bg-[#010613]/80 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-2xl p-8 shadow-lg dark:shadow-none">
              <h3 className="text-xl font-semibold mb-6">
                Build a better business
              </h3>
              <div className="bg-gray-100/80 dark:bg-[#010613]/70 rounded-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-right">
                    <div className="text-gray-500 dark:text-white">$16,328</div>
                    <div className="text-[#38BDF8]">$500</div>
                    <div className="text-[#38BDF8]">$350</div>
                    <div className="text-gray-500 dark:text-white">$150</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 dark:text-white">$18,069</div>
                    <div className="text-[#38BDF8]">$217</div>
                    <div className="text-gray-500 dark:text-white">$0</div>
                    <div className="text-gray-500 dark:text-white">$0</div>
                  </div>
                  <div className="hidden md:block text-right">
                    <div className="text-gray-500 dark:text-white">—</div>
                    <div className="text-gray-500 dark:text-white">—</div>
                    <div className="text-gray-500 dark:text-white">—</div>
                    <div className="text-gray-500 dark:text-white">—</div>
                  </div>
                  <div className="hidden md:block text-right">
                    <div className="text-gray-500 dark:text-white">—</div>
                    <div className="text-gray-500 dark:text-white">—</div>
                    <div className="text-gray-500 dark:text-white">—</div>
                    <div className="text-gray-500 dark:text-white">—</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-white mt-4 text-left">
                  Spotlight tool highlights changes
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
