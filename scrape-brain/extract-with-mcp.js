#!/usr/bin/env node
/**
 * Global Brain content extraction using MCP Puppeteer tools
 * Saves raw content directly to files without Claude processing to avoid token waste
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for extracted content
const DATA_DIR = path.join(__dirname, 'data');

// Categories to extract based on appendix analysis
const CATEGORIES = [
  { name: "Claude's Investigations", filename: 'claude-investigations.json', priority: 'high' },
  { name: "impt unsolved problems", filename: 'unsolved-problems.json', priority: 'high' },
  { name: "World Suggestion Boxes", filename: 'world-suggestions.json', priority: 'medium' },
  { name: "Global Brain", filename: 'global-brain.json', priority: 'medium' },
  { name: "Scientific Progress", filename: 'scientific-progress.json', priority: 'high' },
  { name: "Curated Lists", filename: 'curated-lists.json', priority: 'medium' },
  { name: "what useful lists are there for bhealing back pain", filename: 'healing-back-pain.json', priority: 'medium' }
];

// Extraction scripts to be used with MCP Puppeteer evaluate
const EXTRACTION_SCRIPTS = {
  // Basic content extraction similar to what worked in the appendix
  initial: `
    var structure = {
      title: document.title,
      url: window.location.href,
      extractedAt: new Date().toISOString()
    };

    var categories = [];
    var allElements = document.querySelectorAll('*');

    for (var i = 0; i < allElements.length; i++) {
      var element = allElements[i];
      var text = element.textContent ? element.textContent.trim() : '';
      
      // Look for category headers with counts
      if (text && text.length > 5 && text.length < 100 && element.children.length === 0) {
        var nextSibling = element.nextElementSibling;
        var count = null;
        
        if (nextSibling && /^\\d+$/.test(nextSibling.textContent?.trim() || '')) {
          count = parseInt(nextSibling.textContent.trim());
        }
        
        categories.push({
          text: text,
          count: count,
          tagName: element.tagName,
          className: element.className
        });
      }
    }

    ({
      ...structure,
      categories: categories.slice(0, 50),
      totalFound: categories.length
    });
  `,

  // Deep content extraction for expanded categories
  detailed: `
    var detailedContent = [];
    var allTextElements = document.querySelectorAll('*');

    for (var i = 0; i < allTextElements.length; i++) {
      var element = allTextElements[i];
      var text = element.textContent ? element.textContent.trim() : '';
      
      // Look for substantial content items
      if (text && text.length > 15 && text.length < 500 && element.children.length === 0) {
        detailedContent.push({
          text: text,
          tag: element.tagName,
          className: element.className,
          id: element.id
        });
      }
    }

    // Filter out UI elements and duplicates
    var filteredContent = [];
    var seenTexts = {};
    
    for (var i = 0; i < detailedContent.length; i++) {
      var item = detailedContent[i];
      var text = item.text;
      
      // Skip UI elements and short content
      if (!seenTexts[text] && 
          !text.match(/^(Recently|My |Local |BETA|Global|Sign|Ctrl|Filters|Sort|Display|User|Pinned)/) &&
          !text.match(/^\\d+$/) &&
          text.indexOf('gmail.com') === -1) {
        filteredContent.push(item);
        seenTexts[text] = true;
      }
    }

    // Sort by length to get substantial content first
    filteredContent.sort(function(a, b) { return b.text.length - a.text.length; });

    ({
      extractedAt: new Date().toISOString(),
      totalItems: filteredContent.length,
      content: filteredContent.slice(0, 100), // Top 100 items
      fullText: document.body.innerText
    });
  `
};

async function saveToFile(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${filename} (${JSON.stringify(data).length} chars)`);
}

async function extractionInstructions() {
  console.log('🧠 Global Brain Extraction Instructions');
  console.log('=' .repeat(50));
  console.log('');
  console.log('This script provides MCP Puppeteer commands to extract Global Brain content.');
  console.log('Run these commands manually in Claude to avoid ARM64 Selenium issues:');
  console.log('');
  
  console.log('1️⃣ Navigate to Global Brain:');
  console.log('   Use MCP Puppeteer navigate tool with URL: https://edge.globalbrain.ai/');
  console.log('');
  
  console.log('2️⃣ Initial Structure Extraction:');
  console.log('   Use MCP Puppeteer evaluate with this script:');
  console.log('');
  console.log('```javascript');
  console.log(EXTRACTION_SCRIPTS.initial.trim());
  console.log('```');
  console.log('');
  console.log('   Save the result to: initial-structure.json');
  console.log('');
  
  console.log('3️⃣ Detailed Content Extraction:');
  console.log('   Use MCP Puppeteer evaluate with this script:');
  console.log('');
  console.log('```javascript');  
  console.log(EXTRACTION_SCRIPTS.detailed.trim());
  console.log('```');
  console.log('');
  console.log('   Save the result to: detailed-content.json');
  console.log('');
  
  console.log('4️⃣ Category-Specific Extractions:');
  console.log('   For each high-priority category, click the category name and then run detailed extraction:');
  CATEGORIES.filter(c => c.priority === 'high').forEach(cat => {
    console.log(`   • Click: "${cat.name}" → Run detailed script → Save as ${cat.filename}`);
  });
  console.log('');
  
  console.log('5️⃣ Save Results:');
  console.log('   All extracted JSON files will be processed by transform.py and load.py');
  console.log('   to create the final structured dataset for the Global Brain integration.');
  console.log('');
  
  // Create a summary file with these instructions
  const instructions = {
    timestamp: new Date().toISOString(),
    url: 'https://edge.globalbrain.ai/',
    extractionSteps: [
      {
        step: 1,
        action: 'Navigate to Global Brain',
        tool: 'mcp__puppeteer__puppeteer_navigate',
        params: { url: 'https://edge.globalbrain.ai/' }
      },
      {
        step: 2, 
        action: 'Extract initial structure',
        tool: 'mcp__puppeteer__puppeteer_evaluate',
        script: EXTRACTION_SCRIPTS.initial,
        saveAs: 'initial-structure.json'
      },
      {
        step: 3,
        action: 'Extract detailed content',
        tool: 'mcp__puppeteer__puppeteer_evaluate', 
        script: EXTRACTION_SCRIPTS.detailed,
        saveAs: 'detailed-content.json'
      }
    ],
    priorityCategories: CATEGORIES.filter(c => c.priority === 'high'),
    scripts: EXTRACTION_SCRIPTS
  };
  
  await saveToFile('extraction-instructions.json', instructions);
  
  console.log('📋 Instructions saved to extraction-instructions.json');
  console.log('Ready to begin manual MCP Puppeteer extraction!');
}

// Run the instructions generator
extractionInstructions().catch(console.error);