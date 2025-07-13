# Console.log Migration Guide

## Quick Migration Steps

1. **Add logger import to component:**
```typescript
import { useLogger } from '@/hooks/useLogger'

// In component:
const { logger } = useLogger('ComponentName', { category: 'ui' })
```

2. **Replace console.log patterns:**

### Organization Creation Modal
```typescript
// BEFORE:
console.log('🚀 Creating organization with params:', { name, accessModel })

// AFTER:
logger.info('Creating organization with params', { name, accessModel })
```

### Error Handling
```typescript
// BEFORE:
console.error('❌ Organization creation failed:', error)

// AFTER:
logger.error('Organization creation failed', error)
```

### Debug Information
```typescript
// BEFORE:
console.log('🔍 Error state check:', { createError, isCreating })

// AFTER:
logger.debug('Error state check', { createError, isCreating })
```

### IPFS Operations
```typescript
// BEFORE:
console.log('📤 Uploading profile image:', profileImage)

// AFTER:
logger.info('Uploading profile image', { fileName: profileImage.name, fileSize: profileImage.size })
```

### Contract Interactions
```typescript
// BEFORE:
console.log('✅ Contract addresses loaded:', addresses)

// AFTER:
logger.info('Contract addresses loaded', { addresses })
```

## Specific Files to Update

### 1. packages/frontend/src/components/organization/create-organization-modal.tsx
- Replace all console.log with logger.info
- Replace all console.error with logger.error
- Fix uploadFile usage (returns hash, not object with url)

### 2. packages/frontend/src/lib/contracts.ts
- Replace console.log with logger.info
- Use blockchain category for contract-related logs

### 3. packages/frontend/src/lib/id-utils.ts
- Replace console.log with logger.debug
- Replace console.error with logger.error

### 4. packages/frontend/src/lib/ipfs.ts
- Replace console.log with logger.info
- Replace console.error with logger.error
- Use ipfs category

### 5. packages/frontend/src/lib/web3.ts
- Replace console.log with logger.info
- Use blockchain category

## Quick Fix Script

Run this to replace common patterns:

```bash
# Replace basic console.log
find packages/frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.log(/logger.info(/g'

# Replace console.error
find packages/frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.error(/logger.error(/g'

# Replace console.warn
find packages/frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.warn(/logger.warn(/g'

# Replace console.debug
find packages/frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.debug(/logger.debug(/g'
```

## Current Build Issues

The build is failing due to:
1. TypeScript linting errors (unused vars, any types)
2. Missing logger imports in files using console.log
3. IPFS upload function signature mismatch

## Priority Files to Fix

1. **create-organization-modal.tsx** - Main user-facing component
2. **contracts.ts** - Contract address logging
3. **ipfs.ts** - IPFS operation logging
4. **id-utils.ts** - ID extraction logging

## Testing

After migration, logs will appear in:
- Browser console (formatted with colors)
- Logger Manager (Ctrl+Shift+L in development)
- Can be exported as JSON/CSV

## Benefits

- Centralized log management
- Structured data objects
- Category-based filtering
- Performance monitoring
- Production-ready logging
