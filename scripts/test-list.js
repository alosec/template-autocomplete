#!/usr/bin/env node

console.log(`
📋 AVAILABLE TESTS:

🧪 UNIT TESTS:
  npm run test:unit           - All unit tests
  npm run test:unit:watch     - Unit tests in watch mode
  npm run test:quick          - Quick core autocomplete tests

🌐 INTEGRATION TESTS:
  npm run test:integration    - All Playwright tests (headless)
  npm run test:headed         - All tests with GUI (slow)

🎯 SPECIFIC TESTS (headless):
  npm run test:backspace      - All backspace behavior tests
  npm run test:copypaste      - All copy/paste tests

🎯 SPECIFIC TESTS (headed/visual):
  npm run test:backspace:gui  - Backspace tests with GUI
  npm run test:copypaste:gui  - Copy/paste tests with GUI
  npm run test:critical-bug   - The critical typing bug test
  npm run test:single-backspace - Single backspace removal test
  npm run test:multi-backspace - Multiple autocomplete backspace test

📖 Usage: npm run test:list
`);