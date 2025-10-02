import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import React from "react";

interface AdminItem {
  _id: string;
  userId: string;
  sourceType: string;
  filename: string;
  categories: string[];
  summary: string;
}

interface AdminAnalytics {
  totalUploads: number;
  categories: Array<{
    _id: string | null;
    count: number;
  }>;
}

export default function Admin() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [files, stats] = await Promise.all([
        apiFetch("/admin/files"),
        apiFetch("/admin/analytics"),
      ]);
      setItems(files.items);
      setAnalytics(stats);
    } catch (e: any) {
      console.error("[Admin] Error loading data:", e);
      // Use toast instead of alert for better UX
      // toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
      {analytics && (
        <div className="mb-6 bg-white p-4 rounded border">
          <div>Total Uploads: {analytics.totalUploads}</div>
          <div className="mt-2">
            <b>Categories</b>
            <ul className="list-disc ml-6">
              {analytics.categories.map((c) => (
                <li key={c._id || "uncat"}>
                  {c._id || "Uncategorized"}: {c.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {loading && <div>Loading...</div>}
      <div className="grid gap-4">
        {items.map((it) => (
          <div key={it._id} className="bg-white p-4 rounded border">
            <div className="text-sm text-gray-500">
              {it.userId} • {it.sourceType} • {it.filename}
            </div>
            <div className="mt-2 text-sm">
              <b>Categories:</b> {(it.categories || []).join(", ")}
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm">{it.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
