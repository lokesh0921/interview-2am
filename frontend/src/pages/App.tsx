import React from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../supabase/SupabaseProvider";

export default function App() {
  const { session, signOut } = useSupabase();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full border border-white/20"></div>
        <div className="absolute top-40 right-32 w-64 h-64 rounded-full border border-white/10"></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 rounded-full border border-white/15"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-white/20"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold">Puzzle</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Home
            </Link>

            <Link
              to="/upload"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Upload
            </Link>
            <Link
              to="/vector-search"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Vector Search
            </Link>
            <Link
              to="/summary"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Summary
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* <Link
              to="/login"
              className="px-4 py-2 text-emerald-400 border border-emerald-400/50 rounded-lg hover:bg-emerald-400/10 transition-colors"
            >
              Log in
            </Link> */}
            <button
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
              onClick={signOut}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-4-4H3zm7 2a1 1 0 00-1 1v1H5a1 1 0 000 2h4v1a1 1 0 002 0V9.414l3 3V16H5V8h4V7a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <Link
              to="/upload"
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Get started for free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Accounting Software That
            <br />
            Exceeds Expectations
          </h1>

          <p className="text-xl text-gray-300 mb-16">
            Built native to <span className="text-emerald-400">Stripe</span>
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            {/* Tax Ready Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-left">
                  Be tax ready
                </h3>
                <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Cash</span>
                    <span className="text-white">—</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 text-sm">Accrual ✓</span>
                    <span className="text-white">Cash</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-left">
                  Cash & accrual together at last
                </p>
              </div>
            </div>

            {/* Fundraise Ready Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-left">
                  Be fundraise ready
                </h3>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-xs text-gray-400 mb-2 text-left">
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
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-left">
                  Get accurate books, faster
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-blue-500 relative">
                        <div className="absolute inset-1 bg-slate-900 rounded-full"></div>
                        <div className="absolute top-1 left-1 w-6 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        98% of dollar volume
                      </div>
                      <div className="text-xs text-gray-400">
                        auto-categorized
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-purple-500 relative">
                        <div className="absolute inset-1 bg-slate-900 rounded-full"></div>
                        <div className="absolute top-1 left-1 w-6 h-3 bg-purple-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        90% of dollar volume
                      </div>
                      <div className="text-xs text-gray-400">finalized</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-20 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-6">
              Build a better business
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-right">
                  <div className="text-gray-400">$16,328</div>
                  <div className="text-emerald-400">$500</div>
                  <div className="text-emerald-400">$350</div>
                  <div className="text-gray-400">$150</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400">$18,069</div>
                  <div className="text-emerald-400">$217</div>
                  <div className="text-gray-400">$0</div>
                  <div className="text-gray-400">$0</div>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-gray-400">—</div>
                  <div className="text-gray-400">—</div>
                  <div className="text-gray-400">—</div>
                  <div className="text-gray-400">—</div>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-gray-400">—</div>
                  <div className="text-gray-400">—</div>
                  <div className="text-gray-400">—</div>
                  <div className="text-gray-400">—</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-4 text-left">
                Spotlight tool highlights changes
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
