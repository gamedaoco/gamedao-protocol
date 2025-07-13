/**
 * Logger Migration Examples
 *
 * This file shows how to migrate from console.log to the new logging system.
 * These examples can be used as a reference for updating existing code.
 */

import { createLogger, logger, configureLogger, setEnabledCategories, setLogLevel, enableCategory } from './logger'
import { useLogger, useAuthLogger, useIPFSLogger, useBlockchainLogger } from '@/hooks/useLogger'

// =============================================================================
// BEFORE: Using console.log
// =============================================================================

// Old way - scattered console.log statements
function oldWay() {
  const error = new Error('Example error')
  console.log('User clicked button')
  console.error('API call failed:', error)
  console.warn('Rate limit approaching')
  console.debug('Component mounted')
}

// =============================================================================
// AFTER: Using the new logging system
// =============================================================================

// Method 1: Using global logger (for utilities and non-React code)
function newWayGlobal() {
  const error = new Error('Example error')
  logger.info('User clicked button')
  logger.error('API call failed', error)
  logger.warn('Rate limit approaching')
  logger.debug('Component mounted')
}

// Method 2: Using component-specific logger (for React components)
function MyComponent() {
  const { logger, logUserAction, logError } = useLogger('MyComponent')

  const handleClick = () => {
    logUserAction('button_clicked', { buttonId: 'submit' })
    // or
    logger.user('info', 'Button clicked', { buttonId: 'submit' })
  }

  const handleError = (error: Error) => {
    logError('Operation failed', error, { operation: 'submit' })
  }

  // return <button onClick={handleClick}>Click me</button>
}

// Method 3: Using category-specific loggers
function AuthComponent() {
  const { logLogin, logWalletConnection } = useAuthLogger('AuthComponent')

  const handleLogin = async () => {
    try {
      // await loginUser()
      logLogin('wallet', true, { provider: 'metamask' })
    } catch (error) {
      logLogin('wallet', false, { error: (error as Error).message })
    }
  }

  const handleWalletConnect = (address: string) => {
    logWalletConnection(address, 1) // chainId: 1 for mainnet
  }
}

// =============================================================================
// MIGRATION PATTERNS
// =============================================================================

// Pattern 1: Replace console.log with appropriate level
// BEFORE:
// console.log('User action:', action)
// AFTER:
// logger.user('info', 'User action', { action })

// Pattern 2: Replace console.error with structured error logging
// BEFORE:
// console.error('Failed to fetch data:', error)
// AFTER:
// logger.error('Failed to fetch data', error, { context: 'additional info' })

// Pattern 3: Replace console.warn with categorized warnings
// BEFORE:
// console.warn('Deprecated API used')
// AFTER:
// logger.warn('Deprecated API used', { api: 'oldEndpoint', replacement: 'newEndpoint' })

// Pattern 4: Replace console.debug with development logging
// BEFORE:
// console.debug('Component state:', state)
// AFTER:
// logger.debug('Component state', { state })

// Pattern 5: Replace performance logging
// BEFORE:
// console.time('API call')
// fetch('/api/data')
// console.timeEnd('API call')
// AFTER:
// logger.time('API call')
// fetch('/api/data')
// logger.timeEnd('API call')

// =============================================================================
// SPECIFIC USE CASES
// =============================================================================

// IPFS Operations
function IPFSComponent() {
  const { logUpload, logDownload, logRateLimit } = useIPFSLogger('IPFSComponent')

  const uploadFile = async (file: File) => {
    try {
      const startTime = Date.now()
      const hash = await uploadToIPFS(file)
      const duration = Date.now() - startTime

      logUpload(hash, file.size, duration)
    } catch (error) {
      if (error.status === 429) {
        logRateLimit('upload-' + file.name)
      }
    }
  }
}

// Blockchain Operations
function BlockchainComponent() {
  const { logTransaction, logContractCall } = useBlockchainLogger('BlockchainComponent')

  const sendTransaction = async () => {
    const tx = await contract.someMethod()
    logTransaction(tx.hash, 'someMethod', 'pending')

    try {
      const receipt = await tx.wait()
      logTransaction(tx.hash, 'someMethod', 'success', receipt.gasUsed)
    } catch (error) {
      logTransaction(tx.hash, 'someMethod', 'failed', undefined, undefined, error)
    }
  }
}

// =============================================================================
// CONFIGURATION EXAMPLES
// =============================================================================

// Example 1: Development vs Production configuration
if (process.env.NODE_ENV === 'development') {
  // Enable all categories and debug level in development
  configureLogger({
    level: 'debug',
    enabledCategories: ['app', 'auth', 'ipfs', 'blockchain', 'ui', 'api', 'performance', 'user', 'system', 'dev'],
    enableConsole: true,
    enableStorage: true,
    includeStackTrace: true
  })
} else {
  // Only warnings and errors in production
  configureLogger({
    level: 'warn',
    enabledCategories: ['app', 'auth', 'system'],
    enableConsole: true,
    enableStorage: false,
    includeStackTrace: false,
    enableRemoteLogging: true,
    remoteEndpoint: '/api/logs'
  })
}

// Example 2: Filtering by category
// Only show IPFS and blockchain logs
setEnabledCategories(['ipfs', 'blockchain'])

// Example 3: Runtime configuration changes
// Disable all logging except errors
setLogLevel('error')

// Example 4: Enable specific category
enableCategory('performance')

// =============================================================================
// SEARCH AND REPLACE PATTERNS
// =============================================================================

/*
Use these regex patterns to help migrate existing code:

1. Replace console.log:
   Find: console\.log\(([^)]+)\)
   Replace: logger.info($1)

2. Replace console.error:
   Find: console\.error\(([^)]+)\)
   Replace: logger.error($1)

3. Replace console.warn:
   Find: console\.warn\(([^)]+)\)
   Replace: logger.warn($1)

4. Replace console.debug:
   Find: console\.debug\(([^)]+)\)
   Replace: logger.debug($1)

5. Replace console.time/timeEnd:
   Find: console\.time\(([^)]+)\)
   Replace: logger.time($1)

   Find: console\.timeEnd\(([^)]+)\)
   Replace: logger.timeEnd($1)

Note: These are basic patterns. Manual review is recommended for complex cases.
*/

// =============================================================================
// BEST PRACTICES
// =============================================================================

// 1. Use structured logging with data objects
logger.info('User action completed', {
  userId: 'user123',
  action: 'submit_form',
  formId: 'contact',
  timestamp: Date.now(),
  duration: 1234
})

// 2. Use appropriate log levels
logger.debug('Detailed debugging info')     // Development only
logger.info('General information')          // Normal operations
logger.warn('Warning conditions')           // Potential issues
logger.error('Error conditions', error)     // Actual errors

// 3. Use categories to organize logs
const authLogger = createLogger('AuthService', 'auth')
const ipfsLogger = createLogger('IPFSService', 'ipfs')
const uiLogger = createLogger('ButtonComponent', 'ui')

// 4. Include context in log messages
logger.error('Failed to save user profile', error, {
  userId: user.id,
  profileData: sanitizedProfileData,
  timestamp: Date.now(),
  userAgent: navigator.userAgent
})

// 5. Use performance logging for optimization
logger.time('expensive-operation')
await expensiveOperation()
logger.timeEnd('expensive-operation')

// 6. Log user actions for analytics
logUserAction('page_viewed', {
  page: '/dashboard',
  referrer: document.referrer,
  timestamp: Date.now()
})

export {
  // Re-export for easy migration
  logger,
  createLogger,
  useLogger,
  useAuthLogger,
  useIPFSLogger,
  useBlockchainLogger
}
