import { gameScopes } from '../lib/records';

const scopeSelect = document.querySelector<HTMLSelectElement>('#game-scope')!;
const rows = [...document.querySelectorAll<HTMLTableRowElement>('tbody tr[data-scope]')];
const empty = document.querySelector<HTMLElement>('#empty-records')!;
const scopeStatus = document.querySelector<HTMLElement>('#scope-status')!;
const evidence = document.querySelector<HTMLElement>('#evidence')!;
const panels = [...document.querySelectorAll<HTMLElement>('[data-record-id]')];
const notFound = document.querySelector<HTMLElement>('#record-not-found')!;
const copyButton = document.querySelector<HTMLButtonElement>('#copy-record')!;
const copyInput = document.querySelector<HTMLInputElement>('#record-link')!;
const copyStatus = document.querySelector<HTMLElement>('#copy-status')!;
const navigation = [...document.querySelectorAll<HTMLAnchorElement>('.site-header nav a')];

function syncFromUrl(focusEvidence = false) {
  const url = new URL(window.location.href);
  const scope = gameScopes.find(item => item.value === url.searchParams.get('scope')) ?? gameScopes[0];
  scopeSelect.value = scope.value;
  rows.forEach(row => {
    row.hidden = scope.value === 'combined'
      ? row.dataset.scope !== 'regular' && row.dataset.scope !== 'playoffs'
      : row.dataset.scope !== scope.value;
  });
  const count = rows.filter(row => !row.hidden).length;
  empty.hidden = count !== 0;
  scopeStatus.textContent = `${count} sample ${count === 1 ? 'record' : 'records'}. ${scope.description}.`;

  const id = url.searchParams.get('record');
  const panel = panels.find(item => item.dataset.recordId === id);
  evidence.hidden = id === null;
  panels.forEach(item => { item.hidden = item !== panel; });
  notFound.hidden = id === null || Boolean(panel);
  copyButton.hidden = !panel;
  copyInput.hidden = true;
  copyStatus.textContent = '';

  const currentSection = navigation.some(link => link.hash === url.hash) ? url.hash : '#record-book';
  navigation.forEach(link => {
    if (link.hash === currentSection) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (focusEvidence && id !== null) {
    (panel ?? notFound).querySelector<HTMLElement>('h2')!.focus({ preventScroll: true });
    evidence.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

document.querySelectorAll<HTMLAnchorElement>('a[data-record]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set('record', link.dataset.record!);
    url.hash = 'evidence';
    window.history.pushState(null, '', url);
    syncFromUrl(true);
  });
});

scopeSelect.addEventListener('change', () => {
  const url = new URL(window.location.href);
  if (scopeSelect.value === 'regular') url.searchParams.delete('scope');
  else url.searchParams.set('scope', scopeSelect.value);
  window.history.pushState(null, '', url);
  syncFromUrl();
});

[...navigation, ...document.querySelectorAll<HTMLAnchorElement>('#close-evidence, [data-return-to-records]')].forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.delete('record');
    url.hash = link.hash;
    window.history.pushState(null, '', url);
    syncFromUrl();
    const section = document.getElementById(link.hash.slice(1))!;
    section.focus({ preventScroll: true });
    section.scrollIntoView({ block: 'start' });
  });
});

copyButton.addEventListener('click', () => {
  const showCopyField = () => {
    copyInput.value = window.location.href;
    copyInput.hidden = false;
    copyInput.focus();
    copyInput.select();
    copyStatus.textContent = 'Select and copy this record link.';
  };
  if (!navigator.clipboard) { showCopyField(); return; }
  copyButton.disabled = true;
  navigator.clipboard.writeText(window.location.href).then(
    () => { copyStatus.textContent = 'Link copied.'; },
    showCopyField,
  ).finally(() => { copyButton.disabled = false; });
});

document.querySelectorAll<HTMLImageElement>('img[data-initials]').forEach(image => {
  const showFallback = () => {
    const fallback = document.createElement('span');
    fallback.className = `${image.className} image-fallback`;
    fallback.textContent = image.dataset.initials!;
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', image.alt || 'Team image unavailable');
    image.replaceWith(fallback);
  };
  image.addEventListener('error', showFallback, { once: true });
  if (image.complete && image.naturalWidth === 0) showFallback();
});

window.addEventListener('popstate', () => syncFromUrl());
window.addEventListener('hashchange', () => syncFromUrl());
syncFromUrl(true);
