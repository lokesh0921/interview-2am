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
          <Link
            to="/"
            className="flex items-center space-x-2"
            aria-label="TradoNomy.ai"
          >
            <img
              src="/tradonomy-logo-light.png"
              alt="TradoNomy.ai"
              className="block dark:hidden h-6 w-auto sm:h-8 md:h-10"
            />
            <img
              src="/tradonomy-logo-dark.png"
              alt="TradoNomy.ai"
              className="hidden dark:block h-6 w-auto sm:h-8 md:h-10"
            />
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
