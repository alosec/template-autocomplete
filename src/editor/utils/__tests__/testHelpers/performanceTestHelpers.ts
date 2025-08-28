/**
 * Performance testing utilities for autocomplete system
 */

// Measure execution time of async functions
export const measurePerformance = async (fn: () => Promise<void>): Promise<number> => {
  const startTime = performance.now();
  await fn();
  const endTime = performance.now();
  return endTime - startTime;
};

// Get memory usage (if available)
export const getMemoryUsage = (): number => {
  if (typeof (performance as any).memory !== 'undefined') {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0; // Return 0 if memory measurement not available
};

// Performance thresholds for different operations
export const performanceThresholds = {
  triggerDetection: 100, // ms
  suggestionFiltering: 200, // ms
  nodeCreation: 50, // ms
  backspaceRemoval: 100, // ms
  navigationCycle: 10, // ms per navigation
  bulkOperations: 5000, // ms for 100+ operations
  memoryIncrease: 10 * 1024 * 1024, // 10MB max increase
};

// Simulate rapid interactions
export const simulateRapidInteraction = async (
  lexicalEditor: any,
  actions: string[],
  data?: string[]
): Promise<void> => {
  const promises = actions.map(async (action, index) => {
    const delay = index * 10; // Stagger by 10ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    switch (action) {
      case 'type':
        if (data && data[index]) {
          // Simulate typing
          lexicalEditor.dispatchCommand('CONTROLLED_TEXT_INSERTION_COMMAND', data[index]);
        }
        break;
      case 'backspace':
        lexicalEditor.dispatchCommand('KEY_BACKSPACE_COMMAND', new KeyboardEvent('keydown'));
        break;
      case 'escape':
        lexicalEditor.dispatchCommand('KEY_ESCAPE_COMMAND', new KeyboardEvent('keydown'));
        break;
    }
  });
  
  await Promise.all(promises);
};

// Benchmark a series of operations
export const benchmarkOperations = async (
  operations: Array<{ name: string; fn: () => Promise<void> }>
): Promise<{ [key: string]: number }> => {
  const results: { [key: string]: number } = {};
  
  for (const operation of operations) {
    const duration = await measurePerformance(operation.fn);
    results[operation.name] = duration;
  }
  
  return results;
};

// Memory leak detection helper
export const detectMemoryLeak = async (
  operation: () => Promise<void>,
  iterations: number = 100
): Promise<{ initialMemory: number; finalMemory: number; leakDetected: boolean }> => {
  const initialMemory = getMemoryUsage();
  
  for (let i = 0; i < iterations; i++) {
    await operation();
    
    // Trigger garbage collection if available (test environments)
    if (global.gc) {
      global.gc();
    }
  }
  
  const finalMemory = getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;
  const leakDetected = memoryIncrease > performanceThresholds.memoryIncrease;
  
  return {
    initialMemory,
    finalMemory,
    leakDetected
  };
};