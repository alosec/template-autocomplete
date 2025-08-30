import { test, expect } from '@playwright/test';

test.describe('AutocompleteNode - Copy/Paste Behavior', () => {
  
  test('copy/paste preserves autocomplete node styling', async ({ page }) => {
    console.log('=== Testing copy/paste preservation of autocomplete node styling ===');
    console.log('Purpose: Verify that when an autocomplete node is copied and pasted, it maintains its styling and structure');
    
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Type the trigger pattern to show autocomplete
    console.log('Action: Typing "Original <>" to trigger autocomplete dropdown');
    await editor.type('Original <>');
    
    // Wait for autocomplete dropdown to appear
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    console.log('Status: Autocomplete dropdown is visible');
    
    // Press Enter to select the first suggestion 
    console.log('Action: Pressing Enter to select first autocomplete suggestion');
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
    console.log('Action: Clicking autocomplete node to select it');
    await autocompleteNode.click();
    
    // Copy the selected autocomplete node
    console.log('Action: Selecting all content (Ctrl+A) to ensure proper selection');
    await page.keyboard.press('Control+a'); // Select all in case click didn't select properly
    console.log('Action: Copying selected content (Ctrl+C)');
    await page.keyboard.press('Control+c');
    
    // Move to end and add some space, then paste
    console.log('Action: Moving cursor to end and typing separator text');
    await page.keyboard.press('End');
    await page.keyboard.type(' Pasted: ');
    console.log('Action: Pasting copied content (Ctrl+V)');
    await page.keyboard.press('Control+v');
    
    // Wait for paste operation to complete
    await page.waitForTimeout(100);
    
    // Check if we have two autocomplete nodes now
    const autocompleteNodes = page.locator('[data-lexical-autocomplete="true"]');
    const nodeCount = await autocompleteNodes.count();
    
    console.log('Status: Number of autocomplete nodes after paste:', nodeCount);
    
    if (nodeCount === 2) {
      // SUCCESS: We preserved the autocomplete node
      console.log('✅ SUCCESS: Found 2 autocomplete nodes - styling was preserved!');
      const originalNode = autocompleteNodes.nth(0);
      const pastedNode = autocompleteNodes.nth(1);
      
      const originalNodeText = await originalNode.textContent();
      const pastedNodeText = await pastedNode.textContent();
      const originalNodeClass = await originalNode.getAttribute('class');
      const pastedNodeClass = await pastedNode.getAttribute('class');
      
      console.log('Comparison - Original text:', JSON.stringify(originalNodeText));
      console.log('Comparison - Pasted text:', JSON.stringify(pastedNodeText));
      console.log('Comparison - Original class:', originalNodeClass);
      console.log('Comparison - Pasted class:', pastedNodeClass);
      
      expect(originalNodeText).toBe(pastedNodeText);
      expect(originalNodeClass).toBe(pastedNodeClass);
      expect(pastedNodeClass).toContain('autocomplete-entry');
    } else {
      // FAILURE: Check what we actually got
      console.log('❌ FAILURE: Expected 2 autocomplete nodes, got:', nodeCount);
      const finalContent = await editor.innerHTML();
      console.log('Final HTML content for analysis:', finalContent);
      
      // This should fail to highlight the problem
      expect(nodeCount).toBe(2); 
    }
    
    console.log('=== Copy/paste styling preservation test completed ===');
  });

  test('analyze clipboard data during copy operation', async ({ page }) => {
    console.log('=== Analyzing clipboard data during autocomplete copy operation ===');
    console.log('Purpose: Examine what data formats are available in clipboard when copying autocomplete nodes');
    
    // Grant clipboard permissions
    console.log('Action: Granting clipboard read/write permissions for analysis');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create an autocomplete node
    console.log('Action: Typing "Test <>" to create autocomplete node');
    await editor.type('Test <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    console.log('Action: Pressing Enter to select autocomplete suggestion');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Select the autocomplete node
    console.log('Action: Selecting autocomplete node for copy operation');
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    await autocompleteNode.click();
    await page.keyboard.press('Control+a');
    
    // Copy and then read clipboard data
    console.log('Action: Copying selected content to clipboard (Ctrl+C)');
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
    
    console.log('Analysis - Text clipboard data:', clipboardData);
    
    // Check if we can access HTML clipboard data
    console.log('Action: Reading HTML clipboard data for detailed analysis');
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
    
    console.log('Analysis - HTML clipboard data:', htmlClipboardData);
    
    // This test is for analysis - we expect it might fail
    console.log('Verification: Checking if clipboard contains data');
    expect(clipboardData.hasData).toBe(true);
    
    console.log('=== Clipboard analysis test completed ===');
  });

  test('examine DOM structure of autocomplete nodes', async ({ page }) => {
    console.log('=== Examining DOM structure of autocomplete nodes ===');
    console.log('Purpose: Analyze the actual DOM structure and attributes of autocomplete nodes');
    
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create an autocomplete node
    console.log('Action: Typing "Examine <>" to trigger autocomplete');
    await editor.type('Examine <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    console.log('Action: Selecting autocomplete suggestion with Enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Examine the actual DOM structure
    console.log('Action: Examining complete editor HTML structure');
    const editorHTML = await editor.innerHTML();
    console.log('Analysis - Editor HTML after autocomplete insertion:', editorHTML);
    
    // Check if our exportDOM method would be triggered
    console.log('Action: Analyzing specific autocomplete node structure');
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    const nodeHTML = await autocompleteNode.innerHTML();
    const nodeOuterHTML = await page.evaluate((el) => {
      return el.outerHTML;
    }, await autocompleteNode.elementHandle());
    
    console.log('Analysis - Autocomplete node inner HTML:', nodeHTML);
    console.log('Analysis - Autocomplete node outer HTML:', nodeOuterHTML);
    
    // Verify our expected DOM structure exists
    console.log('Verification: Checking autocomplete node has expected attributes');
    await expect(autocompleteNode).toHaveAttribute('data-lexical-autocomplete', 'true');
    await expect(autocompleteNode).toHaveClass(/autocomplete-entry/);
    
    console.log('=== DOM structure examination completed ===');
  });

  test('debug selection behavior on autocomplete nodes', async ({ page }) => {
    console.log('=== Debugging selection behavior on autocomplete nodes ===');
    console.log('Purpose: Test different methods of selecting autocomplete nodes and analyze selection state');
    
    await page.goto('/');
    
    // Wait for the editor to be ready
    await page.waitForSelector('[contenteditable]');
    const editor = page.locator('[contenteditable]');
    
    // Create an autocomplete node with surrounding text
    console.log('Action: Creating autocomplete node with surrounding text "Before <> After"');
    await editor.type('Before <>');
    await expect(page.locator('.autocomplete-dropdown')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.type(' After');
    await page.waitForTimeout(100);
    
    console.log('Status: Autocomplete node created with surrounding text');
    
    // Test different selection methods
    const autocompleteNode = page.locator('[data-lexical-autocomplete="true"]');
    
    // Method 1: Click to select
    console.log('Action: Testing Method 1 - Single click selection');
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
    console.log('Analysis - Selection after single click:', selection);
    
    // Method 2: Double-click to select
    console.log('Action: Testing Method 2 - Double-click selection');
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
    console.log('Analysis - Selection after double-click:', selection);
    
    // Method 3: Programmatic selection
    console.log('Action: Testing Method 3 - Programmatic selection using Range API');
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
    console.log('Analysis - Selection after programmatic selection:', selection);
    
    console.log('=== Selection behavior debugging completed ===');
  });
});