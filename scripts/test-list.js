#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

async function findTestFiles(dir, pattern) {
  try {
    const files = await readdir(dir, { withFileTypes: true });
    let testFiles = [];
    
    for (const file of files) {
      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        testFiles = testFiles.concat(await findTestFiles(fullPath, pattern));
      } else if (file.name.match(pattern)) {
        testFiles.push(fullPath);
      }
    }
    return testFiles;
  } catch (error) {
    return [];
  }
}

async function main() {
  console.log('\n=== Test Files Available ===\n');
  
  // Jest unit tests
  console.log('📋 Jest Unit Tests:');
  const jestTests = await findTestFiles('tests/jest', /\.test\.(ts|tsx|js|jsx)$/);
  jestTests.forEach(file => {
    console.log(`  • ${file}`);
  });
  
  // Playwright e2e tests
  console.log('\n🎭 Playwright E2E Tests:');
  const playwrightTests = await findTestFiles('tests/playwright', /\.spec\.(ts|tsx|js|jsx)$/);
  playwrightTests.forEach(file => {
    console.log(`  • ${file}`);
  });
  
  console.log('\n=== Quick Test Commands ===\n');
  console.log('Jest Commands:');
  console.log('  npm run test:unit              # Run all unit tests');
  console.log('  npm run test:unit:watch        # Watch mode');
  console.log('  npm run test:quick             # Core autocomplete tests');
  console.log('  npm run test:debug             # Verbose debugging');
  
  console.log('\nPlaywright Commands:');
  console.log('  npm run test:integration       # All e2e tests');
  console.log('  npm run test:headed            # With GUI (1000ms slowmo)');
  console.log('  npm run test:e2e:debug         # Debug mode');
  
  console.log('\nCombined Commands:');
  console.log('  npm test                       # All tests (unit + e2e)');
  console.log('  npm run test:feature:autocomplete # Feature-specific tests');
}

main().catch(console.error);