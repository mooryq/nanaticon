// 인스타 폰트 변환 규칙 (브라우저 + 빌드 스크립트 공용 ES 모듈)
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const a = 'abcdefghijklmnopqrstuvwxyz';
const D = '0123456789';
const cp = (n) => String.fromCodePoint(n);

// 수학용 영숫자 블록: 대문자 시작, 소문자 시작, 숫자 시작(없으면 null), 예외 글자
function math(upper, lower, digit, holes = {}) {
  const m = {};
  for (let i = 0; i < 26; i++) {
    m[A[i]] = holes[A[i]] || cp(upper + i);
    m[a[i]] = holes[a[i]] || cp(lower + i);
  }
  if (digit) for (let i = 0; i < 10; i++) m[D[i]] = cp(digit + i);
  return m;
}
function fromStrings(up, low, dig) {
  const m = {};
  const U = [...up], L = [...low], G = dig ? [...dig] : [];
  for (let i = 0; i < 26; i++) { if (U[i]) m[A[i]] = U[i]; if (L[i]) m[a[i]] = L[i]; }
  G.forEach((c, i) => (m[D[i]] = c));
  return m;
}
const mapText = (m) => (s) => [...s].map((c) => m[c] ?? c).join('');
const combine = (mark) => (s) => [...s].map((c) => (c === ' ' || c === '\n' ? c : c + mark)).join('');
const between = (sep) => (s) => [...s].filter((c) => c !== ' ').join(sep);
const wrap = (l, r) => (s) => l + s + r;

const circledNum = '⓪①②③④⑤⑥⑦⑧⑨';
const negCircledNum = '⓿❶❷❸❹❺❻❼❽❾';

const smallCaps = fromStrings('ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ', 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ');
const superscript = fromStrings('ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ', 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ', '⁰¹²³⁴⁵⁶⁷⁸⁹');
const flipMap = fromStrings('∀ꓭƆꓷƎℲ⅁HIſꓘ⅂WNOԀΌꓤS⊥∩ΛMX⅄Z', 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz', '0ƖᄅƐㄣϛ9ㄥ86');
const bubbleMap = (() => { const m = math(0x24b6, 0x24d0, null); [...circledNum].forEach((c, i) => (m[D[i]] = c)); return m; })();
const fullwidth = math(0xff21, 0xff41, 0xff10);

// hangul: 한글에도 효과가 보이는지
export const styles = [
  { id: 'script', name: '필기체', fn: mapText(math(0x1d49c, 0x1d4b6, null, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' })) },
  { id: 'boldscript', name: '굵은 필기체', fn: mapText(math(0x1d4d0, 0x1d4ea, null)) },
  { id: 'bold', name: '굵게 (Bold)', fn: mapText(math(0x1d400, 0x1d41a, 0x1d7ce)) },
  { id: 'italic', name: '기울임 (Italic)', fn: mapText(math(0x1d434, 0x1d44e, null, { h: 'ℎ' })) },
  { id: 'bolditalic', name: '굵은 기울임', fn: mapText(math(0x1d468, 0x1d482, null)) },
  { id: 'sans', name: '산세리프', fn: mapText(math(0x1d5a0, 0x1d5ba, 0x1d7e2)) },
  { id: 'sansbold', name: '산세리프 굵게', fn: mapText(math(0x1d5d4, 0x1d5ee, 0x1d7ec)) },
  { id: 'sansitalic', name: '산세리프 기울임', fn: mapText(math(0x1d608, 0x1d622, null)) },
  { id: 'sansbolditalic', name: '산세리프 굵은 기울임', fn: mapText(math(0x1d63c, 0x1d656, null)) },
  { id: 'double', name: '더블 라인', fn: mapText(math(0x1d538, 0x1d552, 0x1d7d8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' })) },
  { id: 'fraktur', name: '고딕 (Fraktur)', fn: mapText(math(0x1d504, 0x1d51e, null, { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' })) },
  { id: 'boldfraktur', name: '굵은 고딕', fn: mapText(math(0x1d56c, 0x1d586, null)) },
  { id: 'mono', name: '타자기 (Mono)', fn: mapText(math(0x1d670, 0x1d68a, 0x1d7f6)) },
  { id: 'smallcaps', name: '작은 대문자', fn: mapText(smallCaps) },
  { id: 'super', name: '위첨자 (작은 글씨)', fn: mapText(superscript) },
  { id: 'bubble', name: '동그라미', fn: mapText(bubbleMap) },
  { id: 'bubbleblack', name: '검은 동그라미', fn: (s) => [...s].map((c) => { const u = c.toUpperCase(); const i = A.indexOf(u); if (i >= 0) return cp(0x1f150 + i); const d = D.indexOf(c); return d >= 0 ? negCircledNum[d] : c; }).join('') },
  { id: 'square', name: '네모', fn: (s) => [...s].map((c) => { const i = A.indexOf(c.toUpperCase()); return i >= 0 ? cp(0x1f130 + i) : c; }).join('') },
  { id: 'squareblack', name: '검은 네모', fn: (s) => [...s].map((c) => { const i = A.indexOf(c.toUpperCase()); return i >= 0 ? cp(0x1f170 + i) : c; }).join('') },
  { id: 'paren', name: '괄호', fn: (s) => [...s].map((c) => { const i = a.indexOf(c.toLowerCase()); return i >= 0 ? cp(0x249c + i) : c; }).join('') },
  { id: 'wide', name: '넓은 글씨 (전각)', hangul: true, fn: (s) => mapText(fullwidth)(s).replace(/ /g, '　') },
  { id: 'flip', name: '뒤집기', fn: (s) => [...mapText(flipMap)(s)].reverse().join('') },
  { id: 'underline', name: '밑줄', hangul: true, fn: combine('̲') },
  { id: 'strike', name: '취소선', hangul: true, fn: combine('̶') },
  { id: 'slash', name: '사선 취소선', hangul: true, fn: combine('̸') },
  { id: 'dotted', name: '밑점', hangul: true, fn: combine('̤') },
  { id: 'heart', name: '글자 사이 하트', hangul: true, fn: between('♡') },
  { id: 'dot', name: '글자 사이 점', hangul: true, fn: between('·') },
  { id: 'star', name: '글자 사이 별', hangul: true, fn: between('⋆') },
  { id: 'spaced', name: '띄어 쓰기', hangul: true, fn: between(' ') },
  { id: 'sparkle', name: '반짝이 감싸기', hangul: true, fn: wrap('⋆˚✿˖° ', ' °˖✿˚⋆') },
  { id: 'ribbon', name: '리본 감싸기', hangul: true, fn: wrap('୨ৎ ', ' ୨ৎ') },
  { id: 'cloud', name: '꒰ 구름 괄호 ꒱', hangul: true, fn: wrap('꒰ ', ' ꒱') },
  { id: 'wing', name: '꧁ 날개 ꧂', hangul: true, fn: wrap('꧁༺ ', ' ༻꧂') },
  { id: 'heartwrap', name: '하트 감싸기', hangul: true, fn: wrap('𓆩♡𓆪 ', ' 𓆩♡𓆪') },
  { id: 'bracket', name: '『 낫표 』', hangul: true, fn: wrap('『', '』') },
];

export function convertAll(text) {
  return styles.map((s) => ({ id: s.id, name: s.name, hangul: !!s.hangul, out: s.fn(text) }));
}
