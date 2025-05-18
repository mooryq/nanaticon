from bs4 import BeautifulSoup

with open("emoji_list.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html.parser")

emoji_map = {}  # { "grinning face": ["face", "smile", "happy", ...] }

for row in soup.select("tr"):
    tds = row.find_all("td")
    if len(tds) >= 16:
        emoji_char = tds[1].text.strip()
        name = tds[15].text.strip().lower()
        keywords = tds[16].text.strip().lower().split(" ") if len(tds) >= 17 else []
        emoji_map[name] = {
            "emoji": emoji_char,
            "keywords": keywords
        }
