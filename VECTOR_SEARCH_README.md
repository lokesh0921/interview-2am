# MongoDB Vector Search System

This document describes the new MongoDB vector search database system that has been implemented alongside the existing database. The system provides document ingestion, AI-powered summarization, tagging, and semantic search capabilities.

## System Architecture

### Database Collections

#### 1. Raw Documents Collection (`raw_documents`)

Stores the full raw content and metadata of uploaded files:

```javascript
{
  file_id: String,           // Unique identifier (UUID)
  filename: String,          // Original file name
  upload_date: Date,         // Timestamp of upload
  file_size: Number,         // Size in bytes
  mime_type: String,         // File format (PDF, DOCX, etc.)
  file_source: String,       // Origin information
  created_at: Date,          // Creation timestamp
  gridFsId: ObjectId,        // GridFS file reference
  userId: String,            // User who uploaded
  raw_content: String,       // Extracted text content
  processing_status: String, // pending|processing|completed|failed
  error_message: String      // Error details if failed
}
```

#### 2. Document Summaries Collection (`document_summaries`)

Stores AI-processed summaries, tags, and vector embeddings:

```javascript
{
  file_id: String,                    // Links to raw_documents
  summary_text: String,               // AI-generated summary
  extracted_tags: {
    industries: [String],             // Industry classifications
    sectors: [String],                // Business sectors
    stock_names: [String],            // Company/stock names
    general_tags: [String]            // Other relevant tags
  },
  semantic_embedding: [Number],       // Vector for similarity search
  reference_date: Date,               // Temporal information from content
  summary_date: Date,                 // When summary was created
  embedding_model: String,            // Model used for embeddings
  confidence_score: Number,           // AI confidence (0-1)
  processing_metadata: {
    ai_model_used: String,            // GPT-4o-mini
    processing_time_ms: Number,       // Processing duration
    tokens_used: Number               // OpenAI tokens consumed
  }
}
```

## AI Processing Pipeline

### 1. Document Upload & Storage

- Files uploaded via `/api/vector-search/upload`
- Stored in GridFS for efficient binary storage
- Text extraction using existing `extract.js` service
- Raw document metadata stored in `raw_documents` collection

### 2. AI Analysis (OpenAI GPT-4o-mini)

The system uses OpenAI's GPT-4o-mini model for:

- **Summarization**: Concise 2-3 sentence summaries
- **Tag Extraction**: Industries, sectors, company names, general tags
- **Temporal Detection**: Identifies dates and time periods
- **Confidence Scoring**: AI confidence in analysis quality

### 3. Vector Embedding Generation

- Uses OpenAI's `text-embedding-3-small` model
- Combines summary + tags into embedding text
- 1536-dimensional vectors for semantic search
- Stored in `semantic_embedding` field

## API Endpoints

### Upload & Management

- `POST /api/vector-search/upload` - Upload document for processing
- `GET /api/vector-search/documents` - List user's documents (paginated)
- `GET /api/vector-search/documents/:fileId` - Get document metadata
- `GET /api/vector-search/documents/:fileId/summary` - Get AI summary
- `GET /api/vector-search/documents/:fileId/download` - Download file

### Search & Analytics

- `POST /api/vector-search/search` - Semantic vector search
- `GET /api/vector-search/tags` - Get available tags for filtering
- `GET /api/vector-search/date-range` - Get temporal range of documents
- `GET /api/vector-search/stats` - Document processing statistics

### Search Parameters

```javascript
{
  query: "search text",
  options: {
    limit: 10,                    // Max results
    minScore: 0.7,               // Minimum similarity score
    industries: ["Technology"],   // Filter by industries
    sectors: ["Software"],        // Filter by sectors
    stockNames: ["Apple"],        // Filter by companies
    dateFrom: "2023-01-01",      // Start date filter
    dateTo: "2023-12-31",        // End date filter
    includeMetadata: true         // Include file metadata
  }
}
```

## Frontend Integration

### Vector Search Page (`/vector-search`)

- **Search Interface**: Natural language queries with filters
- **Tag Filtering**: Dynamic filters for industries, sectors, companies
- **Date Range Filtering**: Temporal search capabilities
- **Results Display**: Similarity scores, summaries, metadata
- **Upload Interface**: Drag-and-drop document upload

### Key Features

- Real-time search with similarity scoring
- Advanced filtering by tags and dates
- Document statistics dashboard
- Responsive design with dark mode support
- Toast notifications for user feedback

## Vector Search Algorithm

### Cosine Similarity Calculation

The system uses cosine similarity for semantic search:

```javascript
similarity =
  dot_product(query_vector, doc_vector) /
  (magnitude(query_vector) * magnitude(doc_vector));
```

### MongoDB Aggregation Pipeline

1. **User Authorization**: Filter by user ID
2. **Tag Filtering**: Apply industry/sector/company filters
3. **Date Filtering**: Apply temporal constraints
4. **Similarity Calculation**: Compute cosine similarity
5. **Score Filtering**: Apply minimum similarity threshold
6. **Sorting**: Order by similarity score (descending)
7. **Limiting**: Return top N results

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key    # Required for AI processing
MONGODB_URI=mongodb://localhost:27017/ai_ingest
```

### Dependencies Added

- `uuid@^9.0.0` - For generating unique file IDs
- `openai@^4.61.0` - Already present, used for AI processing

## Performance Considerations

### Indexing Strategy

- **Compound Indexes**: User + date, user + status
- **Text Indexes**: Full-text search on summaries and tags
- **Vector Indexes**: 2dsphere index for semantic embeddings
- **Single Field Indexes**: File ID, processing status

### Optimization Features

- **Pagination**: Limit results to prevent large responses
- **Selective Projection**: Exclude large text fields when not needed
- **Caching**: Available tags and stats cached on frontend
- **Async Processing**: Non-blocking AI processing pipeline

## Error Handling

### Processing States

- `pending`: Document uploaded, awaiting processing
- `processing`: AI analysis in progress
- `completed`: Successfully processed and searchable
- `failed`: Processing failed with error details

### Error Recovery

- Automatic cleanup of failed uploads
- Detailed error messages for debugging
- Retry mechanisms for transient failures
- User-friendly error notifications

## Security Features

### Authentication

- Supabase JWT token validation
- User-scoped data access
- Admin-only endpoints protected

### Data Privacy

- User isolation: Users only see their own documents
- Secure file storage in GridFS
- No cross-user data leakage

## Usage Examples

### Upload a Document

```javascript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/vector-search/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Search Documents

```javascript
const response = await fetch("/api/vector-search/search", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "quarterly financial results",
    options: {
      industries: ["Finance"],
      minScore: 0.8,
      limit: 10,
    },
  }),
});
```

## Future Enhancements

### Planned Features

- **Batch Upload**: Multiple file processing
- **Advanced Filters**: More sophisticated filtering options
- **Search History**: Track user search patterns
- **Export Results**: Download search results
- **Real-time Updates**: WebSocket notifications for processing status
- **Custom Embeddings**: Support for different embedding models
- **Analytics Dashboard**: Usage statistics and insights

### Scalability Improvements

- **Vector Database**: Consider dedicated vector DB (Pinecone, Weaviate)
- **Caching Layer**: Redis for frequently accessed data
- **Background Jobs**: Queue system for AI processing
- **CDN Integration**: Optimized file delivery
- **Database Sharding**: Horizontal scaling for large datasets

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**: Check API key and rate limits
2. **Processing Failures**: Review error messages in document status
3. **Search Timeouts**: Reduce query complexity or result limits
4. **Memory Issues**: Monitor MongoDB memory usage with large embeddings

### Monitoring

- Check processing status in document metadata
- Monitor OpenAI API usage and costs
- Track MongoDB performance metrics
- Review error logs for failed processing

This vector search system provides a robust foundation for semantic document search while maintaining separation from the existing database structure.
