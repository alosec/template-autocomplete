import { Page, Locator, expect } from '@playwright/test';
import { TEST_SELECTORS, TEST_DELAYS } from '../../shared/test-constants';

export class EditorHelper {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.waitForEditor();
  }

  async waitForEditor(): Promise<Locator> {
    await this.page.waitForSelector(TEST_SELECTORS.EDITOR);
    return this.page.locator(TEST_SELECTORS.EDITOR);
  }

  async getEditor(): Promise<Locator> {
    return this.page.locator(TEST_SELECTORS.EDITOR);
  }

  async typeText(text: string) {
    const editor = await this.getEditor();
    await editor.type(text);
  }

  async waitForAutocompleteDropdown() {
    await expect(this.page.locator(TEST_SELECTORS.AUTOCOMPLETE_DROPDOWN)).toBeVisible();
  }

  async selectFirstSuggestion() {
    await this.waitForAutocompleteDropdown();
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(TEST_DELAYS.MEDIUM);
  }

  async selectSuggestionByIndex(index: number) {
    await this.waitForAutocompleteDropdown();
    
    // Navigate to the suggestion
    for (let i = 0; i < index; i++) {
      await this.page.keyboard.press('ArrowDown');
    }
    
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(TEST_DELAYS.MEDIUM);
  }

  async getTextContent(): Promise<string> {
    const editor = await this.getEditor();
    const content = await editor.textContent();
    return content || '';
  }

  async positionCursorAtEnd() {
    await this.page.keyboard.press('End');
  }

  async positionCursorAtStart() {
    await this.page.keyboard.press('Home');
  }

  async backspace() {
    await this.page.keyboard.press('Backspace');
  }

  async expectTextContent(expected: string) {
    const content = await this.getTextContent();
    expect(content).toBe(expected);
  }

  async expectTextNotToContain(text: string) {
    const content = await this.getTextContent();
    expect(content).not.toContain(text);
  }

  async expectTextToContain(text: string) {
    const content = await this.getTextContent();
    expect(content).toContain(text);
  }

  async expectTextToMatch(pattern: RegExp) {
    const content = await this.getTextContent();
    expect(content).toMatch(pattern);
  }
}