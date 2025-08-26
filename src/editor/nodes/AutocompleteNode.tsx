import {
  DecoratorNode,
  NodeKey,
  LexicalNode,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

export type SerializedAutocompleteNode = Spread<
  {
    text: string;
  },
  SerializedLexicalNode
>;

export class AutocompleteNode extends DecoratorNode<JSX.Element> {
  __text: string;

  static getType(): string {
    return 'autocomplete';
  }

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'autocomplete-entry';
    span.setAttribute('data-lexical-autocomplete', 'true');
    return span;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedAutocompleteNode): AutocompleteNode {
    const { text } = serializedNode;
    return new AutocompleteNode(text);
  }

  exportJSON(): SerializedAutocompleteNode {
    return {
      text: this.__text,
      type: 'autocomplete',
      version: 1,
    };
  }

  getText(): string {
    return this.__text;
  }

  setText(text: string): void {
    const writableNode = this.getWritable();
    writableNode.__text = text;
  }

  decorate(): JSX.Element {
    return (
      <span className="autocomplete-entry" data-lexical-autocomplete="true">
        {this.__text}
      </span>
    );
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return true;
  }

  isIsolated(): boolean {
    return true;
  }
}

export function $createAutocompleteNode(text: string): AutocompleteNode {
  return new AutocompleteNode(text);
}

export function $isAutocompleteNode(node: LexicalNode | null | undefined): node is AutocompleteNode {
  return node instanceof AutocompleteNode;
}