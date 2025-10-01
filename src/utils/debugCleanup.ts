// Debug utility to test cleanup functionality
import { globalCleanup } from '../lib/globalCleanup'

export function debugCleanupSystem() {
  console.log('=== Intel Scout Cleanup Debug ===')

  // Check current resource counts
  const counts = globalCleanup.getResourceCounts()
  console.log('Current resources:')
  console.log(`- Intervals: ${counts.intervals}`)
  console.log(`- AbortControllers: ${counts.abortControllers}`)
  console.log(`- Cleanup functions: ${counts.cleanupFunctions}`)

  // Test force cleanup
  console.log('\nTesting force cleanup...')
  globalCleanup.forceCleanup()

  const countsAfter = globalCleanup.getResourceCounts()
  console.log('After cleanup:')
  console.log(`- Intervals: ${countsAfter.intervals}`)
  console.log(`- AbortControllers: ${countsAfter.abortControllers}`)
  console.log(`- Cleanup functions: ${countsAfter.cleanupFunctions}`)

  console.log(`Cleanup performed: ${globalCleanup.isCleanupPerformed()}`)
  console.log('=== Debug Complete ===')
}

// Expose to window for manual testing
if (process.env.NODE_ENV === 'development') {
  ;(window as any).debugCleanup = debugCleanupSystem
}