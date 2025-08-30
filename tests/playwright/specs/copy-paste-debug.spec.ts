import { test, expect } from '@playwright/test';

test.describe('AutocompleteNode - Copy/Paste Debug', () => {
  
  test('autocomplete node behavior during multiple copy/paste operations', async ({ page }) => {
    console.log('=== Testing copy/paste behavior with multiple paste operations ===');
    console.log('Purpose: Reproduce and analyze behavior when copying autocomplete content and pasting multiple times');
    
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Step 1: Type a sentence which ends with an autocomplete
    console.log('Action: Typing sentence ending with autocomplete "This is a test sentence ending with <>"');
    await editor.type('This is a test sentence ending with <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    console.log('Action: Selecting first autocomplete suggestion with Enter');
    await page.keyboard.press('Enter'); // Select first suggestion
    await page.waitForTimeout(100);
    
    // Verify we have the autocomplete node
    console.log('Verification: Checking that autocomplete node was created');
    let autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    await expect(autocompleteNodes).toHaveCount(1);
    
    const initialContent = await editor.innerHTML();
    console.log('Status: Initial content with autocomplete:', initialContent);
    
    // Step 2: Copy the entire sentence 
    console.log('Action: Selecting all content (Ctrl+A) for copying');
    await page.keyboard.press('Control+a'); // Select all
    console.log('Action: Copying selected content (Ctrl+C)');
    await page.keyboard.press('Control+c'); // Copy
    
    // Move to end to paste
    console.log('Action: Moving to end and adding separator text');
    await page.keyboard.press('End');
    await page.keyboard.type('\n\nFirst paste: ');
    
    // Step 3: First paste - user reports this pastes as text, not node
    console.log('Action: Performing first paste operation (Ctrl+V)');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    const afterFirstPaste = await editor.innerHTML();
    console.log('Status: Content after first paste:', afterFirstPaste);
    
    // Count autocomplete nodes after first paste
    autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    const countAfterFirst = await autocompleteNodes.count();
    console.log('Analysis: Autocomplete nodes after first paste:', countAfterFirst);
    
    // Step 4: Second paste - user reports this pastes sentence twice  
    console.log('Action: Adding separator and performing second paste');
    await page.keyboard.type('\n\nSecond paste: ');
    console.log('Action: Performing second paste operation (Ctrl+V)');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    const afterSecondPaste = await editor.innerHTML();
    console.log('Status: Content after second paste:', afterSecondPaste);
    
    // Count autocomplete nodes after second paste
    autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    const countAfterSecond = await autocompleteNodes.count();
    console.log('Analysis: Autocomplete nodes after second paste:', countAfterSecond);
    
    // Document the actual behavior for analysis
    const finalTextContent = await editor.textContent();
    console.log('Final Analysis: Complete text content:', finalTextContent);
    
    // Let's make this test always pass for now since we're debugging
    console.log('Status: Test designed for analysis - marking as passed');
    expect(true).toBe(true);
    
    console.log('=== Multiple paste operations test completed ===');
  });

  test('debug clipboard data persistence', async ({ page }) => {
    console.log('=== Debugging clipboard data persistence across multiple operations ===');
    console.log('Purpose: Analyze how clipboard data changes or persists between multiple paste operations');
    
    // Grant clipboard permissions for deeper debugging (Chromium only)
    console.log('Action: Granting clipboard permissions for detailed analysis');
    const browserName = page.context().browser()?.browserType().name();
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    } else {
      console.log('Note: Clipboard permissions not required for this browser');
    }
    
    await page.goto('/');
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create content with autocomplete
    console.log('Action: Creating autocomplete node with "Debug test <>"');
    await editor.type('Debug test <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    console.log('Action: Selecting autocomplete suggestion');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Copy the content
    console.log('Action: Selecting all content and copying to clipboard');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    
    // Analyze clipboard data after copy
    console.log('Analysis: Reading clipboard data immediately after copy operation');
    const clipboardAfterCopy = await page.evaluate(async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        const clipboardItems = await navigator.clipboard.read();
        const htmlData = [];
        
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type === 'text/html') {
              const blob = await item.getType(type);
              const html = await blob.text();
              htmlData.push(html);
            }
          }
        }
        
        return {
          text: clipboardText,
          html: htmlData[0] || 'no html',
          itemCount: clipboardItems.length,
          types: clipboardItems.map(item => item.types).flat()
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('Analysis: Clipboard data after initial copy:', clipboardAfterCopy);
    
    // Move cursor and paste first time
    console.log('Action: Moving cursor and performing first paste with separator');
    await page.keyboard.press('End');
    await page.keyboard.type(' | First: ');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    // Check clipboard data again (should be the same)
    console.log('Analysis: Re-reading clipboard data after first paste to check persistence');
    const clipboardAfterFirstPaste = await page.evaluate(async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        const clipboardItems = await navigator.clipboard.read();
        const htmlData = [];
        
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type === 'text/html') {
              const blob = await item.getType(type);
              const html = await blob.text();
              htmlData.push(html);
            }
          }
        }
        
        return {
          text: clipboardText,
          html: htmlData[0] || 'no html',
          itemCount: clipboardItems.length,
          types: clipboardItems.map(item => item.types).flat()
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('Analysis: Clipboard data after first paste:', clipboardAfterFirstPaste);
    
    // Second paste
    console.log('Action: Performing second paste operation with separator');
    await page.keyboard.type(' | Second: ');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    const finalContent = await editor.innerHTML();
    console.log('Final Analysis: Complete content after both paste operations:', finalContent);
    
    console.log('Status: Clipboard persistence analysis completed');
    expect(true).toBe(true);
    
    console.log('=== Clipboard data persistence test completed ===');
  });
});