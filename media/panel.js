const vscode = acquireVsCodeApi();
function send(cmd, data) { vscode.postMessage({ command: cmd, data }); }

function startSpin(btn, cmd, data) {
  if (btn.classList.contains('loading') || btn.classList.contains('done')) return;
  btn.classList.add('loading');
  btn.disabled = true;
  send(cmd, data);
  setTimeout(() => {
    btn.classList.remove('loading');
    btn.classList.add('done');
    setTimeout(() => { btn.classList.remove('done'); btn.disabled = false; }, 1000);
  }, 2000);
}
function sendAction(btn, cmd) { startSpin(btn, cmd); }

function toggleDrop(e, id) {
  e.stopPropagation();
  const menu = document.getElementById(id);
  const wasOpen = menu.classList.contains('open');
  closeDrops();
  if (!wasOpen) menu.classList.add('open');
}
function closeDrops() {
  document.querySelectorAll('.drop-menu.open').forEach(m => m.classList.remove('open'));
}
function pickTarget(file, cmd) {
  closeDrops();
  const btn = document.querySelector('#grp-' + cmd + ' .split-main');
  startSpin(btn, 'selectAndRun', { file, cmd });
}
document.addEventListener('click', closeDrops);

function onItemClick(e, file) {
  send('selectFile', file);
}

function toggleHidden() {
  const section = document.getElementById('hiddenSection');
  const btn = document.getElementById('hiddenToggle');
  const opening = section.style.display === 'none';
  section.style.display = opening ? 'block' : 'none';
  btn.style.opacity = opening ? '1' : (window.HIDDEN_COUNT > 0 ? '1' : '0.5');
}

let dragSrcIndex = null;

function onDragStart(e, index) {
  dragSrcIndex = index;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.currentTarget && e.currentTarget.classList.add('dragging'), 0);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-over'));
}

function onDragOver(e, index) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('#fileList .file-item').forEach(el => el.classList.remove('drag-over'));
  if (dragSrcIndex !== null && dragSrcIndex !== index) {
    e.currentTarget.classList.add('drag-over');
  }
  return false;
}

function onDrop(e, dropIndex) {
  e.preventDefault();
  if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;

  const items = [...document.querySelectorAll('#fileList .file-item[data-file]')];
  const files = items.map(el => el.dataset.file);

  const [moved] = files.splice(dragSrcIndex, 1);
  files.splice(dropIndex, 0, moved);

  send('reorderFiles', files);

  const list = document.getElementById('fileList');
  const srcEl = items[dragSrcIndex];
  const dropEl = items[dropIndex];
  if (dragSrcIndex < dropIndex) {
    list.insertBefore(srcEl, dropEl.nextSibling);
  } else {
    list.insertBefore(srcEl, dropEl);
  }

  [...list.querySelectorAll('.file-item[data-index]')].forEach((el, i) => {
    el.dataset.index = String(i);
    el.setAttribute('ondragstart', 'onDragStart(event,' + i + ')');
    el.setAttribute('ondragover', 'onDragOver(event,' + i + ')');
    el.setAttribute('ondrop', 'onDrop(event,' + i + ')');
  });

  dragSrcIndex = null;
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-over'));
}