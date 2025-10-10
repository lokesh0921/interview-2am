import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";

// Types for different page states
interface VectorSearchState {
  searchQuery: string;
  selectedIndustries: string[];
  selectedSectors: string[];
  selectedStockNames: string[];
  dateFrom: string;
  dateTo: string;
  minScore: number;
  tagSectionVisibility: {
    industries: boolean;
    sectors: boolean;
    companies: boolean;
  };
  questionAnswer: {
    question: string;
    answer: string;
    sources: Array<{
      file_id: string;
      filename: string;
      similarity_score: number;
      summary: string;
      upload_date: string;
      file_size: number;
      mime_type: string;
    }>;
  } | null;
  searchResults: Array<{
    file_id: string;
    summary_text: string;
    extracted_tags: {
      industries: string[];
      sectors: string[];
      stock_names: string[];
      general_tags: string[];
    };
    reference_date?: string;
    similarity_score: number;
    filename: string;
    upload_date: string;
    file_size: number;
    mime_type: string;
  }>;
  lastSearchQuery: string;
}

interface UploadState {
  selectedFiles: File[];
  uploadProgress: Record<string, number>;
  uploadStatus: Record<string, "pending" | "uploading" | "completed" | "error">;
  uploadResults: Array<{
    filename: string;
    status: "success" | "error";
    message: string;
  }>;
}

interface DashboardState {
  selectedFilters: {
    type?: string;
    category?: string;
    from?: string;
    to?: string;
    q?: string;
  };
  currentPage: number;
  itemsPerPage: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface SummaryState {
  selectedFilters: {
    type?: string;
    category?: string;
    from?: string;
    to?: string;
    q?: string;
  };
  currentPage: number;
  itemsPerPage: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// Global app state
interface AppState {
  vectorSearch: VectorSearchState;
  upload: UploadState;
  dashboard: DashboardState;
  summary: SummaryState;
  // Global settings
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  lastActivePage: string;
}

// Action types
type AppStateAction =
  | { type: "UPDATE_VECTOR_SEARCH"; payload: Partial<VectorSearchState> }
  | { type: "UPDATE_UPLOAD"; payload: Partial<UploadState> }
  | { type: "UPDATE_DASHBOARD"; payload: Partial<DashboardState> }
  | { type: "UPDATE_SUMMARY"; payload: Partial<SummaryState> }
  | { type: "UPDATE_THEME"; payload: "light" | "dark" }
  | { type: "UPDATE_SIDEBAR"; payload: boolean }
  | { type: "UPDATE_ACTIVE_PAGE"; payload: string }
  | { type: "RESET_PAGE_STATE"; payload: string }
  | { type: "LOAD_STATE"; payload: AppState };

// Initial state
const initialState: AppState = {
  vectorSearch: {
    searchQuery: "",
    selectedIndustries: [],
    selectedSectors: [],
    selectedStockNames: [],
    dateFrom: "",
    dateTo: "",
    minScore: 0.1,
    tagSectionVisibility: {
      industries: false,
      sectors: false,
      companies: false,
    },
    questionAnswer: null,
    searchResults: [],
    lastSearchQuery: "",
  },
  upload: {
    selectedFiles: [],
    uploadProgress: {},
    uploadStatus: {},
    uploadResults: [],
  },
  dashboard: {
    selectedFilters: {},
    currentPage: 1,
    itemsPerPage: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  },
  summary: {
    selectedFilters: {},
    currentPage: 1,
    itemsPerPage: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  },
  theme: "light",
  sidebarCollapsed: false,
  lastActivePage: "/",
};

// Reducer
function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case "UPDATE_VECTOR_SEARCH":
      return {
        ...state,
        vectorSearch: { ...state.vectorSearch, ...action.payload },
      };
    case "UPDATE_UPLOAD":
      return {
        ...state,
        upload: { ...state.upload, ...action.payload },
      };
    case "UPDATE_DASHBOARD":
      return {
        ...state,
        dashboard: { ...state.dashboard, ...action.payload },
      };
    case "UPDATE_SUMMARY":
      return {
        ...state,
        summary: { ...state.summary, ...action.payload },
      };
    case "UPDATE_THEME":
      return {
        ...state,
        theme: action.payload,
      };
    case "UPDATE_SIDEBAR":
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };
    case "UPDATE_ACTIVE_PAGE":
      return {
        ...state,
        lastActivePage: action.payload,
      };
    case "RESET_PAGE_STATE":
      const resetState = { ...state };
      switch (action.payload) {
        case "vectorSearch":
          resetState.vectorSearch = initialState.vectorSearch;
          break;
        case "upload":
          resetState.upload = initialState.upload;
          break;
        case "dashboard":
          resetState.dashboard = initialState.dashboard;
          break;
        case "summary":
          resetState.summary = initialState.summary;
          break;
      }
      return resetState;
    case "LOAD_STATE":
      return action.payload;
    default:
      return state;
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppStateAction>;
  updateVectorSearch: (payload: Partial<VectorSearchState>) => void;
  updateUpload: (payload: Partial<UploadState>) => void;
  updateDashboard: (payload: Partial<DashboardState>) => void;
  updateSummary: (payload: Partial<SummaryState>) => void;
  resetPageState: (page: string) => void;
} | null>(null);

// Storage utilities
const STORAGE_KEY = "tradonomy_app_state";
const STORAGE_VERSION = "1.0.0";

const saveStateToStorage = (state: AppState) => {
  try {
    const stateToSave = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data: state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.warn("Failed to save state to localStorage:", error);
  }
};

const loadStateFromStorage = (): AppState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    // Check version compatibility
    if (parsed.version !== STORAGE_VERSION) {
      console.warn("State version mismatch, using default state");
      return null;
    }

    // Check if state is not too old (optional: expire after 7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - parsed.timestamp > maxAge) {
      console.warn("State too old, using default state");
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn("Failed to load state from localStorage:", error);
    return null;
  }
};

// Provider component
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadStateFromStorage();
    if (savedState) {
      dispatch({ type: "LOAD_STATE", payload: savedState });
    }
  }, []);

  // Save state to localStorage whenever state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveStateToStorage(state);
    }, 500); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [state]);

  // Helper functions
  const updateVectorSearch = (payload: Partial<VectorSearchState>) => {
    dispatch({ type: "UPDATE_VECTOR_SEARCH", payload });
  };

  const updateUpload = (payload: Partial<UploadState>) => {
    dispatch({ type: "UPDATE_UPLOAD", payload });
  };

  const updateDashboard = (payload: Partial<DashboardState>) => {
    dispatch({ type: "UPDATE_DASHBOARD", payload });
  };

  const updateSummary = (payload: Partial<SummaryState>) => {
    dispatch({ type: "UPDATE_SUMMARY", payload });
  };

  const resetPageState = (page: string) => {
    dispatch({ type: "RESET_PAGE_STATE", payload: page });
  };

  const value = {
    state,
    dispatch,
    updateVectorSearch,
    updateUpload,
    updateDashboard,
    updateSummary,
    resetPageState,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use the context
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}

// Specific hooks for each page
export function useVectorSearchState() {
  const { state, updateVectorSearch, resetPageState } = useAppState();
  return {
    vectorSearchState: state.vectorSearch,
    updateVectorSearch,
    resetVectorSearchState: () => resetPageState("vectorSearch"),
  };
}

export function useUploadState() {
  const { state, updateUpload, resetPageState } = useAppState();
  return {
    uploadState: state.upload,
    updateUpload,
    resetUploadState: () => resetPageState("upload"),
  };
}

export function useDashboardState() {
  const { state, updateDashboard, resetPageState } = useAppState();
  return {
    dashboardState: state.dashboard,
    updateDashboard,
    resetDashboardState: () => resetPageState("dashboard"),
  };
}

export function useSummaryState() {
  const { state, updateSummary, resetPageState } = useAppState();
  return {
    summaryState: state.summary,
    updateSummary,
    resetSummaryState: () => resetPageState("summary"),
  };
}

// Global settings hook
export function useGlobalSettings() {
  const { state, dispatch } = useAppState();
  return {
    theme: state.theme,
    sidebarCollapsed: state.sidebarCollapsed,
    lastActivePage: state.lastActivePage,
    updateTheme: (theme: "light" | "dark") =>
      dispatch({ type: "UPDATE_THEME", payload: theme }),
    updateSidebar: (collapsed: boolean) =>
      dispatch({ type: "UPDATE_SIDEBAR", payload: collapsed }),
    updateActivePage: (page: string) =>
      dispatch({ type: "UPDATE_ACTIVE_PAGE", payload: page }),
  };
}
