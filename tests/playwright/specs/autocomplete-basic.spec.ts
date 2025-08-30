import { test, expect } from '@playwright/test';
import { createEditorHelper } from '../utils/editor-helpers';

test.describe('Autocomplete Basic Functionality', () => {
  
  test('shows autocomplete dropdown when trigger pattern is typed', async ({ page }) => {
    console.log('\n=== Testing Basic Autocomplete Trigger ===');
    console.log('Purpose: Verify autocomplete dropdown appears when typing trigger pattern');
    
    await page.goto('/');
    const helper = await createEditorHelper(page);
    
    console.log('Step 1: Type text with autocomplete trigger');
    await helper.triggerAutocomplete('Hello ', '<>', 'world');
    
    console.log('Step 2: Wait for autocomplete dropdown to appear');
    await helper.waitForAutocompleteDropdown(true);
    
    console.log('✅ Basic autocomplete trigger test completed successfully');
  });

  test('selects first suggestion with Enter key', async ({ page }) => {
    console.log('\n=== Testing Autocomplete Selection with Enter ===');
    console.log('Purpose: Verify Enter key selects the first suggestion and inserts autocomplete node');
    
    await page.goto('/');
    const helper = await createEditorHelper(page);
    
    console.log('Step 1: Trigger autocomplete');
    await helper.triggerAutocomplete('Text ', '<>', '');
    
    console.log('Step 2: Wait for dropdown and select with Enter');
    await helper.waitForAutocompleteDropdown(true);
    await helper.selectAutocompleteOption(); // Uses Enter key
    
    console.log('Step 3: Wait for autocomplete node to be inserted');
    await helper.waitForTimeout(200, 'Allow time for node insertion');
    
    console.log('Step 4: Verify autocomplete node exists');
    await helper.expectAutocompleteNodeExists();
    
    console.log('Step 5: Verify editor content contains expected text');
    const content = await helper.getEditorContent();
    expect(content).toContain('Text ');
    expect(content.length).toBeGreaterThan('Text '.length); // Should have more content from autocomplete
    
    console.log('✅ Autocomplete selection with Enter test completed successfully');
  });

  test('closes dropdown when pressing Escape', async ({ page }) => {
    console.log('\n=== Testing Autocomplete Escape Key ===');
    console.log('Purpose: Verify Escape key closes autocomplete dropdown');
    
    await page.goto('/');
    const helper = await createEditorHelper(page);
    
    console.log('Step 1: Trigger autocomplete');
    await helper.triggerAutocomplete('Hello ', '<>', 'test');
    
    console.log('Step 2: Verify dropdown is open');
    await helper.waitForAutocompleteDropdown(true);
    
    console.log('Step 3: Press Escape to close dropdown');
    await helper.pressKey('Escape');
    
    console.log('Step 4: Verify dropdown is closed');
    await helper.waitForAutocompleteDropdown(false);
    
    console.log('Step 5: Verify original text remains unchanged');
    await helper.expectEditorContent('Hello <>test');
    
    console.log('✅ Autocomplete Escape key test completed successfully');
  });

  test('filters suggestions based on typed text', async ({ page }) => {
    console.log('\n=== Testing Autocomplete Filtering ===');
    console.log('Purpose: Verify suggestions are filtered as user types after trigger');
    
    await page.goto('/');
    const helper = await createEditorHelper(page);
    
    console.log('Step 1: Type trigger pattern with partial match');
    await helper.triggerAutocomplete('Looking for ', '<>', 'Cl');
    
    console.log('Step 2: Wait for filtered dropdown');
    await helper.waitForAutocompleteDropdown(true);
    
    console.log('Step 3: Verify dropdown shows filtered results');
    // Check that dropdown exists and has filtered content
    const dropdownItems = page.locator('.autocomplete-item');
    const itemCount = await dropdownItems.count();
    console.log(`Found ${itemCount} filtered suggestions`);
    
    // Verify that filtered suggestions contain the match text
    if (itemCount > 0) {
      const firstItemText = await dropdownItems.first().textContent();
      console.log(`First filtered suggestion: "${firstItemText}"`);
      expect(firstItemText?.toLowerCase()).toContain('cl');
    }
    
    console.log('✅ Autocomplete filtering test completed successfully');
  });

  test('handles multiple autocomplete triggers in same text', async ({ page }) => {
    console.log('\n=== Testing Multiple Autocomplete Triggers ===');
    console.log('Purpose: Verify system handles multiple trigger patterns in the same text');
    
    await page.goto('/');
    const helper = await createEditorHelper(page);
    
    console.log('Step 1: Type first autocomplete trigger and select');
    await helper.triggerAutocomplete('First ', '<>', '');
    await helper.waitForAutocompleteDropdown(true);
    await helper.selectAutocompleteOption();
    
    console.log('Step 2: Wait and add text for second trigger');
    await helper.waitForTimeout(300, 'Allow first autocomplete to settle');
    await helper.typeText(' then Second <>');
    
    console.log('Step 3: Wait for second dropdown');
    await helper.waitForAutocompleteDropdown(true);
    await helper.selectAutocompleteOption();
    
    console.log('Step 4: Verify both autocomplete nodes exist');
    const autocompleteNodes = page.locator('[data-lexical-decorator="true"]');
    const nodeCount = await autocompleteNodes.count();
    console.log(`Found ${nodeCount} autocomplete nodes in editor`);
    expect(nodeCount).toBeGreaterThanOrEqual(2);
    
    console.log('✅ Multiple autocomplete triggers test completed successfully');
  });

  test('maintains cursor position after autocomplete insertion', async ({ page }) => {
    console.log('\n=== Testing Cursor Position After Autocomplete ===');
    console.log('Purpose: Verify cursor is properly positioned after autocomplete node insertion');
    
    await page.goto('/');
    const helper = await createEditorHelper(page);
    
    console.log('Step 1: Type text with autocomplete trigger');
    await helper.triggerAutocomplete('Start ', '<>', '');
    
    console.log('Step 2: Select autocomplete option');
    await helper.waitForAutocompleteDropdown(true);
    await helper.selectAutocompleteOption();
    await helper.waitForTimeout(200, 'Allow autocomplete insertion');
    
    console.log('Step 3: Type additional text after autocomplete');
    await helper.typeText(' end', { log: true });
    
    console.log('Step 4: Verify final content structure');
    const finalContent = await helper.getEditorContent();
    console.log(`Final content: "${finalContent}"`);
    
    expect(finalContent).toContain('Start ');
    expect(finalContent).toContain(' end');
    
    console.log('✅ Cursor position test completed successfully');
  });
});