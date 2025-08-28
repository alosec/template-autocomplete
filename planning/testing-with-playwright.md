# Testing Strategy: Transition to Playwright for DOM-Heavy Interactions

## Problem Statement

The current BackspaceBehavior.test.tsx tests fail in JSDOM because they rely on Lexical's internal use of `domSelection.modify()` - a native browser API that JSDOM doesn't implement. Attempting to mock this API leads to brittle, "reward-hacking" solutions that don't actually validate real browser behavior.

## Why Playwright is the Right Solution

### 1. Real Browser APIs
- **Native `domSelection.modify()`**: Playwright runs in real browsers (Chromium, Firefox, WebKit)
- **Authentic DOM behavior**: No need to mock complex selection APIs
- **Lexical's own approach**: Lexical team uses Playwright for complex interactions like backspace

### 2. Better Test Validity  
- Tests actual user interactions rather than mocked approximations
- Catches real browser compatibility issues
- Validates complex contentEditable behavior that JSDOM can't simulate

### 3. Rich Testing Capabilities
- Visual regression testing with screenshots
- Real keyboard/mouse events
- Network request interception
- Performance metrics and traces

## Implementation Strategy

### Phase 1: Setup and Infrastructure

#### 1.1 Install and Configure Playwright
```bash
npm install --save-dev @playwright/test
npx playwright install
```

#### 1.2 Project Structure
```
tests/
├── e2e/                           # End-to-end Playwright tests
│   ├── fixtures/                  # Test data and page objects
│   ├── specs/
│   │   ├── backspace-behavior.spec.ts     # Convert BackspaceBehavior.test.tsx
│   │   ├── autocomplete-interactions.spec.ts
│   │   ├── selection-manipulation.spec.ts
│   │   └── keyboard-navigation.spec.ts
│   └── utils/                     # E2E test utilities
├── unit/                          # Keep existing Jest tests for pure logic
├── visual/                        # Visual regression tests
└── config/
    └── playwright.config.ts
```

#### 1.3 Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',  
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Phase 2: Convert BackspaceBehavior Tests

#### 2.1 Test Conversion Strategy
Convert the failing unit tests to Playwright e2e tests:

**Before (JSDOM - Fails)**:
```typescript
// BackspaceBehavior.test.tsx
test('removes entire autocomplete node with single backspace from outside', async () => {
  // Insert autocomplete node
  await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Text ', 'AutocompleteNode', '');
  // Position cursor and dispatch backspace command
  lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
  // Assert content
});
```

**After (Playwright - Works)**:
```typescript
// tests/e2e/specs/backspace-behavior.spec.ts
test('removes entire autocomplete node with single backspace from outside', async ({ page }) => {
  await page.goto('/');
  
  // Type trigger to show autocomplete
  await page.locator('[contenteditable]').type('Text <>');
  await page.keyboard.press('Enter'); // Select first suggestion
  
  // Position cursor after autocomplete node and press backspace
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  
  // Assert final content
  await expect(page.locator('[contenteditable]')).toHaveText('Text ');
});
```

#### 2.2 Test Scenarios to Convert

1. **Single Backspace Removal**
   - Create autocomplete node via typing trigger
   - Position cursor after node
   - Verify single backspace removes entire node

2. **Critical Bug: Typing Attempt Changes Behavior**
   - Create autocomplete node
   - Attempt to type within node (should be blocked)
   - Verify backspace still works correctly after attempt

3. **Backspace from Text Node Beginning**
   - Setup: `"Start |AutocompleteNode| End"` with cursor at beginning of "End"
   - Action: Press backspace
   - Expected: AutocompleteNode removed, cursor positioned correctly

4. **Multiple Consecutive Nodes**
   - Setup: Multiple autocomplete nodes in sequence
   - Action: Sequential backspace presses
   - Expected: Each backspace removes one complete node

### Phase 3: Enhanced Testing Capabilities

#### 3.1 Visual Regression Testing
```typescript
test('autocomplete dropdown visual appearance', async ({ page }) => {
  await page.goto('/');
  await page.locator('[contenteditable]').type('<>');
  
  // Wait for dropdown to appear
  await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
  
  // Visual comparison
  await expect(page).toHaveScreenshot('autocomplete-dropdown.png');
});
```

#### 3.2 Cross-Browser Validation
```typescript
// Automatically runs on Chromium, Firefox, and WebKit
test('backspace behavior cross-browser compatibility', async ({ page, browserName }) => {
  // Test implementation works across all browsers
  console.log(`Testing on ${browserName}`);
  // ... test implementation
});
```

#### 3.3 Performance Testing
```typescript
test('backspace performance with large documents', async ({ page }) => {
  await page.goto('/');
  
  // Create large document with many autocomplete nodes
  for (let i = 0; i < 100; i++) {
    await page.locator('[contenteditable]').type(`<>Item${i} `);
    await page.keyboard.press('Enter');
  }
  
  // Measure backspace performance
  const start = Date.now();
  await page.keyboard.press('Backspace');
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(100); // Should be fast
});
```

### Phase 4: Integration with Existing Architecture

#### 4.1 Hybrid Testing Approach
```
Testing Responsibilities:
├── Jest (Unit/Integration)
│   ├── Pure logic functions (autocompleteUtils.ts)
│   ├── Hook behavior (useAutocompleteState.ts) 
│   ├── Component isolation (AutocompleteNode logic)
│   └── State management
└── Playwright (E2E/Visual)
    ├── DOM interactions (backspace, selection)
    ├── Browser API dependencies
    ├── User workflows
    └── Visual regressions
```

#### 4.2 CI/CD Integration
```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm test

- name: Run E2E Tests  
  run: npx playwright test

- name: Upload Playwright Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Migration Plan

### Step 1: Quick Win (Current Session)
- [ ] Create basic Playwright setup
- [ ] Convert 1-2 BackspaceBehavior tests as proof of concept
- [ ] Verify tests pass in real browser environment

### Step 2: Full Migration (Next Session)  
- [ ] Convert remaining BackspaceBehavior tests
- [ ] Add visual regression tests for autocomplete UI
- [ ] Implement cross-browser testing

### Step 3: Enhanced Testing (Future)
- [ ] Performance testing suite
- [ ] Accessibility testing with real screen readers
- [ ] Mobile/responsive behavior testing

## Benefits of This Approach

1. **Authenticity**: Tests real browser behavior, not mocked approximations
2. **Robustness**: Catches issues that unit tests miss
3. **Confidence**: High confidence that features work for actual users
4. **Documentation**: Tests serve as living documentation of user interactions
5. **Future-Proof**: Scales to more complex interactions and visual testing

## Risks and Mitigation

**Risk**: Slower test execution than unit tests
**Mitigation**: Parallel execution, selective test running

**Risk**: Flaky tests due to timing issues  
**Mitigation**: Playwright's built-in waiting and retry mechanisms

**Risk**: More complex CI setup
**Mitigation**: Playwright's excellent CI integration and documentation

## Conclusion

Transitioning BackspaceBehavior tests to Playwright solves the fundamental issue: testing complex DOM interactions in an environment that actually supports them. This approach aligns with Lexical's own testing strategy and provides a solid foundation for more sophisticated testing as the editor grows.

The hybrid approach (Jest for logic, Playwright for interactions) gives us the best of both worlds: fast unit tests for pure logic and authentic integration tests for user-facing behavior.