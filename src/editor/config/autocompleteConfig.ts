/**
 * Configuration for autocomplete functionality
 */

export const TRIGGER_PATTERN = '<>';

// Global Brain suggestions - extracted from original plugin
export const GLOBAL_BRAIN_SUGGESTIONS = [
  "Claude's Investigations",
  "impt unsolved problems", 
  "Gut-Brain Axis Drug Repurposing",
  "Urban vertical farming networks",
  "Ocean plastic cleanup initiatives", 
  "Creating universal cancer vaccines",
  "Global basic income pilot programs",
  "AI consciousness detection methods",
  "gut-brain", "drug-repurposing", "research",
  "vertical farming", "urban", "agriculture", "sustainability",
  "ocean", "plastic", "cleanup", "environment", 
  "cancer", "vaccines", "oncology", "prevention",
  "basic income", "pilot", "economic policy",
  "consciousness", "detection",
  // Basic UI suggestions
  "component", "container", "button", "input", "form",
  "header", "footer", "navigation", "sidebar", "modal"
] as const;

export const DROPDOWN_CONFIG = {
  width: 250,
  height: 200,
  offsetTop: 5,
  offsetLeft: 0
} as const;

export type AutocompleteSuggestion = typeof GLOBAL_BRAIN_SUGGESTIONS[number];