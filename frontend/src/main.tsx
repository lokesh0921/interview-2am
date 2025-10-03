import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import App from "./pages/App";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Summary from "./pages/Summary";
import VectorSearch from "./pages/VectorSearch";
import { SupabaseProvider } from "./supabase/SupabaseProvider";
import Protected from "./supabase/Protected";
import { Toaster } from "@/components/ui/toaster";
// import Auth from "./pages/Auth";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Protected>
        <App />
      </Protected>
    ),
  },
  {
    path: "/upload",
    element: (
      <Protected>
        <Upload />
      </Protected>
    ),
  },
  {
    path: "/vector-search",
    element: (
      <Protected>
        <VectorSearch />
      </Protected>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <Protected>
        <Dashboard />
      </Protected>
    ),
  },
  {
    path: "/summary",
    element: (
      <Protected>
        <Summary />
      </Protected>
    ),
  },
  {
    path: "/admin",
    element: (
      <Protected admin>
        <Admin />
      </Protected>
    ),
  },
  { path: "/login", element: <Login /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SupabaseProvider>
      <RouterProvider router={router} />
      <Toaster />
    </SupabaseProvider>
  </React.StrictMode>
);
