# IPFS Hooks Documentation

This document describes the unified IPFS hooks that provide consistent loading states, error handling, retry logic, and caching for IPFS operations in the GameDAO frontend.

## Overview

The IPFS hooks wrap the existing IPFS utility functions with React hooks to provide:

- ✅ **Unified Loading States**: Consistent loading indicators across all IPFS operations
- ✅ **Automatic Retry Logic**: Configurable retry attempts with exponential backoff
- ✅ **Smart Caching**: In-memory cache with configurable timeout to reduce redundant requests
- ✅ **Error Handling**: Comprehensive error states with user-friendly messages
- ✅ **Image Optimization**: Specialized hooks for IPFS images with preloading and fallbacks

## Available Hooks

### `useIPFS(hashOrUrl, options)`

Main hook for fetching any IPFS content.

```tsx
import { useIPFS } from '@/hooks/useIPFS'

function MyComponent() {
  const { data, isLoading, error, retry, clearCache } = useIPFS('ipfs://Qm...', {
    retryAttempts: 3,
    retryDelay: 1000,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    autoRetry: true,
    enabled: true
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error} <button onClick={retry}>Retry</button></div>

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

### `useIPFSImage(hashOrUrl, options)`

Specialized hook for IPFS images with image-specific features.

```tsx
import { useIPFSImage } from '@/hooks/useIPFS'

function ImageComponent() {
  const {
    imageUrl,
    isLoading,
    error,
    isImageLoaded,
    imageError,
    isFullyLoaded,
    hasError,
    retry,
    naturalWidth,
    naturalHeight
  } = useIPFSImage('ipfs://Qm...', {
    fallbackUrl: '/default-image.jpg',
    preload: true,
    retryAttempts: 3
  })

  return (
    <img
      src={imageUrl}
      alt="IPFS Image"
      onLoad={() => console.log('Image loaded')}
      style={{
        opacity: isFullyLoaded ? 1 : 0.5,
        filter: hasError ? 'grayscale(1)' : 'none'
      }}
    />
  )
}
```

### `useIPFSUpload()`

Hook for uploading files and JSON to IPFS.

```tsx
import { useIPFSUpload } from '@/hooks/useIPFS'

function UploadComponent() {
  const { uploadFile, uploadJSON, isUploading, progress, error, result, reset } = useIPFSUpload()

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, {
        name: 'My File',
        description: 'Uploaded via GameDAO'
      })
      console.log('Uploaded:', result.url)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleJSONUpload = async () => {
    try {
      const data = { name: 'Test', value: 123 }
      const result = await uploadJSON(data, {
        name: 'Test Data'
      })
      console.log('Uploaded JSON:', result.url)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <div>
      {isUploading && <div>Uploading... {progress}</div>}
      {error && <div>Error: {error}</div>}
      {result && <div>Success: {result.url}</div>}

      <input type="file" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
      <button onClick={handleJSONUpload}>Upload JSON</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

### `useIPFSBatch(urls, options)`

Hook for loading multiple IPFS URLs efficiently.

```tsx
import { useIPFSBatch } from '@/hooks/useIPFS'

function BatchComponent() {
  const urls = ['ipfs://Qm1...', 'ipfs://Qm2...', 'ipfs://Qm3...']
  const { results, isLoading, hasErrors, allLoaded, retry } = useIPFSBatch(urls)

  return (
    <div>
      {isLoading && <div>Loading batch...</div>}
      {hasErrors && <div>Some items failed to load <button onClick={retry}>Retry All</button></div>}

      {Object.entries(results).map(([url, result]) => (
        <div key={url}>
          <h3>{url}</h3>
          {result.isLoading && <div>Loading...</div>}
          {result.error && <div>Error: {result.error}</div>}
          {result.data && <pre>{JSON.stringify(result.data, null, 2)}</pre>}
        </div>
      ))}
    </div>
  )
}
```

## IPFS Image Components

Pre-built components for common IPFS image use cases:

### `IPFSImage`

Main image component with loading states and error handling.

```tsx
import { IPFSImage } from '@/components/ui/IPFSImage'

<IPFSImage
  hash="ipfs://Qm..."
  alt="Description"
  aspectRatio="16:9"
  fallbackUrl="/default.jpg"
  showLoading={true}
  showError={true}
  retryButton={true}
  className="w-full rounded-lg"
/>
```

### `IPFSAvatar`

Specialized for profile avatars.

```tsx
import { IPFSAvatar } from '@/components/ui/IPFSImage'

<IPFSAvatar
  hash="ipfs://Qm..."
  size="lg"
  fallbackUrl="/default-avatar.png"
/>
```

### `IPFSBanner`

For banner/hero images.

```tsx
import { IPFSBanner } from '@/components/ui/IPFSImage'

<IPFSBanner
  hash="ipfs://Qm..."
  fallbackUrl="/default-banner.jpg"
  className="w-full h-48"
/>
```

### `IPFSCard`

For card thumbnails.

```tsx
import { IPFSCard } from '@/components/ui/IPFSImage'

<IPFSCard
  hash="ipfs://Qm..."
  fallbackUrl="/default-card.jpg"
  className="w-64"
/>
```

## Hook Options

### Common Options

```tsx
interface UseIPFSOptions {
  retryAttempts?: number    // Default: 3
  retryDelay?: number       // Default: 1000ms (with exponential backoff)
  cacheTimeout?: number     // Default: 5 minutes
  autoRetry?: boolean       // Default: true
  enabled?: boolean         // Default: true
}
```

### Image-Specific Options

```tsx
interface UseIPFSImageOptions extends UseIPFSOptions {
  fallbackUrl?: string      // URL to use if IPFS fails
  preload?: boolean         // Default: false
}
```

## Cache Management

```tsx
import { clearIPFSCache, getIPFSCacheStats } from '@/hooks/useIPFS'

// Clear all cached IPFS data
clearIPFSCache()

// Get cache statistics
const stats = getIPFSCacheStats()
console.log(`Cache size: ${stats.size}, Active loads: ${stats.activeLoads}`)
```

## Migration Guide

### Before (Direct IPFS calls)

```tsx
// ❌ Old way - manual loading states
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await getFromIPFS(url)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [url])
```

### After (Using IPFS hooks)

```tsx
// ✅ New way - unified hook
const { data, isLoading, error, retry } = useIPFS(url)
```

## Best Practices

1. **Use appropriate hooks**: `useIPFS` for data, `useIPFSImage` for images, `useIPFSUpload` for uploads
2. **Configure caching**: Set appropriate `cacheTimeout` based on data freshness requirements
3. **Handle errors gracefully**: Always provide retry options and fallback content
4. **Optimize images**: Use `IPFSImage` components instead of raw `<img>` tags
5. **Batch operations**: Use `useIPFSBatch` when loading multiple items
6. **Clear cache when needed**: Call `clearIPFSCache()` after critical updates

## Performance Tips

- **Preload critical images**: Set `preload: true` for above-the-fold images
- **Use fallback URLs**: Always provide fallbacks for better UX
- **Adjust retry settings**: Lower `retryAttempts` for non-critical content
- **Monitor cache**: Use `getIPFSCacheStats()` to optimize cache usage
- **Disable auto-retry**: Set `autoRetry: false` for user-triggered actions

## Error Handling

The hooks provide comprehensive error information:

```tsx
const { data, error, retry, retryCount, lastAttempt } = useIPFS(url)

if (error) {
  return (
    <div>
      <p>Failed to load content: {error}</p>
      <p>Retry attempts: {retryCount}</p>
      <p>Last attempt: {new Date(lastAttempt).toLocaleString()}</p>
      <button onClick={retry}>Try Again</button>
    </div>
  )
}
```

This unified approach ensures consistent IPFS handling across the entire GameDAO frontend while providing excellent user experience with proper loading states, error handling, and retry mechanisms.
