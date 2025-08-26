import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MinimalEditor from '../MinimalEditor';

describe('Document Import Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('imports document and syncs content with editor', async () => {
    render(<MinimalEditor />);
    
    // Wait for initial document to be created - just check that a title input exists
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Document title...')).toBeInTheDocument();
    });

    // Create test import data
    const testDocument = {
      id: "test-import-123",
      title: "Imported Test Document",
      content: "This is imported content.\n\nWith multiple paragraphs.",
      createdAt: "2025-08-26T07:00:00.000Z",
      updatedAt: "2025-08-26T07:00:00.000Z",
      wordCount: 6,
      concepts: ["test"],
      exportedAt: "2025-08-26T07:00:00.000Z",
      version: "1.0"
    };

    // Create a file object for the import
    const file = new File([JSON.stringify(testDocument)], 'test-document.json', {
      type: 'application/json'
    });

    // Find the file input (it's hidden, so we need to find it by type)
    const fileInput = screen.getByRole('button', { name: /File/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    expect(fileInput).toBeInTheDocument();

    // Mock file selection
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    // Trigger the change event
    fireEvent.change(fileInput);

    // Wait for import to complete and check that title changed
    await waitFor(() => {
      expect(screen.getByDisplayValue('Imported Test Document')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that content appears in the editor
    await waitFor(() => {
      const editorContent = screen.getByRole('textbox');
      expect(editorContent).toHaveTextContent('This is imported content.');
      expect(editorContent).toHaveTextContent('With multiple paragraphs.');
    }, { timeout: 5000 });

    // Check for success feedback
    await waitFor(() => {
      expect(screen.getByText(/Imported "Imported Test Document" successfully/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows error feedback for invalid JSON import', async () => {
    render(<MinimalEditor />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Document title...')).toBeInTheDocument();
    });

    // Create invalid JSON file
    const invalidFile = new File(['{ invalid json }'], 'invalid.json', {
      type: 'application/json'
    });

    const fileInput = screen.getByRole('button', { name: /File/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Check for error feedback
    await waitFor(() => {
      expect(screen.getByText(/Failed to import document - file could not be read/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows error feedback for malformed document structure', async () => {
    render(<MinimalEditor />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Document title...')).toBeInTheDocument();
    });

    // Create valid JSON but invalid document structure
    const invalidDocument = {
      notADocument: true,
      missingRequiredFields: "yes"
    };

    const file = new File([JSON.stringify(invalidDocument)], 'malformed.json', {
      type: 'application/json'
    });

    const fileInput = screen.getByRole('button', { name: /File/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Check for error feedback about invalid format
    await waitFor(() => {
      expect(screen.getByText(/Failed to import document - invalid format/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('clears feedback messages after successful import', async () => {
    render(<MinimalEditor />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Document title...')).toBeInTheDocument();
    });

    const testDocument = {
      id: "test-clear-feedback",
      title: "Feedback Test Document",
      content: "Test content for feedback clearing.",
      createdAt: "2025-08-26T07:00:00.000Z",
      updatedAt: "2025-08-26T07:00:00.000Z",
      wordCount: 5,
      concepts: [],
      exportedAt: "2025-08-26T07:00:00.000Z",
      version: "1.0"
    };

    const file = new File([JSON.stringify(testDocument)], 'feedback-test.json', {
      type: 'application/json'
    });

    const fileInput = screen.getByRole('button', { name: /File/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Imported "Feedback Test Document" successfully/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Wait for message to disappear (3 second timeout)
    await waitFor(() => {
      expect(screen.queryByText(/Imported "Feedback Test Document" successfully/)).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });

  test('properly syncs multi-line content with Lexical editor', async () => {
    render(<MinimalEditor />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Document title...')).toBeInTheDocument();
    });

    const multiLineDocument = {
      id: "test-multiline",
      title: "Multi-line Test",
      content: "Line 1\nLine 2\n\nLine 4 after empty line\nFinal line",
      createdAt: "2025-08-26T07:00:00.000Z",
      updatedAt: "2025-08-26T07:00:00.000Z",
      wordCount: 8,
      concepts: [],
      exportedAt: "2025-08-26T07:00:00.000Z",
      version: "1.0"
    };

    const file = new File([JSON.stringify(multiLineDocument)], 'multiline-test.json', {
      type: 'application/json'
    });

    const fileInput = screen.getByRole('button', { name: /File/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Multi-line Test')).toBeInTheDocument();
    });

    // Verify all lines are present in the editor
    await waitFor(() => {
      const editorContent = screen.getByRole('textbox');
      expect(editorContent).toHaveTextContent('Line 1');
      expect(editorContent).toHaveTextContent('Line 2');  
      expect(editorContent).toHaveTextContent('Line 4 after empty line');
      expect(editorContent).toHaveTextContent('Final line');
    }, { timeout: 5000 });
  });
});