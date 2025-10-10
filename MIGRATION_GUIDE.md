# Migration Guide: Adding State Persistence to Existing Pages

This guide shows how to migrate existing pages to use the new state persistence system.

## 🔄 Quick Migration Steps

### 1. Replace Local State with Global State

**Before:**

```tsx
function MyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);

  // ... component logic
}
```

**After:**

```tsx
import { useVectorSearchState } from "../contexts/AppStateContext";
import {
  useNavigationState,
  useScrollRestoration,
} from "../hooks/useNavigationState";

function MyPage() {
  const { vectorSearchState, updateVectorSearch } = useVectorSearchState();

  // Navigation and scroll restoration
  useNavigationState();
  useScrollRestoration();

  // Use global state instead of local state
  const { searchQuery, selectedIndustries, searchResults } = vectorSearchState;

  // ... component logic
}
```

### 2. Update State Updates

**Before:**

```tsx
const handleSearch = (query: string) => {
  setSearchQuery(query);
  setResults([]);
};
```

**After:**

```tsx
const handleSearch = (query: string) => {
  updateVectorSearch({
    searchQuery: query,
    searchResults: [],
  });
};
```

### 3. Add Navigation Hooks

Add these hooks to any page that should persist state:

```tsx
import {
  useNavigationState,
  useScrollRestoration,
} from "../hooks/useNavigationState";

function MyPage() {
  // Automatically tracks navigation and restores scroll position
  useNavigationState();
  useScrollRestoration();

  // ... rest of component
}
```

## 📋 Page-Specific Migration Examples

### Vector Search Page

**Key Changes:**

- Replace all `useState` calls with `useVectorSearchState`
- Update all state setters to use `updateVectorSearch`
- Add navigation hooks

**Example:**

```tsx
// Before
const [searchQuery, setSearchQuery] = useState("");
const [selectedIndustries, setSelectedIndustries] = useState([]);

// After
const { vectorSearchState, updateVectorSearch } = useVectorSearchState();
const { searchQuery, selectedIndustries } = vectorSearchState;

// Update state
updateVectorSearch({ searchQuery: newQuery });
updateVectorSearch({ selectedIndustries: newIndustries });
```

### Upload Page

**Key Changes:**

- Use `useUploadState` for file management
- Persist upload progress and results
- Maintain file queue across navigation

**Example:**

```tsx
const { uploadState, updateUpload } = useUploadState();

// Add files
updateUpload({
  selectedFiles: [...uploadState.selectedFiles, ...newFiles],
});

// Update progress
updateUpload({
  uploadProgress: {
    ...uploadState.uploadProgress,
    [fileName]: progress,
  },
});
```

### Dashboard Page

**Key Changes:**

- Use `useDashboardState` for filters and pagination
- Persist current page and sort settings
- Maintain filter selections

**Example:**

```tsx
const { dashboardState, updateDashboard } = useDashboardState();

// Update filters
updateDashboard({
  selectedFilters: {
    ...dashboardState.selectedFilters,
    category: newCategory,
  },
});

// Update pagination
updateDashboard({
  currentPage: newPage,
});
```

## 🎯 Benefits After Migration

1. **State Persistence**: User data survives page navigation
2. **Better UX**: No lost work when navigating between pages
3. **Mobile Friendly**: Optimized for mobile devices
4. **URL Sharing**: State can be shared via URL parameters
5. **Scroll Restoration**: Users return to where they left off

## 🧪 Testing Your Migration

1. **Add some data** to your page
2. **Navigate to another page**
3. **Return to your page**
4. **Verify data is still there**

Use the demo page at `/state-demo` to see the system in action.

## 🚨 Common Pitfalls

1. **Don't mix local and global state** for the same data
2. **Always use the provided hooks** instead of direct context access
3. **Add navigation hooks** to every page that needs state persistence
4. **Test on mobile devices** to ensure compatibility
5. **Reset state appropriately** (e.g., after successful operations)

## 🔧 Advanced Usage

### URL State Synchronization

For pages that should sync state with URL parameters:

```tsx
import { useURLSyncState } from "../hooks/useNavigationState";

function MyPage() {
  const [filters, setFilters] = useState({});

  // Automatically syncs with URL
  useURLSyncState(filters, setFilters, {
    excludeKeys: ["internalState"], // Don't sync sensitive data
    debounceMs: 500, // Debounce URL updates
  });
}
```

### Custom State Reset

```tsx
const { resetVectorSearchState } = useVectorSearchState();

const handleReset = () => {
  resetVectorSearchState();
  toast({ title: "State Reset", description: "All data cleared" });
};
```

This migration guide ensures a smooth transition to the new state persistence system while maintaining all existing functionality.
