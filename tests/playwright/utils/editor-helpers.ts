// Playwright helper functions for editor testing

import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../shared/test-constants';

export class EditorTestHelper {
  private page: Page;
  private editor: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.editor = page.locator(SELECTORS.editor);
  }
  
  async waitForEditor() {
    console.log('🔄 Waiting for editor to be ready...');
    await this.page.waitForSelector(SELECTORS.editor);
    await expect(this.editor).toBeVisible();
    console.log('✅ Editor is ready and visible');
    return this;
  }
  
  async typeText(text: string, options?: { delay?: number; log?: boolean }) {
    const shouldLog = options?.log !== false;
    if (shouldLog) {
      console.log(`⌨️  Typing text: "${text}"`);
    }
    
    await this.editor.type(text, { delay: options?.delay || 50 });
    
    if (shouldLog) {
      console.log(`✅ Successfully typed: "${text}"`);
    }
    return this;
  }
  
  async getEditorContent(): Promise<string> {
    console.log('📖 Reading editor content...');
    const content = await this.editor.textContent() || '';
    console.log(`📖 Editor content: "${content}"`);
    return content;
  }
  
  async expectEditorContent(expected: string, message?: string) {
    console.log(`🔍 Expecting editor content to be: "${expected}"`);
    const actual = await this.getEditorContent();
    console.log(`📖 Actual editor content: "${actual}"`);
    
    if (message) {
      console.log(`ℹ️  Context: ${message}`);
    }
    
    expect(actual).toBe(expected);
    console.log('✅ Editor content matches expectation');
    return this;
  }
  
  async expectEditorContains(text: string, message?: string) {
    console.log(`🔍 Expecting editor to contain: "${text}"`);
    const actual = await this.getEditorContent();
    
    if (message) {
      console.log(`ℹ️  Context: ${message}`);
    }
    
    expect(actual).toContain(text);
    console.log('✅ Editor contains expected text');
    return this;
  }
  
  async waitForAutocompleteDropdown(visible: boolean = true) {
    const action = visible ? 'appear' : 'disappear';
    console.log(`🔄 Waiting for autocomplete dropdown to ${action}...`);
    
    if (visible) {
      await expect(this.page.locator(SELECTORS.dropdown)).toBeVisible();
      console.log('✅ Autocomplete dropdown is visible');
    } else {
      await expect(this.page.locator(SELECTORS.dropdown)).toBeHidden();
      console.log('✅ Autocomplete dropdown is hidden');
    }
    
    return this;
  }
  
  async selectAutocompleteOption(index?: number) {
    const dropdownItems = this.page.locator(SELECTORS.dropdownItem);
    
    if (index !== undefined) {
      console.log(`🎯 Selecting autocomplete option at index ${index}`);
      await dropdownItems.nth(index).click();
      console.log(`✅ Selected autocomplete option at index ${index}`);
    } else {
      console.log('⏎ Pressing Enter to select current autocomplete option');
      await this.page.keyboard.press('Enter');
      console.log('✅ Pressed Enter to select autocomplete option');
    }
    
    return this;
  }
  
  async pressKey(key: string, options?: { log?: boolean }) {
    const shouldLog = options?.log !== false;
    if (shouldLog) {
      console.log(`⌨️  Pressing key: ${key}`);
    }
    
    await this.page.keyboard.press(key);
    
    if (shouldLog) {
      console.log(`✅ Successfully pressed: ${key}`);
    }
    
    return this;
  }
  
  async pressKeys(keys: string[], options?: { delay?: number; log?: boolean }) {
    const shouldLog = options?.log !== false;
    if (shouldLog) {
      console.log(`⌨️  Pressing keys in sequence: ${keys.join(', ')}`);
    }
    
    for (const key of keys) {
      await this.pressKey(key, { log: shouldLog });
      if (options?.delay) {
        await this.page.waitForTimeout(options.delay);
      }
    }
    
    if (shouldLog) {
      console.log('✅ Successfully pressed all keys in sequence');
    }
    
    return this;
  }
  
  async waitForTimeout(ms: number, reason?: string) {
    if (reason) {
      console.log(`⏳ Waiting ${ms}ms: ${reason}`);
    } else {
      console.log(`⏳ Waiting ${ms}ms...`);
    }
    
    await this.page.waitForTimeout(ms);
    console.log('✅ Wait completed');
    return this;
  }
  
  async triggerAutocomplete(beforeText = 'Text ', triggerPattern = '<>', afterText = '') {
    console.log(`🎯 Triggering autocomplete with pattern: "${beforeText}${triggerPattern}${afterText}"`);
    
    const fullText = beforeText + triggerPattern + afterText;
    await this.typeText(fullText);
    
    console.log('✅ Autocomplete trigger pattern typed');
    return this;
  }
  
  async expectAutocompleteNodeExists() {
    console.log('🔍 Checking for autocomplete node existence...');
    await expect(this.page.locator(SELECTORS.autocompleteNode)).toBeVisible();
    console.log('✅ Autocomplete node exists and is visible');
    return this;
  }
  
  async expectNoAutocompleteNode() {
    console.log('🔍 Verifying no autocomplete node exists...');
    await expect(this.page.locator(SELECTORS.autocompleteNode)).toHaveCount(0);
    console.log('✅ No autocomplete nodes found');
    return this;
  }
}

export async function createEditorHelper(page: Page): Promise<EditorTestHelper> {
  console.log('🏗️  Creating editor test helper...');
  const helper = new EditorTestHelper(page);
  await helper.waitForEditor();
  console.log('✅ Editor test helper ready');
  return helper;
}