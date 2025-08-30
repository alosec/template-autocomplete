import { test, expect } from '@playwright/test';

test.describe('AutocompleteNode - Backspace Behavior - The Critical Edge Case', () => {
  
  test('removes entire autocomplete node with single backspace from outside', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Type the trigger pattern to show autocomplete
    await editor.type('Text <>');
    
    // Wait for autocomplete dropdown to appear
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    
    // Press Enter to select the first suggestion 
    await page.keyboard.press('Enter');
    
    // Wait for the autocomplete node to be inserted
    await page.waitForTimeout(100);
    
    // Verify initial content contains autocomplete node
    const initialContent = await editor.textContent();
    expect(initialContent).toContain('Text ');
    expect(initialContent).toMatch(/Text .+/); // Should have text after "Text "
    
    // Position cursor at the end (after autocomplete node) and press backspace
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    
    // STRONG ASSERTION: Autocomplete node should be completely removed with one backspace
    // This is per the specification: "Entirely removable with one backspace key press"
    const finalContent = await editor.textContent();
    expect(finalContent).toBe('Text ');
    expect(finalContent).not.toContain('Claude');
    expect(finalContent).not.toContain('Urban');
    expect(finalContent).not.toContain('hello');
  });

  test('THE CRITICAL BUG: typing attempt changes subsequent backspace behavior', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    console.log('=== Starting critical bug test ===');
    
    // Type the trigger pattern and create autocomplete node
    console.log('Action: Typing "Before <>" to trigger autocomplete');
    await editor.type('Before <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    console.log('Action: Pressing Enter to select autocomplete suggestion');
    await page.keyboard.press('Enter');
    
    // Wait for the autocomplete node to be inserted
    await page.waitForTimeout(100);
    
    // STEP 1: Verify initial state
    let initialContent = await editor.textContent();
    console.log('Initial content after autocomplete insertion:', JSON.stringify(initialContent));
    expect(initialContent).toContain('Before ');
    expect(initialContent).toMatch(/Before .+/); // Should have text after "Before "
    
    // STEP 2: Attempt to type in autocomplete node (this should trigger the bug)
    // After Enter, cursor is at the end. Move back into the autocomplete node.
    console.log('Action: Moving cursor back into autocomplete node with left arrows');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft'); 
    await page.keyboard.press('ArrowLeft');
    
    // Attempt to type (should be blocked but might change internal state)
    console.log('Action: Attempting to type "BLOCKED_TEXT" (should be blocked)');
    await page.keyboard.type('BLOCKED_TEXT');
    await page.waitForTimeout(50);
    
    // Content should still be the same (typing was blocked)
    let contentAfterTypingAttempt = await editor.textContent();
    console.log('Content after typing attempt:', JSON.stringify(contentAfterTypingAttempt));
    expect(contentAfterTypingAttempt).not.toContain('BLOCKED_TEXT');
    expect(contentAfterTypingAttempt).toContain('Before ');
    
    // STEP 3: Now position cursor after autocomplete node and try backspace
    console.log('Action: Moving cursor to end position');
    await page.keyboard.press('End');
    
    // Execute backspace - THIS IS WHERE THE BUG SHOULD MANIFEST
    // If the bug exists, backspace might not work properly after typing attempt
    console.log('Action: Pressing Backspace (this is where the bug should manifest)');
    await page.keyboard.press('Backspace');
    
    // CRITICAL TEST: Verify that backspace still works correctly
    // The autocomplete node should be completely removed in one backspace
    const finalContent = await editor.textContent();
    console.log('Final content after backspace:', JSON.stringify(finalContent));
    console.log('Expected: "Before ", Actual:', JSON.stringify(finalContent));
    
    expect(finalContent).toBe('Before  '); // Two spaces: original + trailing space from autocomplete
    expect(finalContent).not.toContain('Claude');
    expect(finalContent).not.toContain('Urban');
    expect(finalContent).not.toContain('hello');
    
    console.log('=== Critical bug test completed ===');
  });

  test('backspace from beginning of text node removes previous autocomplete node', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready  
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create initial structure: "Start [AutocompleteNode] End"
    await editor.type('Start <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.type(' End');
    
    // Wait for content to settle
    await page.waitForTimeout(100);
    
    let initialContent = await editor.textContent();
    expect(initialContent).toContain('Start ');
    expect(initialContent).toContain(' End');
    expect(initialContent).toMatch(/Start .+ End/);
    
    // Position cursor at beginning of " End" text (right after autocomplete node)
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft'); // Move back to beginning of " End"
    await page.keyboard.press('ArrowLeft'); // Move back to beginning of " End"
    await page.keyboard.press('ArrowLeft'); // Move back to beginning of " End"
    
    // Execute backspace from beginning of text node
    await page.keyboard.press('Backspace');
    
    // Autocomplete node should be removed
    const finalContent = await editor.textContent();
    expect(finalContent).toBe('Start  End');
    expect(finalContent).not.toContain('Claude');
    expect(finalContent).not.toContain('Urban');
    expect(finalContent).not.toContain('hello');
  });

  test('handles multiple consecutive autocomplete nodes with backspace', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create multiple consecutive autocomplete nodes
    await editor.type('<>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter'); // First node
    
    await page.keyboard.type('<>');  
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('ArrowDown'); // Select second suggestion
    await page.keyboard.press('Enter'); // Second node
    
    await page.keyboard.type('<>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('ArrowDown'); // Select third suggestion
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // Third node
    
    // Wait for content to settle
    await page.waitForTimeout(100);
    
    let initialContent = await editor.textContent();
    expect(initialContent).toBeTruthy();
    expect(initialContent.length).toBeGreaterThan(0);
    
    // Position cursor at end
    await page.keyboard.press('End');
    
    // First backspace should remove last node
    await page.keyboard.press('Backspace');
    let contentAfterFirst = await editor.textContent();
    expect(contentAfterFirst.length).toBeLessThan(initialContent.length);
    
    // Second backspace should remove second-to-last node
    await page.keyboard.press('Backspace');
    let contentAfterSecond = await editor.textContent(); 
    expect(contentAfterSecond.length).toBeLessThan(contentAfterFirst.length);
    
    // Third backspace should remove first node
    await page.keyboard.press('Backspace');
    let finalContent = await editor.textContent();
    expect(finalContent).toBe('');
  });
});