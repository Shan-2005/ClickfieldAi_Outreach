import asyncio
import re
from playwright.async_api import async_playwright

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[\ue000-\uf8ff]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_coords(url: str):
    match = re.search(r'@([0-9\.\-]+),([0-9\.\-]+)', url)
    if match:
        return match.group(1), match.group(2)
    return None, None

async def test_scrolling_and_details():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="en-US",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        query = "construction companies in Chennai"
        url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}?hl=en"
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        try:
            await page.wait_for_selector('div[role="feed"]', timeout=15000)
        except Exception:
            pass
            
        await asyncio.sleep(2)
        
        feed = await page.query_selector('div[role="feed"]')
        if feed:
            # Scroll down to get 30+ items
            for s in range(5):
                await feed.evaluate('el => el.scrollBy(0, 1500)')
                await asyncio.sleep(1.2)
                
        links = await page.query_selector_all('a.hfpxzc')
        print(f"Total found for '{query}': {len(links)}")
        
        for i, link in enumerate(links[:5]):
            name = await link.get_attribute("aria-label")
            await link.click()
            await asyncio.sleep(2)
            
            # Address
            addr_elem = await page.query_selector('button[data-item-id="address"] div.fontBodyMedium')
            address = clean_text(await addr_elem.inner_text()) if addr_elem else ""
            
            # Phone
            phone_elem = await page.query_selector('button[data-item-id^="phone"] div.fontBodyMedium')
            phone = clean_text(await phone_elem.inner_text()) if phone_elem else ""
            
            # Website
            web_elem = await page.query_selector('a[data-item-id="authority"]')
            website = await web_elem.get_attribute("href") if web_elem else ""
            
            # Rating
            rating_elem = await page.query_selector('div.F7nice span[aria-hidden="true"]')
            rating = clean_text(await rating_elem.inner_text()) if rating_elem else ""
            
            # Reviews count
            reviews = ""
            reviews_elem = await page.query_selector('div.F7nice span[aria-label*="reviews"], div.F7nice span:last-child')
            if reviews_elem:
                raw_rev = await reviews_elem.inner_text()
                # e.g. "(45)" or "45 reviews"
                rev_match = re.search(r'\(?([\d,]+)\)?', raw_rev)
                if rev_match:
                    reviews = rev_match.group(1).replace(",", "")
            
            # Category
            cat_elem = await page.query_selector('button.DkEaL')
            category = clean_text(await cat_elem.inner_text()) if cat_elem else ""
            
            lat, lng = extract_coords(page.url)
            
            print(f"[{i+1}] Name: {name}")
            print(f"    Category: {category}")
            print(f"    Rating: {rating} ({reviews} reviews)")
            print(f"    Phone: {phone}")
            print(f"    Website: {website}")
            print(f"    Address: {address}")
            print(f"    Coords: {lat}, {lng}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_scrolling_and_details())
