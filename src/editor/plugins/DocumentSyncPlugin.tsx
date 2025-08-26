import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposer';
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

  useEffect(() => {
    console.log('DocumentSyncPlugin: useEffect triggered, document:', document?.id, document?.title, document?.content);
    if (!document) return;

    console.log('DocumentSyncPlugin: Syncing document:', document.id, document.title);
    
    // Sync document content to editor when document changes  
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
    });
  }, [document, editor]);

  return null; // This is a headless plugin
}