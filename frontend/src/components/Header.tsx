import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSupabase } from "../supabase/SupabaseProvider";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { session, signOut } = useSupabase();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <>
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

          {/* Centered Navigation Links */}
          <div className="hidden md:flex items-center justify-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                location.pathname === "/"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:shadow-lg hover:shadow-gray-300/20 dark:hover:shadow-white/10"
              }`}
            >
              Home
            </Link>

            <Link
              to="/upload"
              className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                location.pathname === "/upload"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:shadow-lg hover:shadow-gray-300/20 dark:hover:shadow-white/10"
              }`}
            >
              Upload
            </Link>

            <Link
              to="/vector-search"
              className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                location.pathname === "/vector-search"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:shadow-lg hover:shadow-gray-300/20 dark:hover:shadow-white/10"
              }`}
            >
              Vector Search
            </Link>

            <Link
              to="/summary"
              className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                location.pathname === "/summary"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:shadow-lg hover:shadow-gray-300/20 dark:hover:shadow-white/10"
              }`}
            >
              Summary
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg border border-gray-300/40 dark:border-white/20 hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5 transition-all duration-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          <div className="flex items-center space-x-4">
            {/* <Link
           to="/login"
           className="px-4 py-2 text-emerald-400 border border-emerald-400/50 rounded-lg hover:bg-emerald-400/10 transition-colors"
         >
           Log in
         </Link> */}
            {session?.user?.email && (
              <span className="hidden sm:flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden md:inline">{session.user.email}</span>
                <span className="md:hidden">
                  {session.user.email.split("@")[0]}
                </span>
              </span>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            <button
              className="pr-5  px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
              onClick={signOut}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                fill="currentColor"
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-4-4H3zm7 2a1 1 0 00-1 1v1H5a1 1 0 000 2h4v1a1 1 0 002 0V9.414l3 3V16H5V8h4V7a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
            {/* <Link
           to="/upload"
           className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
         >
           Get started for free
         </Link> */}
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden relative z-20 bg-white/95 dark:bg-[#010613]/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-white/10">
          <div className="px-6 py-4 space-y-2">
            <Link
              to="/"
              className={`block px-4 py-3 rounded-lg border transition-all duration-300 ${
                location.pathname === "/"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/upload"
              className={`block px-4 py-3 rounded-lg border transition-all duration-300 ${
                location.pathname === "/upload"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Upload
            </Link>
            <Link
              to="/vector-search"
              className={`block px-4 py-3 rounded-lg border transition-all duration-300 ${
                location.pathname === "/vector-search"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Vector Search
            </Link>
            <Link
              to="/summary"
              className={`block px-4 py-3 rounded-lg border transition-all duration-300 ${
                location.pathname === "/summary"
                  ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8] shadow-lg shadow-[#38BDF8]/20"
                  : "border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Summary
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
