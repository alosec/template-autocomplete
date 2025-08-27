# Global Brain Scraping Tools

ETL pipeline for extracting content from edge.globalbrain.ai using Selenium.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Chrome/Chromium browser (for Selenium WebDriver)

## Usage

### Extract (Phase 1)
Fetch raw HTML content with JavaScript rendering:

```bash
python extract.py
```

This will:
- Use headless Chrome to load pages with full JS execution
- Save rendered HTML to `data/` directory
- Include metadata files with fetch details
- Start with main page, expand to categories after analysis

### Transform (Phase 2) 
Parse HTML and extract structured content:

```bash
python transform.py  # TODO: Implement after extraction analysis
```

### Load (Phase 3)
Convert to application-ready JSON format:

```bash
python load.py  # TODO: Implement after transformation
```

## Architecture

Following the proven pattern:
1. **Extract**: Raw content fetch with Selenium for JS-heavy sites
2. **Transform**: HTML parsing and content extraction 
3. **Load**: Schema mapping and data structuring

## Output Structure

```
scrape-brain/
├── data/
│   ├── main_page.html          # Raw HTML content
│   ├── main_page.html.meta.json  # Fetch metadata
│   └── ...                     # Additional pages
├── extract.py                  # Selenium-based fetcher
├── transform.py               # HTML parser (TODO)
└── load.py                    # JSON converter (TODO)
```

## Notes

- Headless Chrome with respectful 2-second delays
- Robust error handling and cleanup
- Metadata tracking for debugging and analysis