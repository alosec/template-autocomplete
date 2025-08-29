import { test, expect } from '@playwright/test';

test.describe('AutocompleteNode - Copy/Paste Behavior', () => {
  
  test('copy/paste preserves autocomplete node styling', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Type the trigger pattern to show autocomplete
    await editor.type('Original <>');
    
    // Wait for autocomplete dropdown to appear
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    
    // Press Enter to select the first suggestion 
    await page.keyboard.press('Enter');
    
    // Wait for the autocomplete node to be inserted
    await page.waitForTimeout(100);
    
    // Verify we have an autocomplete node with proper styling
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    await expect(autocompleteNode).toBeVisible();
    
    // Get the initial text content and styling
    const initialText = await autocompleteNode.textContent();
    const initialClass = await autocompleteNode.getAttribute('class');
    
    console.log('Initial autocomplete text:', initialText);
    console.log('Initial autocomplete class:', initialClass);
    
    // Select the autocomplete node
    await autocompleteNode.click();
    
    // Copy the selected autocomplete node
    await page.keyboard.press('Control+a'); // Select all in case click didn't select properly
    await page.keyboard.press('Control+c');
    
    // Move to end and add some space, then paste
    await page.keyboard.press('End');
    await page.keyboard.type(' Pasted: ');
    await page.keyboard.press('Control+v');
    
    // Wait for paste operation to complete
    await page.waitForTimeout(100);
    
    // Check if we have two autocomplete nodes now
    const autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    const nodeCount = await autocompleteNodes.count();
    
    console.log('Number of autocomplete nodes after paste:', nodeCount);
    
    if (nodeCount === 2) {
      // SUCCESS: We preserved the autocomplete node
      const originalNode = autocompleteNodes.nth(0);
      const pastedNode = autocompleteNodes.nth(1);
      
      const originalNodeText = await originalNode.textContent();
      const pastedNodeText = await pastedNode.textContent();
      const originalNodeClass = await originalNode.getAttribute('class');
      const pastedNodeClass = await pastedNode.getAttribute('class');
      
      expect(originalNodeText).toBe(pastedNodeText);
      expect(originalNodeClass).toBe(pastedNodeClass);
      expect(pastedNodeClass).toContain('autocomplete-entry');
    } else {
      // FAILURE: Check what we actually got
      const finalContent = await editor.innerHTML();
      console.log('Final HTML content:', finalContent);
      
      // This should fail to highlight the problem
      expect(nodeCount).toBe(2); 
    }
  });

  test('analyze clipboard data during copy operation', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create an autocomplete node
    await editor.type('Test <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Select the autocomplete node
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    await autocompleteNode.click();
    await page.keyboard.press('Control+a');
    
    // Copy and then read clipboard data
    await page.keyboard.press('Control+c');
    
    // Analyze what's actually in the clipboard
    const clipboardData = await page.evaluate(async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        return {
          text: clipboardText,
          hasData: !!clipboardText
        };
      } catch (e) {
        return {
          error: e.message,
          hasData: false
        };
      }
    });
    
    console.log('Clipboard data:', clipboardData);
    
    // Check if we can access HTML clipboard data
    const htmlClipboardData = await page.evaluate(async () => {
      try {
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
        return htmlData;
      } catch (e) {
        return [`Error reading HTML: ${e.message}`];
      }
    });
    
    console.log('HTML clipboard data:', htmlClipboardData);
    
    // This test is for analysis - we expect it might fail
    expect(clipboardData.hasData).toBe(true);
  });

  test('examine DOM structure of autocomplete nodes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create an autocomplete node
    await editor.type('Examine <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Examine the actual DOM structure
    const editorHTML = await editor.innerHTML();
    console.log('Editor HTML after autocomplete insertion:', editorHTML);
    
    // Check if our exportDOM method would be triggered
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    const nodeHTML = await autocompleteNode.innerHTML();
    const nodeOuterHTML = await page.evaluate((el) => {
      return el.outerHTML;
    }, await autocompleteNode.elementHandle());
    
    console.log('Autocomplete node inner HTML:', nodeHTML);
    console.log('Autocomplete node outer HTML:', nodeOuterHTML);
    
    // Verify our expected DOM structure exists
    await expect(autocompleteNode).toHaveAttribute('data-lexical-autocomplete', 'true');
    await expect(autocompleteNode).toHaveClass(/autocomplete-entry/);
  });

  test('debug selection behavior on autocomplete nodes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create an autocomplete node with surrounding text
    await editor.type('Before <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.type(' After');
    await page.waitForTimeout(100);
    
    // Test different selection methods
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    
    // Method 1: Click to select
    await autocompleteNode.click();
    let selection = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        rangeCount: sel?.rangeCount || 0,
        toString: sel?.toString() || '',
        anchorNode: sel?.anchorNode?.nodeName || 'none',
        focusNode: sel?.focusNode?.nodeName || 'none'
      };
    });
    console.log('Selection after click:', selection);
    
    // Method 2: Double-click to select
    await autocompleteNode.dblclick();
    selection = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        rangeCount: sel?.rangeCount || 0,
        toString: sel?.toString() || '',
        anchorNode: sel?.anchorNode?.nodeName || 'none',
        focusNode: sel?.focusNode?.nodeName || 'none'
      };
    });
    console.log('Selection after double-click:', selection);
    
    // Method 3: Programmatic selection
    await page.evaluate(() => {
      const node = document.querySelector('[data-lexical-autocomplete="true"]');
      if (node) {
        const range = document.createRange();
        range.selectNode(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
    
    selection = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        rangeCount: sel?.rangeCount || 0,
        toString: sel?.toString() || '',
        anchorNode: sel?.anchorNode?.nodeName || 'none',
        focusNode: sel?.focusNode?.nodeName || 'none'
      };
    });
    console.log('Selection after programmatic selection:', selection);
  });
});