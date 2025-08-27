import { createCommand, LexicalCommand } from 'lexical';

/**
 * Command to hide autocomplete dropdown from outside the editor
 * Can be dispatched from UI elements like title input, toolbar buttons, etc.
 */
export const HIDE_AUTOCOMPLETE_COMMAND: LexicalCommand<void> = createCommand('HIDE_AUTOCOMPLETE_COMMAND');