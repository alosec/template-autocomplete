import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { $getRoot, $createTextNode } from 'lexical';
import MinimalEditor from '../MinimalEditor';

// Mock the document manager
jest.mock('../../utils/DocumentManager', () => ({
  documentManager: {
    createNewDocument: () => ({
      id: 'test-doc-1',
      title: 'New Document',
      content: '',
      wordCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getCurrentDocumentId: () => null,
    loadDocument: jest.fn(),
    saveDocument: jest.fn(),
    deleteDocument: jest.fn(),
    updateWordCount: (doc: any) => ({ ...doc, wordCount: doc.content.split(' ').length }),
    getDocumentSummaries: () => [],
    exportDocument: jest.fn(),
    importDocument: jest.fn(),
  },
}));

describe('MinimalEditor', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Basic Editor Functionality', () => {
    test('renders editor interface', () => {
      render(<MinimalEditor />);
      
      expect(screen.getByText('Autocompleter')).toBeInTheDocument();
      expect(screen.getByText(/Start writing... Hint: type/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /File/ })).toBeInTheDocument();
    });

    test('creates new document on initialization', async () => {
      render(<MinimalEditor />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('New Document')).toBeInTheDocument();
      });
    });

    test('handles document title changes', async () => {
      render(<MinimalEditor />);
      
      const titleInput = await screen.findByDisplayValue('New Document');
      await user.clear(titleInput);
      await user.type(titleInput, 'Test Document');
      
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });
  });

  describe('Autocomplete Integration', () => {
    test('integrates autocomplete functionality', async () => {
      render(<MinimalEditor />);
      
      // Find the Lexical content editable editor element  
      const editor = document.querySelector('[data-lexical-editor="true"]');
      
      // Use the approach recommended in Lexical GitHub discussions
      await user.click(editor);
      await user.tab(); // Some users reported this helps with focus
      
      // Use fireEvent.input with data property (recommended approach)
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('handles autocomplete with document content', async () => {
      render(<MinimalEditor />);
      
      // Find the content editable editor element
      const editor = document.querySelector('[data-lexical-editor="true"]');
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: 'Some text <>test more text' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
    });
  });

  describe('Toolbar Functionality', () => {
    test('file menu operations work', async () => {
      render(<MinimalEditor />);
      
      const fileButton = screen.getByRole('button', { name: /File/ });
      await user.click(fileButton);
      
      expect(screen.getByRole('button', { name: /New/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    });

    test('view menu toggles sidebar', async () => {
      render(<MinimalEditor />);
      
      const viewButton = screen.getByRole('button', { name: /View/ });
      await user.click(viewButton);
      
      const sidebarToggle = screen.getByRole('button', { name: /Global Brain Sidebar/ });
      await user.click(sidebarToggle);
      
      // Sidebar should become visible
      expect(document.querySelector('.global-brain-sidebar.visible')).toBeInTheDocument();
    });
  });

  describe('Adversarial Input Handling', () => {
    test('handles rapid file operations', async () => {
      render(<MinimalEditor />);
      
      const fileButton = screen.getByRole('button', { name: /File/ });
      
      // Rapidly click file operations
      for (let i = 0; i < 10; i++) {
        await user.click(fileButton);
        const newButton = screen.getByRole('button', { name: /New/ });
        await user.click(newButton);
      }
      
      // Should handle gracefully without errors
      expect(screen.getByText('Autocompleter')).toBeInTheDocument();
    });

    test('handles simultaneous editor and sidebar interactions', async () => {
      render(<MinimalEditor />);
      
      // Open sidebar
      const viewButton = screen.getByRole('button', { name: /View/ });
      await user.click(viewButton);
      const sidebarToggle = screen.getByRole('button', { name: /Global Brain Sidebar/ });
      await user.click(sidebarToggle);
      
      // Type in editor while sidebar is open
      const editor = document.querySelector('[data-lexical-editor="true"]');
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>test input' });
      
      // Should handle both interactions without conflicts
      expect(document.querySelector('.global-brain-sidebar.visible')).toBeInTheDocument();
      expect(editor.textContent).toContain('<>test');
    });

    test('handles large document content', async () => {
      render(<MinimalEditor />);
      
      const editor = document.querySelector('[data-lexical-editor="true"]');
      await user.click(editor);
      
      // Type large amount of content using fireEvent.input
      const largeText = 'Large content '.repeat(100);
      fireEvent.input(editor, { data: largeText });
      
      // Should handle large content without performance issues
      expect(editor.textContent).toContain('Large content');
    });

    test('recovers from component errors', async () => {
      render(<MinimalEditor />);
      
      // Try various operations that could cause errors
      const titleInput = await screen.findByDisplayValue('New Document');
      
      // Test with various problematic title inputs
      const problematicTitles = ['', ' '.repeat(1000), '<!@#$%^&*()>', '🚀🎉💖'];
      
      for (const title of problematicTitles) {
        await user.clear(titleInput);
        if (title.trim()) {
          await user.type(titleInput, title);
        }
        
        // Component should remain functional
        expect(screen.getByText('Autocompleter')).toBeInTheDocument();
      }
    });
  });

  describe('Auto-save Functionality', () => {
    test('shows auto-save indicator when content changes', async () => {
      render(<MinimalEditor />);
      
      const editor = document.querySelector('[data-lexical-editor="true"]');
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: 'Test content' });
      
      await waitFor(() => {
        expect(screen.getByText('Auto-saving...')).toBeInTheDocument();
      });
    });

    test('handles rapid content changes for auto-save', async () => {
      render(<MinimalEditor />);
      
      const editor = document.querySelector('[data-lexical-editor="true"]');
      await user.click(editor);
      
      // Rapidly type to trigger multiple auto-save cycles using fireEvent.input
      for (let i = 0; i < 10; i++) {
        fireEvent.input(editor, { data: `Text ${i} ` });
      }
      
      // Should handle rapid changes without issues
      expect(editor.textContent).toContain('Text 9');
    });
  });

  describe('Global Brain Sidebar', () => {
    test('sidebar search functionality works', async () => {
      render(<MinimalEditor />);
      
      // Open sidebar
      const viewButton = screen.getByRole('button', { name: /View/ });
      await user.click(viewButton);
      const sidebarToggle = screen.getByRole('button', { name: /Global Brain Sidebar/ });
      await user.click(sidebarToggle);
      
      // Search in sidebar
      const searchInput = screen.getByPlaceholderText('Search Global Brain...');
      await user.type(searchInput, 'Claude');
      
      expect(screen.getByText("Claude's Investigations")).toBeInTheDocument();
    });

    test('handles sidebar with no search results', async () => {
      render(<MinimalEditor />);
      
      // Open sidebar
      const viewButton = screen.getByRole('button', { name: /View/ });
      await user.click(viewButton);
      const sidebarToggle = screen.getByRole('button', { name: /Global Brain Sidebar/ });
      await user.click(sidebarToggle);
      
      // Search for non-existent item
      const searchInput = screen.getByPlaceholderText('Search Global Brain...');
      await user.type(searchInput, 'nonexistent');
      
      // Should handle empty results gracefully
      expect(screen.getByText('Global Brain Items')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries and Recovery', () => {
    test('handles malformed localStorage data', () => {
      // Simulate corrupted localStorage
      localStorage.setItem('editor-documents', 'invalid-json');
      
      // Should still render without crashing
      expect(() => render(<MinimalEditor />)).not.toThrow();
    });

    test('handles component unmount gracefully', () => {
      const { unmount } = render(<MinimalEditor />);
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    test('maintains state consistency after errors', async () => {
      render(<MinimalEditor />);
      
      // Cause potential error conditions
      const editor = document.querySelector('[data-lexical-editor="true"]');
      await user.click(editor);
      
      // Try problematic operations with fireEvent.input
      fireEvent.input(editor, { data: '<>' });
      await user.keyboard('{Escape}'.repeat(20)); // Spam escape
      fireEvent.input(editor, { data: 'recovery test' });
      
      // Editor should still be functional
      expect(editor.textContent).toContain('recovery test');
    });
  });
});