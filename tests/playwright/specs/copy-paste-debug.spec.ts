import { test, expect } from '@playwright/test';

test.describe('AutocompleteNode - Copy/Paste Debug', () => {
  
  test('reproduce the exact bug described by user', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Step 1: Type a sentence which ends with an autocomplete
    await editor.type('This is a test sentence ending with <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter'); // Select first suggestion
    await page.waitForTimeout(100);
    
    // Verify we have the autocomplete node
    let autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    await expect(autocompleteNodes).toHaveCount(1);
    
    const initialContent = await editor.innerHTML();
    console.log('1. Initial content with autocomplete:', initialContent);
    
    // Step 2: Copy the entire sentence 
    await page.keyboard.press('Control+a'); // Select all
    await page.keyboard.press('Control+c'); // Copy
    
    // Move to end to paste
    await page.keyboard.press('End');
    await page.keyboard.type('\n\nFirst paste: ');
    
    // Step 3: First paste - user reports this pastes as text, not node
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    const afterFirstPaste = await editor.innerHTML();
    console.log('2. After first paste:', afterFirstPaste);
    
    // Count autocomplete nodes after first paste
    autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    const countAfterFirst = await autocompleteNodes.count();
    console.log('   Autocomplete nodes after first paste:', countAfterFirst);
    
    // Step 4: Second paste - user reports this pastes sentence twice  
    await page.keyboard.type('\n\nSecond paste: ');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    const afterSecondPaste = await editor.innerHTML();
    console.log('3. After second paste:', afterSecondPaste);
    
    // Count autocomplete nodes after second paste
    autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    const countAfterSecond = await autocompleteNodes.count();
    console.log('   Autocomplete nodes after second paste:', countAfterSecond);
    
    // Document the actual behavior for analysis
    const finalTextContent = await editor.textContent();
    console.log('4. Final text content:', finalTextContent);
    
    // Let's make this test always pass for now since we're debugging
    expect(true).toBe(true);
  });

  test('debug clipboard data persistence', async ({ page }) => {
    // Grant clipboard permissions for deeper debugging
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/');
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create content with autocomplete
    await editor.type('Debug test <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Copy the content
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    
    // Analyze clipboard data after copy
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
    
    console.log('Clipboard data after copy:', clipboardAfterCopy);
    
    // Move cursor and paste first time
    await page.keyboard.press('End');
    await page.keyboard.type(' | First: ');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    // Check clipboard data again (should be the same)
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
    
    console.log('Clipboard data after first paste:', clipboardAfterFirstPaste);
    
    // Second paste
    await page.keyboard.type(' | Second: ');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(100);
    
    const finalContent = await editor.innerHTML();
    console.log('Final content:', finalContent);
    
    expect(true).toBe(true);
  });
});