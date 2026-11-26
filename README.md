# 나나티콘 (nanaticon)

귀여운 특수문자 이모티콘 모음 — https://nanaticon.vercel.app

## 구조
- `data/site.mjs` — 페이지 제목·설명·메뉴·쿠팡 파트너스 설정
- `data/emoticons/*.txt` — 이모티콘 데이터 (한 줄에 하나)
- `scripts/build.mjs` — 위 데이터로 `index.html`, `sub/*.html`, `sitemap.xml`, `rss.xml`, `assets/search.json` 생성
- `assets/` — 스타일, 스크립트, 인스타 폰트 변환기

`index.html`, `sub/*.html` 은 **자동 생성 파일**이니 직접 고치지 말고 데이터를 고친 뒤 빌드하세요.

```bash
node scripts/build.mjs
```

## 이모티콘 추가하기
`data/emoticons/heart.txt` 같은 파일에 한 줄 추가 → 빌드.

```
## 묶음 제목 {#앵커}
(｡•ᴗ•｡)♡
\u{3164} »» 화면에 보일 설명     ← 공백문자처럼 안 보이는 건 이렇게
줄1\n줄2                          ← 여러 줄 템플릿
@range 2460-2473                  ← 유니코드 범위 (①~⑳)
```

## 새 페이지 추가하기
1. `data/emoticons/새이름.txt` 작성
2. `data/site.mjs` 의 `pages` 에 항목 추가, `navGroups` 에 키 추가
3. 빌드

## 쿠팡 파트너스 붙이기
`data/site.mjs` 의 `coupang` 에서 `enabled: true` 로 바꾸고, 쿠팡 파트너스에서 받은 배너 코드를
`top` / `middle` / `bottom` 에 붙여넣은 뒤 빌드하세요. 대가성 고지 문구는 배너 아래와 푸터에 자동으로 들어갑니다.
