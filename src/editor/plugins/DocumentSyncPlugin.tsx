import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createTextNode, $createParagraphNode } from 'lexical';
import { Document } from '../../types/EditorTypes';

interface DocumentSyncPluginProps {
  document: Document | null;
}

export default function DocumentSyncPlugin({ document }: DocumentSyncPluginProps) {
  let editor;
  try {
    [editor] = useLexicalComposerContext();
  } catch (error) {
    // If we're not within LexicalComposer context, return early
    return null;
  }

  const lastDocumentIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    console.log('DocumentSyncPlugin: useEffect triggered, document:', document?.id, document?.title);
    if (!document) return;
    
    // Prevent loading the same document multiple times
    if (lastDocumentIdRef.current === document.id || isLoadingRef.current) {
      return;
    }

    console.log('DocumentSyncPlugin: Syncing document:', document.id, document.title);
    isLoadingRef.current = true;
    lastDocumentIdRef.current = document.id;
    
    // Try to load from rich editor state first
    if (document.editorState) {
      try {
        const parsedEditorState = editor.parseEditorState(document.editorState);
        editor.setEditorState(parsedEditorState);
        isLoadingRef.current = false;
        return; // Successfully loaded from editor state
      } catch (error) {
        console.warn('Failed to load editor state, falling back to plain text:', error);
      }
    }
    
    // Fallback: sync document content to editor when document changes  
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      
      if (document.content.trim()) {
        // Split content by newlines to create proper paragraphs
        const lines = document.content.split('\n');
        
        lines.forEach((line) => {
          const paragraph = $createParagraphNode();
          if (line.trim()) {
            const textNode = $createTextNode(line);
            paragraph.append(textNode);
          }
          root.append(paragraph);
        });
      } else {
        // Create empty paragraph for empty document
        const paragraph = $createParagraphNode();
        root.append(paragraph);
      }
      
      isLoadingRef.current = false;
    });
  }, [document?.id, editor]); // Only depend on document ID to avoid infinite re-renders

  return null; // This is a headless plugin
}