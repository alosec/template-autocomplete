import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import { AutocompleteNode } from './nodes/AutocompleteNode';

const editorConfig = {
    namespace: 'Editor',
    nodes: [AutocompleteNode],
    // Handling of errors during update
    onError(error: Error) {
        throw error;
    },
    // The editor theme
    theme: {
            ltr: 'ltr',
            paragraph: 'editor-paragraph',
            rtl: 'rtl',
        },
};

export default function Editor() {
    return (
        <LexicalComposer initialConfig={editorConfig}>
            <div className="editor-container">
                <div className="editor-inner">
                    <PlainTextPlugin
                        contentEditable={
                        <ContentEditable
                            className="editor-input"
                            suppressContentEditableWarning
                        />}
                        ErrorBoundary={LexicalErrorBoundary}

                    />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <AutocompletePlugin />
                </div>
            </div>
        </LexicalComposer>
    );
}