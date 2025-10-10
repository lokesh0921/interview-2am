# State Persistence Implementation

This document describes the comprehensive state persistence solution implemented for the React application, ensuring that user state is maintained across page navigation.

## 🎯 Overview

The state persistence system uses a combination of:

- **React Context** for global state management
- **localStorage** for persistent storage
- **URL parameters** for shareable state
- **Scroll position restoration** for better UX

## 🏗️ Architecture

### 1. Global State Management (`AppStateContext.tsx`)

The core of the state persistence system is the `AppStateProvider` which manages:

- **Vector Search State**: Search queries, filters, results, and UI state
- **Upload State**: File selections, upload progress, and results
- **Dashboard State**: Filters, pagination, and sorting
- **Summary State**: Similar to dashboard state
- **Global Settings**: Theme, sidebar state, last active page

#### Key Features:

- **Automatic Persistence**: State is automatically saved to localStorage
- **Version Control**: State versioning prevents compatibility issues
- **Debounced Saves**: Prevents excessive localStorage writes
- **Error Handling**: Graceful fallbacks when localStorage fails

### 2. Navigation Hooks (`useNavigationState.ts`)

Custom hooks that enhance navigation:

- **`useNavigationState`**: Tracks current page and updates global state
- **`useScrollRestoration`**: Saves and restores scroll positions
- **`useURLState`**: Syncs component state with URL parameters
- **`useURLSyncState`**: Two-way sync between state and URL

### 3. Page-Specific Hooks

Each page type has its own hook for easy state management:

- **`useVectorSearchState`**: For vector search functionality
- **`useUploadState`**: For file upload management
- **`useDashboardState`**: For dashboard filters and pagination
- **`useSummaryState`**: For summary page state
- **`useGlobalSettings`**: For app-wide settings

## 🚀 Usage Examples

### Basic State Management

```tsx
import { useVectorSearchState } from "../contexts/AppStateContext";

function MyComponent() {
  const { vectorSearchState, updateVectorSearch } = useVectorSearchState();

  const handleSearch = (query: string) => {
    updateVectorSearch({ searchQuery: query });
  };

  return (
    <input
      value={vectorSearchState.searchQuery}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```

### URL State Synchronization

```tsx
import { useURLSyncState } from "../hooks/useNavigationState";

function FilterComponent() {
  const [filters, setFilters] = useState({ category: "", type: "" });

  // Automatically syncs with URL parameters
  useURLSyncState(filters, setFilters, {
    excludeKeys: ["internalState"], // Don't sync internal state
    debounceMs: 500, // Debounce URL updates
  });

  return (
    <div>
      <input
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
      />
    </div>
  );
}
```

### Navigation with State Tracking

```tsx
import {
  useNavigationState,
  useScrollRestoration,
} from "../hooks/useNavigationState";

function MyPage() {
  // Automatically tracks navigation and restores scroll position
  useNavigationState();
  useScrollRestoration();

  return <div>My page content</div>;
}
```

## 📱 Mobile Compatibility

The state persistence system is fully mobile-compatible:

- **Touch-friendly**: All interactive elements are optimized for mobile
- **Responsive**: State management works across all screen sizes
- **Performance**: Debounced saves prevent performance issues on mobile
- **Storage**: localStorage works consistently across mobile browsers

## 🔧 Configuration

### Storage Settings

```tsx
// In AppStateContext.tsx
const STORAGE_KEY = "tradonomy_app_state";
const STORAGE_VERSION = "1.0.0";
const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### State Structure

```tsx
interface AppState {
  vectorSearch: VectorSearchState;
  upload: UploadState;
  dashboard: DashboardState;
  summary: SummaryState;
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  lastActivePage: string;
}
```

## 🎨 Demo Implementation

A complete demo is available at `/state-demo` that shows:

- **Real-time state updates** across all page types
- **State persistence** when navigating between pages
- **URL synchronization** for shareable state
- **Mobile-responsive** interface
- **Reset functionality** for testing

## 🔄 State Flow

1. **User Interaction** → Component updates local state
2. **State Update** → Context reducer processes the change
3. **Persistence** → State is debounced and saved to localStorage
4. **Navigation** → State is preserved and restored on page return
5. **URL Sync** → State changes are reflected in URL parameters

## 🛡️ Error Handling

The system includes comprehensive error handling:

- **localStorage failures**: Graceful fallback to default state
- **Version mismatches**: Automatic state reset with warning
- **Expired state**: Automatic cleanup of old state
- **Network errors**: State remains functional offline

## 📊 Performance Considerations

- **Debounced saves**: Prevents excessive localStorage writes
- **Selective updates**: Only changed state is persisted
- **Lazy loading**: State is loaded only when needed
- **Memory management**: Old state is automatically cleaned up

## 🔮 Future Enhancements

Potential improvements for the state persistence system:

1. **State Compression**: Compress large state objects before storage
2. **Selective Persistence**: Allow pages to opt-out of persistence
3. **State Analytics**: Track state usage patterns
4. **Cross-tab Sync**: Synchronize state across browser tabs
5. **State Migration**: Automatic migration between state versions

## 🧪 Testing

To test the state persistence:

1. Navigate to `/state-demo`
2. Add some demo data
3. Navigate to other pages (Vector Search, Upload, etc.)
4. Return to the demo page
5. Verify that your data is still there

## 📝 Best Practices

1. **Use the provided hooks** instead of direct context access
2. **Reset state** when appropriate (e.g., after successful operations)
3. **Exclude sensitive data** from URL synchronization
4. **Test on mobile devices** to ensure compatibility
5. **Monitor localStorage usage** in production

## 🚨 Troubleshooting

### Common Issues:

1. **State not persisting**: Check if localStorage is available and not full
2. **URL not updating**: Verify URL sync configuration
3. **Performance issues**: Check for excessive state updates
4. **Mobile issues**: Test on actual devices, not just browser dev tools

### Debug Tools:

- Check browser DevTools → Application → Local Storage
- Use the demo page to verify state behavior
- Monitor console for state-related errors
- Check network tab for URL parameter changes

This implementation provides a robust, scalable solution for state persistence that works seamlessly across all devices and use cases.
