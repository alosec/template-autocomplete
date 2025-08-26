import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MinimalEditor from '../MinimalEditor';

describe('Import Debug', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('debug import process', async () => {
    render(<MinimalEditor />);
    
    // Wait for editor to be ready
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Document title...')).toBeInTheDocument();
    });

    console.log('=== Editor is ready ===');

    // Use your actual exported document structure
    const testDocument = {
      "id": "mes7uy8pk5xa9v5zif",
      "title": "Test Document",
      "content": "This is a test document! Claude's Investigations \n\nHere there be testing.",
      "createdAt": "2025-08-26T07:20:17.113Z",
      "updatedAt": "2025-08-26T07:20:38.651Z",
      "wordCount": 11,
      "concepts": [],
      "exportedAt": "2025-08-26T07:20:39.379Z",
      "version": "1.0"
    };

    console.log('=== Created test document ===', testDocument);

    // Find the file input
    const fileInput = screen.getByRole('button', { name: /File/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    expect(fileInput).toBeInTheDocument();
    console.log('=== Found file input ===');

    // Create file and trigger import
    const file = new File([JSON.stringify(testDocument)], 'debug.json', {
      type: 'application/json'
    });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    console.log('=== About to trigger file change ===');
    
    await act(async () => {
      fireEvent.change(fileInput);
    });
    
    console.log('=== Triggered file change ===');

    // Wait for React updates to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Check current state
    const titleInput = screen.getByPlaceholderText('Document title...');
    const editorTextbox = document.querySelector('[data-lexical-editor="true"]') as HTMLElement;
    
    console.log('=== Current title value ===', titleInput.getAttribute('value'));
    console.log('=== Current editor content ===', editorTextbox.textContent);
    console.log('=== Editor innerHTML ===', editorTextbox.innerHTML);
    
    // Look for any feedback messages
    const feedbackElements = document.querySelectorAll('.import-feedback');
    console.log('=== Feedback elements ===', feedbackElements.length);
    feedbackElements.forEach((el, i) => {
      console.log(`Feedback ${i}:`, el.textContent, el.className);
    });
  }, 10000);
});