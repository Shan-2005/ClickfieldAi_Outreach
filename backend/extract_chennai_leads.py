import asyncio
import csv
import json
import os
import re
import sqlite3
import urllib.parse
from typing import Dict, List, Optional, Set
import httpx
from playwright.async_api import async_playwright

# Output paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

CSV_FILE_ROOT = os.path.join(PROJECT_ROOT, "chennai_b2b_leads.csv")
CSV_FILE_DATA = os.path.join(DATA_DIR, "chennai_b2b_leads.csv")
JSON_FILE_ROOT = os.path.join(PROJECT_ROOT, "chennai_b2b_leads.json")
DB_PATH = os.path.join(BASE_DIR, "radar.db")

SEARCH_TARGETS = [
    # --- Manufacturing ---
    {"sector": "Manufacturing", "query": "manufacturing companies in Guindy Chennai"},
    {"sector": "Manufacturing", "query": "manufacturing companies in Ambattur Industrial Estate Chennai"},
    {"sector": "Manufacturing", "query": "manufacturing companies in Sriperumbudur Chennai"},
    {"sector": "Manufacturing", "query": "automotive manufacturing companies in Oragadam Chennai"},
    {"sector": "Manufacturing", "query": "precision engineering manufacturing companies in Chennai"},

    # --- Construction ---
    {"sector": "Construction", "query": "construction companies in Chennai"},
    {"sector": "Construction", "query": "civil engineering contractors in Chennai"},
    {"sector": "Construction", "query": "building construction contractors in Anna Nagar Chennai"},
    {"sector": "Construction", "query": "commercial builders and contractors in Porur Chennai"},
    {"sector": "Construction", "query": "infrastructure construction companies in Chennai"},

    # --- Real Estate ---
    {"sector": "Real Estate", "query": "real estate developers in Chennai"},
    {"sector": "Real Estate", "query": "builders and property promoters in OMR Chennai"},
    {"sector": "Real Estate", "query": "real estate companies in Anna Nagar Chennai"},
    {"sector": "Real Estate", "query": "builders and developers in Velachery Chennai"},
    {"sector": "Real Estate", "query": "property developers in T Nagar Chennai"},
]

def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = re.sub(r'[\ue000-\uf8ff]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_pincode(address: str) -> str:
    match = re.search(r'\b(600\d{3}|602\d{3}|603\d{3})\b', address)
    return match.group(1) if match else ""

def extract_area(address: str) -> str:
    areas = [
        "Guindy", "Ambattur", "Sriperumbudur", "Oragadam", "Maraimalai Nagar",
        "Anna Nagar", "T. Nagar", "T Nagar", "OMR", "Velachery", "Porur",
        "Tambaram", "Adyar", "Nungambakkam", "Kodambakkam", "Vadapalani",
        "Alwarpet", "Mylapore", "Kilpauk", "Perungudi", "Thoraipakkam",
        "Sholinganallur", "Siruseri", "Ekkattuthangal", "Pallavaram", "Chromepet",
        "Avadi", "Poonamallee", "Madhavaram", "Ennore", "Manali", "Thirumudivakkam"
    ]
    for area in areas:
        if re.search(rf'\b{re.escape(area)}\b', address, re.IGNORECASE):
            return area
    return "Chennai"

def extract_coords(url: str):
    match = re.search(r'@([0-9\.\-]+),([0-9\.\-]+)', url)
    if match:
        return match.group(1), match.group(2)
    return "", ""

async def find_email_from_website(client: httpx.AsyncClient, website_url: str) -> str:
    """Attempts to find a public business email on website homepage or contact page."""
    if not website_url or website_url == "N/A" or "google.com" in website_url:
        return ""
    
    try:
        parsed = urllib.parse.urlparse(website_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        
        urls_to_try = [website_url]
        contact_path = f"{base}/contact"
        about_path = f"{base}/about"
        urls_to_try.extend([contact_path, about_path])
        
        email_regex = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
        ignored_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.css', '.js')
        
        for url in urls_to_try:
            try:
                resp = await client.get(url, timeout=4.0, follow_redirects=True)
                if resp.status_code == 200:
                    found = email_regex.findall(resp.text)
                    for e in found:
                        e_clean = e.lower().strip()
                        if not any(e_clean.endswith(ext) for ext in ignored_extensions):
                            if "sentry" not in e_clean and "wixpress" not in e_clean and "example" not in e_clean:
                                return e_clean
            except Exception:
                pass
    except Exception:
        pass
    return ""

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chennai_b2b_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sector TEXT,
            name TEXT UNIQUE,
            category TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            address TEXT,
            area TEXT,
            pincode TEXT,
            city TEXT DEFAULT 'Chennai',
            rating TEXT,
            reviews_count TEXT,
            google_maps_url TEXT,
            latitude TEXT,
            longitude TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_to_db(records: List[Dict]):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    for r in records:
        try:
            cur.execute("""
                INSERT OR REPLACE INTO chennai_b2b_leads (
                    sector, name, category, phone, email, website,
                    address, area, pincode, city, rating, reviews_count,
                    google_maps_url, latitude, longitude
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r.get("sector"), r.get("name"), r.get("category"), r.get("phone"),
                r.get("email"), r.get("website"), r.get("address"), r.get("area"),
                r.get("pincode"), r.get("city", "Chennai"), r.get("rating"),
                r.get("reviews_count"), r.get("google_maps_url"), r.get("latitude"),
                r.get("longitude")
            ))
        except Exception as e:
            print(f"DB Insert error for {r.get('name')}: {e}")
    conn.commit()
    conn.close()

def export_files(records: List[Dict]):
    fieldnames = [
        "sector", "name", "category", "phone", "email", "website",
        "address", "area", "pincode", "city", "rating", "reviews_count",
        "google_maps_url", "latitude", "longitude"
    ]
    
    # Save CSV
    for path in [CSV_FILE_ROOT, CSV_FILE_DATA]:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in records:
                writer.writerow({k: r.get(k, "") for k in fieldnames})
                
    # Save JSON
    with open(JSON_FILE_ROOT, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
        
    print(f"\n[OK] Files exported successfully:")
    print(f" -> CSV: {CSV_FILE_ROOT}")
    print(f" -> JSON: {JSON_FILE_ROOT}")

async def run_pipeline(max_items_per_query: int = 15):
    print("=========================================================")
    print("   ZERO-COST CHENNAI B2B GOOGLE MAPS INTELLIGENCE ENGINE  ")
    print("=========================================================")
    print(f"Target Sectors: Manufacturing, Construction, Real Estate")
    print(f"Target Locations: In & around Chennai (Guindy, Ambattur, Sriperumbudur, OMR, Porur, etc.)")
    print(f"Cost: Rs 0.00 (Nil)")
    print("=========================================================\n")
    
    init_db()
    all_leads: List[Dict] = []
    seen_names: Set[str] = set()
    seen_phones: Set[str] = set()

    http_client = httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}, verify=False)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="en-US",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for target_idx, target in enumerate(SEARCH_TARGETS, 1):
            sector = target["sector"]
            query = target["query"]
            print(f"\n[{target_idx}/{len(SEARCH_TARGETS)}] Querying '{query}' [{sector}]...")

            search_url = f"https://www.google.com/maps/search/{urllib.parse.quote_plus(query)}?hl=en"
            try:
                await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"  Navigation failed: {e}")
                continue

            feed = await page.query_selector('div[role="feed"]')
            if feed:
                # Scroll to load listings
                for _ in range(4):
                    await feed.evaluate('el => el.scrollBy(0, 1500)')
                    await asyncio.sleep(1.0)

            links = await page.query_selector_all('a.hfpxzc')
            print(f"  Found {len(links)} listings in feed. Processing up to {max_items_per_query}...")

            count_for_query = 0
            for link in links:
                if count_for_query >= max_items_per_query:
                    break

                try:
                    name_attr = await link.get_attribute("aria-label")
                    name = clean_text(name_attr)
                    if not name or name.lower() in seen_names:
                        continue

                    # Click listing to view detail panel
                    await link.click()
                    await asyncio.sleep(1.5)

                    # Address
                    addr_elem = await page.query_selector('button[data-item-id="address"] div.fontBodyMedium')
                    address = clean_text(await addr_elem.inner_text()) if addr_elem else ""

                    # Phone
                    phone_elem = await page.query_selector('button[data-item-id^="phone"] div.fontBodyMedium')
                    phone = clean_text(await phone_elem.inner_text()) if phone_elem else ""

                    # Normalize phone for dedup
                    norm_phone = re.sub(r'\D', '', phone) if phone else ""
                    if norm_phone and norm_phone in seen_phones:
                        continue

                    # Website
                    web_elem = await page.query_selector('a[data-item-id="authority"]')
                    website = await web_elem.get_attribute("href") if web_elem else ""

                    # Rating
                    rating_elem = await page.query_selector('div.F7nice span[aria-hidden="true"]')
                    rating = clean_text(await rating_elem.inner_text()) if rating_elem else ""

                    # Reviews
                    reviews_count = ""
                    reviews_elem = await page.query_selector('div.F7nice')
                    if reviews_elem:
                        rev_text = await reviews_elem.inner_text()
                        rev_match = re.search(r'\((\d[\d,]*)\)', rev_text)
                        if rev_match:
                            reviews_count = rev_match.group(1).replace(",", "")

                    # Category
                    cat_elem = await page.query_selector('button.DkEaL')
                    category = clean_text(await cat_elem.inner_text()) if cat_elem else sector

                    # Coordinates & Place Link
                    maps_url = page.url
                    lat, lng = extract_coords(maps_url)

                    # Area & Pincode
                    pincode = extract_pincode(address)
                    area = extract_area(address)

                    # Email discovery from website
                    email = ""
                    if website:
                        email = await find_email_from_website(http_client, website)

                    record = {
                        "sector": sector,
                        "name": name,
                        "category": category,
                        "phone": phone,
                        "email": email,
                        "website": website,
                        "address": address,
                        "area": area,
                        "pincode": pincode,
                        "city": "Chennai",
                        "rating": rating,
                        "reviews_count": reviews_count,
                        "google_maps_url": maps_url,
                        "latitude": lat,
                        "longitude": lng
                    }

                    all_leads.append(record)
                    seen_names.add(name.lower())
                    if norm_phone:
                        seen_phones.add(norm_phone)

                    count_for_query += 1
                    print(f"  + [{len(all_leads)}] {name} | Phone: {phone or 'N/A'} | Area: {area} | Web: {'Yes' if website else 'No'}")

                except Exception as ex:
                    continue

            # Periodically sync to CSV and DB after each query target so data is immediately saved!
            if all_leads:
                save_to_db(all_leads)
                export_files(all_leads)

        await browser.close()
    await http_client.aclose()

    print("\n=========================================================")
    print(f"EXTRACTION COMPLETE! Total Unique Leads Collected: {len(all_leads)}")
    print("=========================================================")

if __name__ == "__main__":
    asyncio.run(run_pipeline(max_items_per_query=12))
