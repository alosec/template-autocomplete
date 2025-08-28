import {
  TextNode,
  NodeKey,
  LexicalNode,
  SerializedTextNode,
  Spread,
} from 'lexical';

export type SerializedAutocompleteNode = Spread<
  {
    text: string;
  },
  SerializedTextNode
>;

export class AutocompleteNode extends TextNode {
  static getType(): string {
    return 'autocomplete';
  }

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'autocomplete-entry';
    span.setAttribute('data-lexical-autocomplete', 'true');
    span.textContent = this.__text;
    return span;
  }

  updateDOM(prevNode: AutocompleteNode, dom: HTMLElement): boolean {
    if (prevNode.__text !== this.__text) {
      dom.textContent = this.__text;
      return true;
    }
    return false;
  }

  static importJSON(serializedNode: SerializedAutocompleteNode): AutocompleteNode {
    const { text } = serializedNode;
    const node = new AutocompleteNode(text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedAutocompleteNode {
    return {
      ...super.exportJSON(),
      type: 'autocomplete',
      text: this.__text,
    };
  }

  isEditable(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return false;
  }

  isSegmented(): boolean {
    return false;
  }

  isToken(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  splitText(splitOffsets: number[]): TextNode[] {
    return [this];
  }

}

export function $createAutocompleteNode(text: string): AutocompleteNode {
  return new AutocompleteNode(text);
}

export function $isAutocompleteNode(node: LexicalNode | null | undefined): node is AutocompleteNode {
  return node instanceof AutocompleteNode;
}