#!/usr/bin/env python3
"""
Global Brain data extraction script.
Uses Selenium to fetch JavaScript-rendered content from edge.globalbrain.ai and saves to data/ directory.
"""

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import os
from datetime import datetime
from urllib.parse import urljoin, urlparse
import time

class GlobalBrainExtractor:
    def __init__(self, base_url="https://edge.globalbrain.ai"):
        self.base_url = base_url
        self.data_dir = os.path.join(os.path.dirname(__file__), "data")
        self.driver = None
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
    
    def setup_driver(self):
        """Initialize Firefox driver with appropriate options"""
        firefox_options = Options()
        firefox_options.add_argument("--headless")  # Run in background
        firefox_options.add_argument("--width=1920")
        firefox_options.add_argument("--height=1080")
        
        self.driver = webdriver.Firefox(options=firefox_options)
        self.driver.implicitly_wait(10)
        
    def cleanup_driver(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()
    
    def fetch_page(self, path="", save_as=None, wait_for_selector=None):
        """Fetch a page using Selenium and save rendered HTML content"""
        url = urljoin(self.base_url, path)
        
        if save_as is None:
            # Generate filename from path
            parsed = urlparse(path) if path else urlparse("/")
            save_as = parsed.path.strip("/").replace("/", "_") or "index"
            save_as = f"{save_as}.html"
        
        print(f"Fetching: {url}")
        
        if not self.driver:
            print("Error: Driver not initialized. Call setup_driver() first.")
            return None
        
        try:
            # Load the page
            self.driver.get(url)
            
            # Wait for JavaScript to load content
            if wait_for_selector:
                WebDriverWait(self.driver, 20).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, wait_for_selector))
                )
            else:
                # Generic wait for common content indicators
                time.sleep(3)  # Allow JS to execute
            
            # Get the fully rendered HTML
            html_content = self.driver.page_source
            
            # Save raw HTML
            filepath = os.path.join(self.data_dir, save_as)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Save metadata
            metadata = {
                "url": url,
                "title": self.driver.title,
                "current_url": self.driver.current_url,  # In case of redirects
                "fetched_at": datetime.now().isoformat(),
                "content_length": len(html_content),
                "filepath": save_as,
                "wait_selector": wait_for_selector
            }
            
            metadata_file = os.path.join(self.data_dir, f"{save_as}.meta.json")
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            print(f"Saved: {filepath} ({len(html_content):,} chars)")
            return filepath
            
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def fetch_main_categories(self):
        """Fetch main landing page and key category pages"""
        pages_to_fetch = [
            ("", "main_page.html", None),
            # Add specific paths once we analyze the main page structure
        ]
        
        results = []
        for path, filename, wait_selector in pages_to_fetch:
            result = self.fetch_page(path, filename, wait_selector)
            if result:
                results.append(result)
            # Be respectful - small delay between requests
            time.sleep(2)
        
        return results

def main():
    print("Global Brain Content Extractor")
    print("=" * 40)
    
    extractor = GlobalBrainExtractor()
    
    try:
        # Initialize browser
        print("Setting up Chrome driver...")
        extractor.setup_driver()
        
        # Start with main page
        results = extractor.fetch_main_categories()
        
        print(f"\nExtraction complete. Fetched {len(results)} pages.")
        print("Files saved in:", extractor.data_dir)
        
        # List what we got
        print("\nFiles created:")
        for file in os.listdir(extractor.data_dir):
            filepath = os.path.join(extractor.data_dir, file)
            size = os.path.getsize(filepath)
            print(f"  {file} ({size:,} bytes)")
            
    finally:
        # Always clean up the driver
        print("\nCleaning up browser driver...")
        extractor.cleanup_driver()

if __name__ == "__main__":
    main()