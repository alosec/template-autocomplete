import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createTextNode, $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { Document } from '../types/EditorTypes';

interface UseDocumentSyncProps {
  document: Document | null;
  onContentChange?: (content: string) => void;
}

export const useDocumentSync = ({ document, onContentChange }: UseDocumentSyncProps) => {
  let editor;
  try {
    [editor] = useLexicalComposerContext();
    console.log('useDocumentSync: Got editor context');
  } catch (error) {
    // If we're not within LexicalComposer context, return early
    console.log('useDocumentSync: No LexicalComposer context available');
    return {
      getCurrentEditorContent: () => '',
      syncEditorToDocument: () => {}
    };
  }
  
  const lastDocumentIdRef = useRef<string | null>(null);

  // Sync document content to editor when document changes
  useEffect(() => {
    console.log('useDocumentSync useEffect: document =', document?.id, document?.title);
    if (!document) return;
    
    // Only sync if it's a different document to avoid infinite loops
    if (lastDocumentIdRef.current === document.id) {
      console.log('useDocumentSync: Same document, skipping sync');
      return;
    }
    
    console.log('useDocumentSync: Syncing content:', document.content);
    lastDocumentIdRef.current = document.id;
    
    // Use the same pattern we learned from testing - proper Lexical API usage
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      
      if (document.content.trim()) {
        // Split content by newlines to create proper paragraphs
        const lines = document.content.split('\n');
        
        lines.forEach((line, _index) => {
          const paragraph = $createParagraphNode();
          if (line.trim()) {
            const textNode = $createTextNode(line);
            paragraph.append(textNode);
          }
          root.append(paragraph);
        });
        
        // Set cursor to end of document
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          root.selectEnd();
        }
      } else {
        // Create empty paragraph for empty document
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
      }
    });
  }, [document, editor]);

  // Utility function to get current editor content as plain text
  const getCurrentEditorContent = (): string => {
    let content = '';
    editor.getEditorState().read(() => {
      const root = $getRoot();
      content = root.getTextContent();
    });
    return content;
  };

  // Function to manually sync content from editor to document
  const syncEditorToDocument = () => {
    if (onContentChange) {
      const content = getCurrentEditorContent();
      onContentChange(content);
    }
  };

  return {
    getCurrentEditorContent,
    syncEditorToDocument
  };
};