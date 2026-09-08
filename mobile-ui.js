(() => {
  const root = document.querySelector('.text-to-image-converter-settings');
  const controls = root?.querySelector('.tti-editor-controls');
  if (!controls) return;
  const media = matchMedia('(max-width: 1000px)');
  const replaceButton = document.getElementById('tti_open_replace_modal');
  const lengthBadge = document.getElementById('tti_text_length_badge');
  const textModal = document.getElementById('tti_text_modal_backdrop');
  // Move the original controls so their existing handlers and live count stay connected.
  const mobileMoves = [
    [replaceButton, textModal?.querySelector('.text-field-buttons')],
    [lengthBadge, textModal?.querySelector('header > div')],
    ...Array.from(controls.querySelectorAll('#image-style > section'), section => [section, controls.querySelector('#background')]),
  ].filter(([node, destination]) => node && destination).map(([node, destination]) => {
    const anchor = document.createComment('desktop control position');
    node.before(anchor);
    return { node, destination, anchor };
  });
  const scroll = document.createElement('div');
  scroll.className = 'tti-mobile-scroll';
  scroll.append(...controls.childNodes);
  controls.append(scroll);
  controls.id = 'tti-mobile-settings';
  const header = document.createElement('div');
  header.className = 'tti-mobile-sheet-header';
  header.innerHTML = `<button type="button" class="tti-mobile-handle" aria-label="편집 패널 확대 또는 축소"><span></span></button>
    <div class="tti-mobile-sheet-heading"><strong>글꼴</strong><div>
    <button type="button" class="tti-mobile-expand" aria-label="패널 확대">확대</button>
    <button type="button" class="tti-mobile-close" aria-label="편집 패널 닫기">닫기</button></div></div>`;
  controls.prepend(header);
  const bar = document.createElement('nav');
  bar.className = 'tti-mobile-bar';
  bar.setAttribute('aria-label', '편집 도구');
  bar.innerHTML = [
    ['text', 'pen-to-square', '본문'], ['font', 'font', '글꼴'],
    ['background', 'image', '배경'], ['other', 'sliders', '기타'],
    ['save', 'download', '저장'],
  ].map(([key, icon, label]) => `<button type="button" data-mobile-tool="${key}" aria-label="${key === 'save' ? '현재 미리보기 저장 또는 복사' : label}"><i class="fa-solid fa-${icon}" aria-hidden="true"></i><span>${label}</span></button>`).join('');
  root.append(bar);
  root.classList.add('tti-mobile-ready');
  let category = 'font';
  let state = 'closed';
  let otherTab = 'footer';
  const positions = {};
  const titles = { font: '글꼴', background: '배경', other: '기타 설정' };
  const toolButton = (key) => bar.querySelector(`[data-mobile-tool="${key}"]`);
  for (const key of Object.keys(titles)) {
    toolButton(key).setAttribute('aria-controls', controls.id);
  }
  function sync() {
    for (const { node, destination, anchor } of mobileMoves) {
      if (media.matches) destination.append(node);
      else anchor.after(node);
    }
    root.dataset.mobileSheet = state;
    root.dataset.mobileCategory = category;
    controls.inert = media.matches && state === 'closed';
    header.querySelector('strong').textContent = titles[category];
    header.querySelector('.tti-mobile-expand').textContent = state === 'expanded' ? '축소' : '확대';
    header.querySelector('.tti-mobile-expand').setAttribute('aria-label', state === 'expanded' ? '패널 축소' : '패널 확대');
    header.querySelector('.tti-mobile-handle').setAttribute('aria-expanded', String(state === 'expanded'));
    for (const key of Object.keys(titles)) {
      toolButton(key).setAttribute('aria-expanded', String(state !== 'closed' && key === category));
    }
  }
  function close() {
    positions[category] = scroll.scrollTop;
    state = 'closed';
    sync();
    toolButton(category).focus({ preventScroll: true });
  }
  function toggleSize() {
    state = state === 'expanded' ? 'half' : 'expanded';
    sync();
  }
  function selectCategory(key) {
    positions[category] = scroll.scrollTop;
    if (category === key && state !== 'closed') return close();
    category = key;
    state = 'half';
    const tab = key === 'font' ? 'text-style' : key === 'background' ? 'background' : otherTab;
    scroll.querySelector(`[data-tab="${tab}"]`)?.click();
    sync();
    scroll.scrollTop = positions[category] || 0;
  }
  bar.addEventListener('click', (event) => {
    const key = event.target.closest('[data-mobile-tool]')?.dataset.mobileTool;
    if (!key) return;
    if (key === 'text') {
      document.getElementById('tti_open_text_modal')?.click();
    } else if (key === 'save') {
      root.querySelector('.image-preview-item.current .download-btn')?.click();
    } else selectCategory(key);
  });
  scroll.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]')?.dataset.tab;
    if (tab && !['text-style', 'background'].includes(tab)) otherTab = tab;
  });
  header.querySelector('.tti-mobile-close').addEventListener('click', close);
  header.querySelector('.tti-mobile-expand').addEventListener('click', toggleSize);
  const handle = header.querySelector('.tti-mobile-handle');
  let drag = null;
  let suppressClick = false;
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { y: event.clientY, id: event.pointerId };
    suppressClick = false;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointerup', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientY - drag.y;
    drag = null;
    suppressClick = Math.abs(distance) > 30;
    if (!suppressClick) return;
    if (distance < 0) { state = 'expanded'; sync(); }
    else if (state === 'expanded') { state = 'half'; sync(); }
    else close();
  });
  handle.addEventListener('pointercancel', () => { drag = null; });
  handle.addEventListener('click', () => {
    if (!suppressClick) toggleSize();
    suppressClick = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && media.matches && state !== 'closed' && !document.querySelector('.tti-modal-backdrop.open')) close();
  });
  media.addEventListener('change', sync);
  const stage = root.querySelector('.tti-preview-stage');
  const preview = root.querySelector('#image_preview_container');
  const fit = () => {
    const space = Math.max(0, stage.clientHeight - 30);
    root.style.setProperty('--tti-mobile-preview-height', `${space}px`);
  };
  new ResizeObserver(fit).observe(stage);
  const updateSave = () => {
    toolButton('save').disabled = !preview.querySelector('.current .download-btn');
  };
  new MutationObserver(updateSave).observe(preview, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  updateSave();
  sync();
})();
