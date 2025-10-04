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
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 sm:py-6 bg-white/95 dark:bg-[#010613]/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-white/10">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Mobile Menu Button - Top Left */}
          <button
            className={`md:hidden p-2 rounded-lg border transition-all duration-300 ${
              mobileMenuOpen
                ? "border-[#38BDF8]/50 bg-[#38BDF8]/10 dark:bg-[#38BDF8]/20"
                : "border-gray-300/40 dark:border-white/20 bg-white/10 dark:bg-white/5 hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5"
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-5 h-5"
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

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div
              className={"flex items-center space-x-0"}
              aria-label="Tradonomy"
            >
              <span className="text-black dark:text-white text-lg sm:text-xl font-extrabold tracking-tight">
                Trado
              </span>
              <svg
                width="28"
                height="24"
                viewBox="0 0 34 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="inline-block sm:w-8 sm:h-7"
                role="img"
                aria-hidden="true"
              >
                <rect width="34" height="28" rx="6" fill="#071122" />
                <path
                  d="M6 20 L13 10 L20 18 L27 6"
                  stroke="#16A34A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 20 L13 14 L20 22 L27 12"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              </svg>
              <span className="text-black dark:text-white text-lg sm:text-xl font-extrabold tracking-tight">
                omy <span className="text-[#38BDF8] pl-1 sm:pl-2"> Edge</span>
              </span>
            </div>
          </div>

          {/* Centered Navigation Links - Desktop Only */}
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

          {/* Right Side - User Info, Theme Toggle, Sign Out */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {session?.user?.email ? (
              <>
                <span className="hidden sm:flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden md:inline text-sm sm:text-base">
                    {session.user.email}
                  </span>
                  <span className="text-xs sm:text-sm md:hidden">
                    {session.user.email.split("@")[0]}
                  </span>
                </span>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Sign Out Button */}
                <button
                  className="px-2 sm:px-4 py-2 rounded-lg border border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-red-300 dark:hover:text-red-300 hover:border-red-400/60 dark:hover:border-red-400/40 hover:bg-red-50/50 dark:hover:bg-red-900/10 hover:shadow-lg hover:shadow-red-300/20 dark:hover:shadow-red-500/10 transition-all duration-300 flex items-center gap-1 sm:gap-2"
                  onClick={signOut}
                >
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-4-4H3zm7 2a1 1 0 00-1 1v1H5a1 1 0 000 2h4v1a1 1 0 002 0V9.414l3 3V16H5V8h4V7a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline text-sm sm:text-base">
                    Sign out
                  </span>
                </button>
              </>
            ) : (
              <>
                {/* Login Button */}
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300/40 dark:border-white/20 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:border-gray-400/60 dark:hover:border-white/40 hover:bg-gray-100/50 dark:hover:bg-white/5 hover:shadow-lg hover:shadow-gray-300/20 dark:hover:shadow-white/10 transition-all duration-300 text-sm sm:text-base"
                >
                  Sign in
                </Link>

                {/* Signup Button */}
                <Link
                  to="/signup"
                  className="px-3 sm:px-4 py-2 rounded-lg bg-[#38BDF8] text-white hover:bg-[#38BDF8]/90 transition-all duration-300 shadow-lg shadow-[#38BDF8]/20 hover:shadow-[#38BDF8]/30 text-sm sm:text-base font-medium"
                >
                  Get started
                </Link>

                {/* Theme Toggle */}
                <ThemeToggle />
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu */}
          <div className="md:hidden fixed top-16 left-0 right-0 z-50 bg-white/95 dark:bg-[#010613]/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-white/10 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="px-4 sm:px-6 py-4 space-y-2 max-w-7xl mx-auto">
              {/* Close Button */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors"
                  aria-label="Close menu"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <Link
                to="/"
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all duration-300 text-sm sm:text-base ${
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
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all duration-300 text-sm sm:text-base ${
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
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all duration-300 text-sm sm:text-base ${
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
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all duration-300 text-sm sm:text-base ${
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
        </>
      )}
    </>
  );
}
