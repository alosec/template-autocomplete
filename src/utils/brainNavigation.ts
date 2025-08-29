import { AutocompleteItem } from '../types/GlobalBrainTypes';

// Navigation history management
export class NavigationHistory {
  private history: number[] = [];
  private currentIndex: number = -1;
  private forwardStack: number[] = [];

  addToHistory(index: number): void {
    // If we're in the middle of history (after going back), clear forward stack
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    // Clear forward stack when navigating to new item
    this.forwardStack = [];
    
    // Add to history
    this.history.push(index);
    this.currentIndex = this.history.length - 1;
  }

  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  goBack(): number | null {
    if (!this.canGoBack()) return null;
    
    // Move current item to forward stack
    this.forwardStack.push(this.history[this.currentIndex]);
    this.currentIndex--;
    return this.history[this.currentIndex];
  }

  goForward(): number | null {
    if (!this.canGoForward()) return null;
    
    const forwardIndex = this.forwardStack.pop()!;
    this.currentIndex++;
    this.history[this.currentIndex] = forwardIndex;
    return forwardIndex;
  }

  getCurrentIndex(): number {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : -1;
  }

  size(): number {
    return this.history.length;
  }
}

// Intelligent next item selection function
export const getNextIntelligentIndex = (items: AutocompleteItem[], seen: Set<number>, currentIdx: number): number => {
  if (items.length === 0) return 0;
  
  // Create weighted pool based on priority and item count
  const weightedPool: number[] = [];
  
  items.forEach((item, index) => {
    if (index === currentIdx) return; // Skip current item
    
    let weight = 1;
    
    // Priority weighting
    if (item.priority === 'high') weight += 3;
    else if (item.priority === 'medium') weight += 1;
    
    // Item count weighting (categories with more items get slight boost)
    if ('itemCount' in item && item.itemCount && item.itemCount > 100) weight += 1;
    
    // Unseen items get significant boost
    if (!seen.has(index)) weight += 5;
    
    // Add to pool based on weight
    for (let i = 0; i < weight; i++) {
      weightedPool.push(index);
    }
  });
  
  // If no weighted options, fallback to unseen or random
  if (weightedPool.length === 0) {
    const unseenIndices = items
      .map((_, index) => index)
      .filter(index => !seen.has(index) && index !== currentIdx);
    
    if (unseenIndices.length > 0) {
      return unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    }
    
    // All seen, pick random different from current
    const availableIndices = items
      .map((_, index) => index)
      .filter(index => index !== currentIdx);
    return availableIndices[Math.floor(Math.random() * availableIndices.length)] || 0;
  }
  
  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
};