import React from "react";
import { Link } from "react-router-dom";
import SignupForm from "../components/auth/SignupForm";
import ThemeToggle from "../components/ThemeToggle";

export default function Signup() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010613] flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 sm:py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center space-x-0" aria-label="Tradonomy">
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
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <SignupForm />
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2024 Tradonomy Edge. All rights reserved.
          </p>
        </div>
      </footer> */}
    </div>
  );
}
