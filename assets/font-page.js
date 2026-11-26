const { styles } = await import('./fonts.js' + new URL(import.meta.url).search);

const input = document.getElementById('font-in');
const list = document.getElementById('font-list');
const rows = new Map([...list.querySelectorAll('.fr')].map((r) => [r.dataset.id, r]));
const KEY = 'nana:font-text';

function render() {
  const text = input.value || 'nanaticon';
  for (const s of styles) {
    const row = rows.get(s.id);
    if (row) row.querySelector('.fr-o').textContent = s.fn(text);
  }
  try { localStorage.setItem(KEY, input.value); } catch (e) {}
}
try { const saved = localStorage.getItem(KEY); if (saved) input.value = saved; } catch (e) {}
input.addEventListener('input', render);
render();

document.querySelector('.font-filter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  document.querySelectorAll('.font-filter button').forEach((x) => x.classList.toggle('on', x === b));
  const onlyHangul = b.dataset.f === 'hangul';
  for (const s of styles) {
    const row = rows.get(s.id);
    if (row) row.hidden = onlyHangul && !s.hangul;
  }
});
