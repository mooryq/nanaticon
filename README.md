# 나나티콘 (nanaticon)

귀여운 특수문자·이모티콘 모음 — https://nanaticon.vercel.app

## 사이트 구조
| 주소 | 내용 |
|---|---|
| `/` | 홈 |
| `/emoticon`, `/emoticon/<감정·동물>` | 표정·동물 이모티콘 (smile, sad, cat, bear …) |
| `/symbol`, `/symbol/<종류>` | 특수문자 (heart, star, number, math …) |
| `/mood`, `/mood/<테마>` | 감성 테마 (birthday, christmas, spring …) |
| `/tools`, `/tools/<도구>` | 꾸미기 도구 (font, nickname, bio, kakao) |

예전 주소(`/sub/*.html`)는 `vercel.json`에서 새 주소로 영구 리다이렉트돼요.

## 파일
- `data/site.mjs` — 메뉴·페이지 제목/설명/FAQ, 쿠팡 파트너스, 리다이렉트 설정
- `data/emoticons/*.txt` — 이모티콘 데이터 (한 줄에 하나)
- `scripts/build.mjs` — HTML·sitemap·rss·vercel.json·검색 색인 생성
- `scripts/og.mjs` — 페이지별 공유 이미지(`img/og/*.jpg`) 생성 (Playwright 필요)

`index.html`, `emoticon/`, `symbol/`, `mood/`, `tools/`, `*.html`, `vercel.json`, `sitemap.xml` 은 **자동 생성 파일**이에요. 직접 고치지 말고 데이터를 고친 뒤 빌드하세요.

```bash
node scripts/build.mjs
```

## 이모티콘 추가
`data/emoticons/heart.txt` 같은 파일에 한 줄 추가 → 빌드.

```
## 묶음 제목 {#앵커}
(｡•ᴗ•｡)♡
\u{3164} »» 화면에 보일 설명     ← 공백문자처럼 안 보이는 건 이렇게
줄1\n줄2                          ← 여러 줄 템플릿
@range 2460-2473                  ← 유니코드 범위 (①~⑳)
```

## 새 페이지 추가
1. `data/emoticons/<이름>.txt` 작성 (감정·동물 이모티콘은 `e-<이름>.txt`)
2. `data/site.mjs` 의 `pages` 에 `S('이름', {...})` 처럼 추가 (E=이모티콘, S=특수문자, M=감성, T=도구)
3. `node scripts/og.mjs && node scripts/build.mjs`

## 쿠팡 파트너스
`data/site.mjs` 의 `coupang.enabled` 를 `true` 로 바꾸고 배너 코드를 `top` / `middle` / `bottom` 에 넣은 뒤 빌드하세요. 대가성 고지 문구는 자동으로 들어가요.
