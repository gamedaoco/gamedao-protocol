# IPFS Request Queue System

This document describes the enhanced IPFS system with request queue and rate limiting prevention.

## Problem Solved

The previous IPFS implementation suffered from rate limiting issues when making multiple concurrent requests to IPFS providers. This new system addresses these issues by:

- **Limiting concurrent requests** to 3 simultaneous requests
- **Implementing request queuing** with priority support
- **Adding rate limiting detection** and automatic backoff
- **Preventing duplicate requests** through smart caching
- **Providing intelligent retry logic** with exponential backoff

## Key Features

### 1. Request Queue Management
- **Max Concurrent Requests**: 3 simultaneous requests
- **Min Request Interval**: 100ms between requests
- **Priority System**: Higher priority requests are processed first
- **Automatic Queuing**: Requests are automatically queued when limits are reached

### 2. Rate Limiting Prevention
- **Request Tracking**: Monitors 30 requests per minute limit
- **Automatic Backoff**: Detects 429 status codes and backs off for 1 minute
- **Smart Retry**: Re-queues failed requests with higher priority
- **Exponential Backoff**: Increases delay between retries

### 3. Intelligent Caching
- **TTL-based Caching**: 5-minute default cache with configurable TTL
- **Deduplication**: Prevents duplicate requests for the same hash
- **Pending Request Tracking**: Shares results from ongoing requests

### 4. Enhanced Error Handling
- **Abort Controller**: Cancels requests when components unmount
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Error Recovery**: Graceful handling of network failures

## Usage Examples

### Basic IPFS Data Fetching
```typescript
import { useIPFS } from '@/hooks/useIPFS'

function MyComponent() {
  const { data, isLoading, error, retry } = useIPFS('QmHash...', {
    enabled: true,
    retryAttempts: 3,
    retryDelay: 1000,
    autoRetry: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    priority: 0 // Normal priority
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return <div>{JSON.stringify(data)}</div>
}
```

### Image Loading with Queue
```typescript
import { useIPFSImage } from '@/hooks/useIPFS'

function ImageComponent() {
  const {
    imageUrl,
    isLoading,
    error,
    isImageLoaded,
    hasError,
    retry
  } = useIPFSImage('QmImageHash...', {
    fallbackUrl: '/default-image.jpg',
    preload: true,
    priority: 1 // Higher priority for images
  })

  if (hasError) {
    return (
      <div>
        <p>Failed to load image</p>
        <button onClick={retry}>Retry</button>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt="IPFS Image"
      style={{ opacity: isImageLoaded ? 1 : 0.5 }}
    />
  )
}
```

### File Upload with Queue
```typescript
import { useIPFSUpload } from '@/hooks/useIPFS'

function UploadComponent() {
  const { uploadFile, uploadJSON, isUploading, progress, error, reset } = useIPFSUpload({
    onProgress: (prog) => console.log(`Upload progress: ${prog}%`),
    priority: 2 // Highest priority for uploads
  })

  const handleFileUpload = async (file: File) => {
    try {
      const hash = await uploadFile(file)
      console.log('File uploaded:', hash)
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        disabled={isUploading}
      />
      {isUploading && <div>Progress: {progress}%</div>}
      {error && <div>Error: {error}</div>}
    </div>
  )
}
```

### Batch Loading with Queue
```typescript
import { useIPFSBatch } from '@/hooks/useIPFS'

function BatchComponent() {
  const hashes = ['QmHash1...', 'QmHash2...', 'QmHash3...']

  const { results, isLoading, hasErrors, retry } = useIPFSBatch(hashes, {
    batchSize: 3, // Process 3 at a time
    priority: 0,
    cacheTTL: 10 * 60 * 1000 // 10 minutes
  })

  if (isLoading) return <div>Loading batch...</div>

  return (
    <div>
      {Object.entries(results).map(([hash, result]) => (
        <div key={hash}>
          <h3>{hash}</h3>
          {result.isLoading && <p>Loading...</p>}
          {result.error && <p>Error: {result.error}</p>}
          {result.data && <pre>{JSON.stringify(result.data, null, 2)}</pre>}
        </div>
      ))}
      {hasErrors && <button onClick={retry}>Retry Failed</button>}
    </div>
  )
}
```

## Queue Statistics and Monitoring

### Get Queue Statistics
```typescript
import { getIPFSQueueStats } from '@/hooks/useIPFS'

function QueueMonitor() {
  const stats = getIPFSQueueStats()

  return (
    <div>
      <h3>IPFS Queue Status</h3>
      <p>Queue Length: {stats.queueLength}</p>
      <p>Active Requests: {stats.activeRequests}</p>
      <p>Rate Limit Count: {stats.rateLimitCount}</p>
      <p>Is Rate Limited: {stats.isRateLimited ? 'Yes' : 'No'}</p>
      {stats.rateLimitResetTime > Date.now() && (
        <p>Rate limit resets in: {Math.ceil((stats.rateLimitResetTime - Date.now()) / 1000)}s</p>
      )}
    </div>
  )
}
```

### Cache Management
```typescript
import { clearIPFSCache, getIPFSCacheStats } from '@/hooks/useIPFS'

function CacheManager() {
  const stats = getIPFSCacheStats()

  return (
    <div>
      <h3>IPFS Cache Status</h3>
      <p>Cache Size: {stats.cacheSize} entries</p>
      <p>Pending Requests: {stats.pendingRequests}</p>
      <button onClick={clearIPFSCache}>Clear Cache</button>
    </div>
  )
}
```

## Priority System

The queue system supports priority levels:

- **Priority 0**: Normal priority (default)
- **Priority 1**: Higher priority (images)
- **Priority 2**: Highest priority (uploads)

Higher priority requests are processed first, ensuring critical operations like uploads and image loading get precedence over background data fetching.

## Rate Limiting Behavior

### Detection
- Monitors for HTTP 429 status codes
- Tracks request frequency (30 requests/minute limit)
- Automatically backs off when limits are detected

### Recovery
- Waits 1 minute before retrying rate-limited requests
- Re-queues failed requests with increased priority
- Provides exponential backoff for persistent failures

## Configuration Options

### Global Settings
```typescript
// These are configured in the IPFSRequestQueue class
const config = {
  maxConcurrentRequests: 3,     // Max simultaneous requests
  minRequestInterval: 100,      // Min time between requests (ms)
  maxRequestsPerMinute: 30,     // Rate limit threshold
  defaultCacheTTL: 5 * 60 * 1000, // Default cache TTL (5 minutes)
  defaultRetryAttempts: 3,      // Default retry attempts
  defaultRetryDelay: 1000       // Default retry delay (ms)
}
```

### Per-Request Options
```typescript
const options = {
  enabled: true,              // Enable/disable request
  retryAttempts: 3,          // Number of retry attempts
  retryDelay: 1000,          // Initial retry delay (ms)
  autoRetry: true,           // Enable automatic retries
  cacheTTL: 5 * 60 * 1000,   // Cache time-to-live (ms)
  priority: 0                // Request priority (0-2)
}
```

## Migration Guide

### From Old useIPFS
```typescript
// Old way
const { data, isLoading, error } = useIPFS('QmHash...')

// New way (same API, enhanced performance)
const { data, isLoading, error, retry } = useIPFS('QmHash...')
```

### From Direct IPFS Calls
```typescript
// Old way
const data = await getFromIPFS('QmHash...')

// New way (with queue management)
const { data } = useIPFS('QmHash...')
```

## Best Practices

1. **Use Priority Wisely**: Set higher priority for user-facing content
2. **Configure Cache TTL**: Longer TTL for static content, shorter for dynamic data
3. **Handle Errors Gracefully**: Always provide retry mechanisms
4. **Monitor Queue Status**: Use statistics to optimize performance
5. **Batch Related Requests**: Use `useIPFSBatch` for multiple related items
6. **Clear Cache When Needed**: Clear cache for updated content

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Check queue statistics and wait for reset
2. **Slow Loading**: Increase cache TTL or batch size
3. **Failed Requests**: Check network connectivity and IPFS provider status
4. **Memory Usage**: Clear cache periodically for long-running applications

### Debug Information

The system provides comprehensive logging:
- Request queuing and processing
- Rate limit detection and backoff
- Cache hits and misses
- Error handling and retries

Check browser console for detailed debug information.
