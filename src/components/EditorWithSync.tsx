import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EditorState, LexicalEditor } from 'lexical';
import { useEffect, MutableRefObject } from 'react';

import AutocompletePlugin from '../editor/plugins/AutocompletePlugin';
import DocumentSyncPlugin from '../editor/plugins/DocumentSyncPlugin';
import { Document } from '../types/EditorTypes';

interface EditorWithSyncProps {
  currentDocument: Document | null;
  onContentChange: (editorState: EditorState) => void;
  editorRef?: MutableRefObject<LexicalEditor | null>;
}

export default function EditorWithSync({ currentDocument, onContentChange, editorRef }: EditorWithSyncProps) {
  const [editor] = useLexicalComposerContext();
  
  // Set editor ref if provided
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  return (
    <>
      <PlainTextPlugin
        contentEditable={
          <ContentEditable
            className="editor-input"
          />
        }
        placeholder={<div className="editor-placeholder">Start writing... Hint: type &lt;&gt; for autocomplete, ESC ESC to close</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <OnChangePlugin onChange={onContentChange} />
      <HistoryPlugin />
      <AutocompletePlugin />
      <DocumentSyncPlugin document={currentDocument} />
    </>
  );
}