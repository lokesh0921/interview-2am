import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../lib/api";
import Header from "@/components/Header";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DashboardItem {
  _id: string;
  filename: string;
  sourceType: string;
  summary: string;
  categories: string[];
}

export default function Dashboard() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"cards" | "charts" | "list">(
    "cards"
  );

  const load = async () => {
    setLoading(true);
    try {
      console.log("[Dashboard] Loading items from vector search database...");
      const response = await apiFetch("/vector-search/all-documents");
      console.log("[Dashboard] API response:", response);

      if (response.success && response.items) {
        setItems(response.items);
        console.log(`[Dashboard] Loaded ${response.items.length} items`);
      } else {
        console.error("[Dashboard] Invalid response format:", response);
        setItems([]);
      }
    } catch (e: any) {
      console.error("[Dashboard] Error loading items:", e);
      // Use toast instead of alert for better UX
      // toast({ title: "Error", description: e.message, variant: "destructive" });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      console.log(`[Dashboard] Deleting document ${id}`);
      const response = await apiFetch(`/vector-search/documents/${id}`, {
        method: "DELETE",
      });
      console.log(`[Dashboard] Delete response:`, response);

      if (response.success) {
        setItems((prev) => prev.filter((it) => it._id !== id));
        console.log(`[Dashboard] Document ${id} deleted successfully`);
      } else {
        throw new Error(response.error || "Delete failed");
      }
    } catch (e: any) {
      console.error(`[Dashboard] Error deleting document ${id}:`, e);
      // Use toast instead of alert for better UX
      // toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const resummarize = async (id: string) => {
    setUpdatingId(id);
    try {
      console.log(`[Dashboard] Re-summarizing document ${id}`);
      const response = await apiFetch(
        `/vector-search/documents/${id}/resummarize`,
        {
          method: "POST",
        }
      );
      console.log(`[Dashboard] Re-summarize response:`, response);

      if (response.success && response.data) {
        // Update the item with new summary data
        setItems((prev) =>
          prev.map((it) =>
            it._id === id
              ? {
                  ...it,
                  summary: response.data.summary,
                  categories: response.data.extracted_tags
                    ? [
                        ...(response.data.extracted_tags.industries || []),
                        ...(response.data.extracted_tags.sectors || []),
                        ...(response.data.extracted_tags.stock_names || []),
                      ]
                    : it.categories,
                }
              : it
          )
        );
        console.log(`[Dashboard] Document ${id} re-summarized successfully`);
      } else {
        throw new Error(response.error || "Re-summarize failed");
      }
    } catch (e: any) {
      console.error(`[Dashboard] Error re-summarizing document ${id}:`, e);
      // Use toast instead of alert for better UX
      // toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  // Process data for charts and category cards
  const categoryData = useMemo(() => {
    const categories: Record<string, { count: number; items: any[] }> = {};

    items.forEach((item) => {
      if (Array.isArray(item.categories)) {
        item.categories.forEach((category: string) => {
          if (!categories[category]) {
            categories[category] = { count: 0, items: [] };
          }
          categories[category].count += 1;
          categories[category].items.push(item);
        });
      }
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      count: data.count,
      items: data.items,
    }));
  }, [items]);

  // Colors for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  // Data for pie chart
  const pieChartData = useMemo(() => {
    return categoryData.map((category) => ({
      name: category.name,
      value: category.count,
    }));
  }, [categoryData]);

  // Data for bar chart
  const barChartData = useMemo(() => {
    return categoryData.map((category) => ({
      name: category.name,
      count: category.count,
    }));
  }, [categoryData]);

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto pt-24 sm:pt-28">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Analytics and summaries from all users (Global Access)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === "cards"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActiveView("cards")}
            >
              Category Cards
            </button>
            <button
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === "list"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActiveView("list")}
            >
              Documents
            </button>
            <button
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === "charts"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActiveView("charts")}
            >
              Charts
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48 sm:h-64">
            <div className="flex items-center space-x-2">
              <svg
                className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm sm:text-base">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {activeView === "cards" ? (
              <>
                {/* Category Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {categoryData.map((category, index) => (
                    <div
                      key={category.name}
                      className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-t-4"
                      style={{ borderTopColor: COLORS[index % COLORS.length] }}
                    >
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-semibold">
                          {category.name}
                        </h3>
                        <span className="text-xl sm:text-2xl font-bold">
                          {category.count}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                        {category.count} document
                        {category.count !== 1 ? "s" : ""} in this category
                      </div>
                      <a
                        href={`#${category.name}`}
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          // You could implement filtering by category here
                          setActiveView("list");
                        }}
                      >
                        View details
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 sm:h-4 sm:w-4 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>

                {activeView === "cards" && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                      All Documents
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                      {items.map((it) => (
                        <div
                          key={it._id}
                          className="bg-white p-3 sm:p-5 rounded-xl shadow-md border"
                        >
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="font-medium text-sm sm:text-base">
                                {it.filename}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500">
                                {it.sourceType}
                              </span>
                            </div>
                          </div>

                          <div className="mb-2 sm:mb-3">
                            <div className="text-xs sm:text-sm font-medium mb-1">
                              Categories:
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {Array.isArray(it.categories)
                                ? it.categories.map((category, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                                        category === "Auto"
                                          ? "bg-red-100 text-red-800"
                                          : category === "IT"
                                          ? "bg-blue-100 text-blue-800"
                                          : category === "Pharma"
                                          ? "bg-green-100 text-green-800"
                                          : category === "Economics"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-purple-100 text-purple-800"
                                      }`}
                                    >
                                      {category}
                                    </span>
                                  ))
                                : null}
                            </div>
                          </div>

                          <details className="text-xs sm:text-sm mb-2 sm:mb-3">
                            <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 transition-colors">
                              View Summary
                            </summary>
                            <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                              {it.summary}
                            </div>
                          </details>

                          <div className="flex gap-2">
                            <button
                              className="px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 text-xs sm:text-sm"
                              onClick={() => resummarize(it._id)}
                              disabled={updatingId === it._id}
                            >
                              {updatingId === it._id ? (
                                <>
                                  <svg
                                    className="animate-spin h-3 w-3 sm:h-4 sm:w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  <span className="hidden sm:inline">
                                    Re-summarizing...
                                  </span>
                                  <span className="sm:hidden">
                                    Processing...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 sm:h-4 sm:w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                  <span className="hidden sm:inline">
                                    Re-run Summary
                                  </span>
                                  <span className="sm:hidden">Re-run</span>
                                </>
                              )}
                            </button>
                            <button
                              className="px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-red-600 text-xs sm:text-sm"
                              onClick={() => del(it._id)}
                              disabled={updatingId === it._id}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 sm:h-4 sm:w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeView === "list" && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                      All Documents
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                      {items.map((it) => (
                        <div
                          key={it._id}
                          className="bg-white p-3 sm:p-5 rounded-xl shadow-md border"
                        >
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="font-medium text-sm sm:text-base">
                                {it.filename}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500">
                                {it.sourceType}
                              </span>
                            </div>
                          </div>

                          <div className="mb-2 sm:mb-3">
                            <div className="text-xs sm:text-sm font-medium mb-1">
                              Categories:
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {Array.isArray(it.categories)
                                ? it.categories.map((category, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                                        category === "Auto"
                                          ? "bg-red-100 text-red-800"
                                          : category === "IT"
                                          ? "bg-blue-100 text-blue-800"
                                          : category === "Pharma"
                                          ? "bg-green-100 text-green-800"
                                          : category === "Economics"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-purple-100 text-purple-800"
                                      }`}
                                    >
                                      {category}
                                    </span>
                                  ))
                                : null}
                            </div>
                          </div>

                          <details className="text-xs sm:text-sm mb-2 sm:mb-3">
                            <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 transition-colors">
                              View Summary
                            </summary>
                            <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                              {it.summary}
                            </div>
                          </details>

                          <div className="flex gap-2">
                            <button
                              className="px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 text-xs sm:text-sm"
                              onClick={() => resummarize(it._id)}
                              disabled={updatingId === it._id}
                            >
                              {updatingId === it._id ? (
                                <>
                                  <svg
                                    className="animate-spin h-3 w-3 sm:h-4 sm:w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  <span className="hidden sm:inline">
                                    Re-summarizing...
                                  </span>
                                  <span className="sm:hidden">
                                    Processing...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 sm:h-4 sm:w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                  <span className="hidden sm:inline">
                                    Re-run Summary
                                  </span>
                                  <span className="sm:hidden">Re-run</span>
                                </>
                              )}
                            </button>
                            <button
                              className="px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-red-600 text-xs sm:text-sm"
                              onClick={() => del(it._id)}
                              disabled={updatingId === it._id}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 sm:h-4 sm:w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Charts View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                  {/* Pie Chart */}
                  <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
                      Category Distribution
                    </h3>
                    <div className="h-60 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={window.innerWidth < 640 ? 60 : 80}
                            fill="#8884d8"
                            dataKey="value"
                            label={(props: any) => {
                              const { name, percent } = props;
                              return window.innerWidth < 640
                                ? `${(percent * 100).toFixed(0)}%`
                                : `${name}: ${(percent * 100).toFixed(0)}%`;
                            }}
                          >
                            {pieChartData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend
                            layout={
                              window.innerWidth < 640
                                ? "horizontal"
                                : "vertical"
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
                      Documents per Category
                    </h3>
                    <div className="h-60 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={barChartData}
                          margin={{
                            top: 5,
                            right: window.innerWidth < 640 ? 10 : 30,
                            left: window.innerWidth < 640 ? 10 : 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            tick={{
                              fontSize: window.innerWidth < 640 ? 10 : 12,
                            }}
                          />
                          <YAxis
                            tick={{
                              fontSize: window.innerWidth < 640 ? 10 : 12,
                            }}
                          />
                          <Tooltip />
                          <Legend
                            wrapperStyle={{
                              fontSize: window.innerWidth < 640 ? 10 : 12,
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="Documents"
                            fill="#8884d8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
