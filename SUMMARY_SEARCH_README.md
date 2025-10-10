# Summary Search Functionality

## 🎯 Overview

The Summary page now includes a powerful search functionality that allows users to search through document summaries using MongoDB's optimized indexing system. This provides fast, efficient search across tags, keywords, and full-text content.

## 🔍 Search Features

### **1. Tag-Based Search**

- **Industries**: Search by industry tags (e.g., "Technology", "Healthcare")
- **Sectors**: Search by sector tags (e.g., "Software", "Biotech")
- **Companies**: Search by company/stock names (e.g., "Apple Inc", "Microsoft")
- **General Tags**: Search by general topic tags

### **2. Full-Text Search**

- **Summary Content**: Search through the actual summary text
- **Weighted Results**: More relevant results appear first
- **MongoDB Text Search**: Uses MongoDB's built-in text search capabilities

### **3. Search Types**

- **Tag Search**: Optimized for finding documents by specific tags
- **Full Text**: Comprehensive search through all text content

## 🚀 How to Use

### **Basic Search**

1. Navigate to the **Summary** page
2. Enter your search query in the search box
3. Select search type (Tag Search or Full Text)
4. Click **Search** or press **Enter**

### **Search Examples**

```
Tag Search Examples:
- "Technology" → Finds all tech-related documents
- "Apple Inc" → Finds documents about Apple
- "financial results" → Finds financial reports
- "market analysis" → Finds market research

Full Text Examples:
- "revenue growth" → Finds summaries mentioning revenue growth
- "risk factors" → Finds documents discussing risks
- "competitive advantage" → Finds competitive analysis
```

## 🏗️ Technical Implementation

### **Backend API**

- **Endpoint**: `GET /api/vector-search/search-summaries`
- **Parameters**:
  - `q`: Search query (required)
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 20)
  - `type`: Search type - "tags" or "text" (default: "tags")

### **MongoDB Indexes**

The system uses optimized MongoDB indexes for fast search:

```javascript
// Tag indexes for fast filtering
{ "extracted_tags.industries": 1 }
{ "extracted_tags.sectors": 1 }
{ "extracted_tags.stock_names": 1 }
{ "extracted_tags.general_tags": 1 }

// Text search index with weights
{
  summary_text: "text",
  "extracted_tags.industries": "text",
  "extracted_tags.sectors": "text",
  "extracted_tags.stock_names": "text",
  "extracted_tags.general_tags": "text"
}
```

### **Search Algorithm**

1. **Tag Search**: Uses regex matching across all tag fields
2. **Full Text**: Uses MongoDB's `$text` operator with relevance scoring
3. **Pagination**: Supports infinite scroll with efficient pagination
4. **Metadata**: Includes file information and relevance scores

## 📊 Performance Optimizations

### **Database Indexes**

- **Individual Tag Indexes**: Fast filtering by specific tag types
- **Compound Indexes**: Optimized for complex queries
- **Text Search Index**: Weighted full-text search
- **Date Indexes**: Efficient sorting by date

### **Frontend Optimizations**

- **Infinite Scroll**: Loads results as user scrolls
- **Debounced Search**: Prevents excessive API calls
- **Caching**: Results are cached for better performance
- **Loading States**: Clear feedback during search operations

## 🛠️ Setup Instructions

### **1. Create MongoDB Indexes**

Run the index creation script to optimize search performance:

```bash
cd backend
node create-indexes.js
```

### **2. Verify Indexes**

Check that indexes are created properly:

```javascript
// In MongoDB shell or Compass
db.document_summaries.getIndexes();
```

### **3. Test Search Functionality**

1. Upload some documents with tags
2. Navigate to Summary page
3. Try different search queries
4. Verify results are relevant and fast

## 🎨 UI Features

### **Search Interface**

- **Search Input**: Large, prominent search box
- **Search Type Selector**: Choose between Tag and Full Text search
- **Search Button**: Clear call-to-action
- **Clear Button**: Easy way to reset search

### **Results Display**

- **Relevance Score**: Shows search relevance (Full Text mode)
- **Tag Display**: Color-coded tags for easy identification
- **File Information**: Filename, date, and metadata
- **Action Buttons**: Copy summary, view details

### **Search Tips**

- **Helpful Hints**: Built-in search tips and examples
- **Result Count**: Shows total number of results found
- **Empty States**: Clear messages when no results found

## 🔧 Configuration

### **Search Limits**

- **Results per page**: 20 (configurable)
- **Max query length**: No limit
- **Search timeout**: 30 seconds

### **Index Weights**

```javascript
{
  summary_text: 10,        // Highest weight
  "extracted_tags.industries": 5,
  "extracted_tags.sectors": 5,
  "extracted_tags.stock_names": 5,
  "extracted_tags.general_tags": 3
}
```

## 🐛 Troubleshooting

### **Common Issues**

1. **Slow Search Results**

   - Ensure MongoDB indexes are created
   - Check database connection
   - Verify query complexity

2. **No Results Found**

   - Check if documents have proper tags
   - Verify search query spelling
   - Try different search terms

3. **Index Creation Errors**
   - Ensure MongoDB connection is working
   - Check database permissions
   - Verify collection exists

### **Debug Commands**

```bash
# Check indexes
db.document_summaries.getIndexes()

# Test search query
db.document_summaries.find({$text: {$search: "technology"}})

# Check collection stats
db.document_summaries.stats()
```

## 🚀 Future Enhancements

### **Planned Features**

- **Advanced Filters**: Date range, file type, size filters
- **Search History**: Remember recent searches
- **Saved Searches**: Save frequently used queries
- **Search Analytics**: Track popular search terms
- **Auto-complete**: Suggest search terms as user types

### **Performance Improvements**

- **Search Caching**: Cache frequent search results
- **Fuzzy Search**: Handle typos and variations
- **Search Suggestions**: Recommend related searches
- **Real-time Search**: Search as user types

This search functionality provides a powerful, efficient way to find and explore document summaries using MongoDB's optimized indexing system! 🎉
