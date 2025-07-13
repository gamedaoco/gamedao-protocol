/**
 * Migration utility to replace console.log statements with structured logging
 * Run this script to find and replace console.log statements in your codebase
 */

import { logger } from './logger'

// Migration patterns for common console.log usage
export const migrationPatterns = {
  // Basic console.log -> logger.info
  'console.log': 'logger.info',

  // Error logging
  'console.error': 'logger.error',

  // Warning logging
  'console.warn': 'logger.warn',

  // Debug logging
  'console.debug': 'logger.debug',

  // Info logging
  'console.info': 'logger.info',

  // Time/performance logging
  'console.time': 'logger.time',
  'console.timeEnd': 'logger.timeEnd',

  // Group logging
  'console.group': 'logger.group',
  'console.groupEnd': 'logger.groupEnd'
}

// Quick migration examples for common patterns
export const migrationExamples = {
  // Organization creation logging
  organizationCreation: {
    before: "console.log('🚀 Creating organization with params:', params)",
    after: "logger.info('Creating organization', { params })"
  },

  // Error handling
  errorHandling: {
    before: "console.error('❌ Organization creation failed:', error)",
    after: "logger.error('Organization creation failed', error)"
  },

  // Debug information
  debugInfo: {
    before: "console.log('🔍 Error state check:', { createError, isCreating })",
    after: "logger.debug('Error state check', { createError, isCreating })"
  },

  // Contract interactions
  contractInteraction: {
    before: "console.log('✅ Contract addresses loaded:', addresses)",
    after: "logger.info('Contract addresses loaded', { addresses })"
  },

  // IPFS operations
  ipfsOperations: {
    before: "console.log('📤 Uploading to IPFS:', file)",
    after: "logger.info('Uploading to IPFS', { fileName: file.name, fileSize: file.size })"
  }
}

// Helper function to create structured log data
export function createLogData(originalArgs: any[]): any {
  if (originalArgs.length === 1) {
    return typeof originalArgs[0] === 'string' ? {} : originalArgs[0]
  }

  const [message, ...data] = originalArgs
  if (data.length === 1 && typeof data[0] === 'object') {
    return data[0]
  }

  return { data }
}

// Helper function to extract message from console.log args
export function extractMessage(originalArgs: any[]): string {
  const firstArg = originalArgs[0]
  if (typeof firstArg === 'string') {
    // Remove emoji and clean up message
    return firstArg.replace(/[^\w\s\-:]/g, '').trim()
  }
  return 'Log message'
}

// Migration helper for components
export function migrateComponentLogs(componentName: string) {
  // This would be used in actual migration
  return {
    info: (message: string, data?: any) => logger.info(message, data),
    error: (message: string, error?: Error, data?: any) => logger.error(message, error, data),
    warn: (message: string, data?: any) => logger.warn(message, data),
    debug: (message: string, data?: any) => logger.debug(message, data)
  }
}

// Export commonly used loggers for quick migration
export const organizationLogger = migrateComponentLogs('OrganizationCreation')
export const contractLogger = migrateComponentLogs('ContractInteraction')
export const ipfsLogger = migrateComponentLogs('IPFSOperations')
export const authLogger = migrateComponentLogs('Authentication')
