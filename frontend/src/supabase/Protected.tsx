import React from "react";
import { Navigate } from "react-router-dom";
import { useSupabase } from "./SupabaseProvider";

export default function Protected({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { session, initialized } = useSupabase();
  if (!initialized) return <div className="p-6">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (admin) {
    const role = (session.user?.app_metadata as any)?.role;
    const email = session.user?.email?.toLowerCase?.();
    const allowEmail =
      (import.meta as any).env?.VITE_ADMIN_EMAIL || "lokeshpawar721@gmail.com";
    const isAdmin =
      role === "admin" || (email && email === String(allowEmail).toLowerCase());
    if (!isAdmin) return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
