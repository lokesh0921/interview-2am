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
import Layout from "./components/Layout";
import { Toaster } from "@/components/ui/toaster";
// import Auth from "./pages/Auth";

const router = createBrowserRouter([
  {
    path: "/",
    // element: (
    //   <Protected>
    //     <Layout />
    //   </Protected>
    // ),
    children: [
      { index: true, element: <App /> },
      { path: "upload", element: <Upload /> },
      { path: "vector-search", element: <VectorSearch /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "summary", element: <Summary /> },
      {
        path: "admin",
        element: (
          <Protected admin>
            <Admin />
          </Protected>
        ),
      },
    ],
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
