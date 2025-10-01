// Global cleanup utility to prevent resource leaks
class GlobalCleanupManager {
  private intervals = new Set<NodeJS.Timeout>()
  private abortControllers = new Set<AbortController>()
  private cleanupFunctions = new Set<() => void>()
  private isCleanedUp = false

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Cleanup on page unload/refresh
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })

    // Cleanup on page hide (mobile browsers)
    window.addEventListener('pagehide', () => {
      this.cleanup()
    })

    // Cleanup on visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.cleanup()
      }
    })
  }

  // Register an interval for cleanup
  registerInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval)
  }

  // Unregister an interval (when manually cleared)
  unregisterInterval(interval: NodeJS.Timeout): void {
    this.intervals.delete(interval)
  }

  // Register an AbortController for cleanup
  registerAbortController(controller: AbortController): void {
    this.abortControllers.add(controller)
  }

  // Unregister an AbortController
  unregisterAbortController(controller: AbortController): void {
    this.abortControllers.delete(controller)
  }

  // Register a custom cleanup function
  registerCleanupFunction(fn: () => void): void {
    this.cleanupFunctions.add(fn)
  }

  // Unregister a cleanup function
  unregisterCleanupFunction(fn: () => void): void {
    this.cleanupFunctions.delete(fn)
  }

  // Perform complete cleanup
  cleanup(): void {
    if (this.isCleanedUp) return

    console.log('GlobalCleanupManager: Performing cleanup...')

    // Clear all intervals
    this.intervals.forEach(interval => {
      try {
        clearInterval(interval)
      } catch (e) {
        console.warn('Failed to clear interval:', e)
      }
    })
    this.intervals.clear()

    // Abort all pending requests
    this.abortControllers.forEach(controller => {
      try {
        if (!controller.signal.aborted) {
          controller.abort('Page unload cleanup')
        }
      } catch (e) {
        console.warn('Failed to abort controller:', e)
      }
    })
    this.abortControllers.clear()

    // Run custom cleanup functions
    this.cleanupFunctions.forEach(fn => {
      try {
        fn()
      } catch (e) {
        console.warn('Failed to run cleanup function:', e)
      }
    })
    this.cleanupFunctions.clear()

    this.isCleanedUp = true
    console.log('GlobalCleanupManager: Cleanup complete')
  }

  // Force cleanup (for testing or manual trigger)
  forceCleanup(): void {
    this.isCleanedUp = false
    this.cleanup()
  }

  // Check if cleanup has been performed
  isCleanupPerformed(): boolean {
    return this.isCleanedUp
  }

  // Get current resource counts (for debugging)
  getResourceCounts(): { intervals: number; abortControllers: number; cleanupFunctions: number } {
    return {
      intervals: this.intervals.size,
      abortControllers: this.abortControllers.size,
      cleanupFunctions: this.cleanupFunctions.size
    }
  }
}

// Create global instance
const globalCleanup = new GlobalCleanupManager()

// Helper function to create a managed interval
export function createManagedInterval(callback: () => void, delay: number): NodeJS.Timeout {
  const interval = setInterval(callback, delay)
  globalCleanup.registerInterval(interval)

  // Return enhanced interval with cleanup
  const originalClear = () => {
    clearInterval(interval)
    globalCleanup.unregisterInterval(interval)
  }

  // Override clearInterval for this specific interval
  ;(interval as any).clear = originalClear

  return interval
}

// Helper function to create a managed AbortController
export function createManagedAbortController(): AbortController {
  const controller = new AbortController()
  globalCleanup.registerAbortController(controller)

  // Override abort to auto-unregister
  const originalAbort = controller.abort.bind(controller)
  controller.abort = (reason?: any) => {
    originalAbort(reason)
    globalCleanup.unregisterAbortController(controller)
  }

  return controller
}

// Helper function to register custom cleanup
export function registerCleanup(fn: () => void): () => void {
  globalCleanup.registerCleanupFunction(fn)

  // Return unregister function
  return () => {
    globalCleanup.unregisterCleanupFunction(fn)
  }
}

// Export the manager for direct use
export { globalCleanup }

// Development helper
if (process.env.NODE_ENV === 'development') {
  // Expose to window for debugging
  ;(window as any).globalCleanup = globalCleanup
}