import json

# 1. JSON 파일 경로
with open("emoji.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# 2. HTML로 변환
html_items = []
for item in data["emojis"]:
    emoji = item["emoji"]
    name = item["name"]
    html_items.append(f'<div class="emoji" data-name="{name.lower()}">{emoji} {name}</div>')

# 3. 전체 HTML 구조
html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{data["name"]}</title>
  <style>
    .emoji {{
      display: inline-block;
      margin: 8px;
      padding: 10px;
      cursor: pointer;
      border: 1px solid #ddd;
      border-radius: 6px;
    }}
    .emoji:hover {{ background: #f0f0f0; }}
    #emojiSearch {{
      margin: 20px 0;
      padding: 8px;
      width: 100%;
      max-width: 300px;
      font-size: 16px;
    }}
  </style>
</head>
<body>
  <h1>{data["name"]}</h1>
  <input type="text" id="emojiSearch" placeholder="이모지 검색...">
  <div id="emojiResults">
    {"".join(html_items)}
  </div>
  <script>
    const input = document.getElementById("emojiSearch");
    const emojis = document.querySelectorAll(".emoji");
    input.addEventListener("input", () => {{
      const q = input.value.toLowerCase();
      emojis.forEach(el => {{
        const name = el.dataset.name.toLowerCase();
        el.style.display = name.includes(q) ? "inline-block" : "none";
      }});
    }});
    emojis.forEach(el => {{
      el.addEventListener("click", () => {{
        const symbol = el.textContent.trim().split(" ")[0];
        navigator.clipboard.writeText(symbol);
        alert("복사됨: " + symbol);
      }});
    }});
  </script>
</body>
</html>
"""

# 4. 파일로 저장
with open("emoji_page.html", "w", encoding="utf-8") as f:
    f.write(html)
print("✅ 저장 완료: emoji_page.html")
