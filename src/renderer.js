let files = [];
let outputDir = '';
let converting = false;

const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');
const emptyState = document.getElementById('empty-state');
const fileCount = document.getElementById('file-count');
const convertBtn = document.getElementById('convert-btn');
const clearBtn = document.getElementById('clear-btn');
const openOutputBtn = document.getElementById('open-output-btn');
const outputPathEl = document.getElementById('output-path');
const progressWrap = document.getElementById('progress-bar-wrap');
const progressBar = document.getElementById('progress-bar');
const statusMsg = document.getElementById('status-msg');

// ── Init default output path ──────────────────────────────────────────────
(async () => {
  outputDir = await window.api.getDefaultOutput();
  outputPathEl.textContent = outputDir;
})();

// ── Drag & Drop ───────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const dropped = Array.from(e.dataTransfer.files)
    .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
    .map((f) => f.path);
  if (dropped.length) addFiles(dropped);
});

// ── Buttons ───────────────────────────────────────────────────────────────
document.getElementById('pick-files-btn').addEventListener('click', async () => {
  const paths = await window.api.openFiles();
  if (paths.length) addFiles(paths);
});

document.getElementById('pick-folder-btn').addEventListener('click', async () => {
  const paths = await window.api.openFolder();
  if (paths && paths.length) addFiles(paths);
});

document.getElementById('change-output-btn').addEventListener('click', async () => {
  const dir = await window.api.saveFolder();
  if (dir) {
    outputDir = dir;
    outputPathEl.textContent = dir;
  }
});

clearBtn.addEventListener('click', () => {
  files = [];
  renderList();
  setStatus('Ready');
  convertBtn.disabled = true;
  clearBtn.style.display = 'none';
  openOutputBtn.style.display = 'none';
  progressWrap.style.display = 'none';
  progressBar.style.width = '0%';
});

openOutputBtn.addEventListener('click', () => {
  window.api.openOutputFolder(outputDir);
});

convertBtn.addEventListener('click', async () => {
  if (converting || !files.length) return;
  converting = true;
  convertBtn.disabled = true;
  clearBtn.style.display = 'none';
  progressWrap.style.display = 'block';
  progressBar.style.width = '0%';

  // reset statuses
  files.forEach((f) => (f.status = 'pending'));
  renderList();

  let doneCount = 0;

  window.api.removeProgressListener();
  window.api.onProgress(({ file, done, total, ok }) => {
    doneCount = done;
    const pct = Math.round((done / total) * 100);
    progressBar.style.width = `${pct}%`;
    setStatus(`Converting… ${done} / ${total}`);

    const entry = files.find((f) => f.name === file);
    if (entry) entry.status = ok ? 'ok' : 'error';
    renderList();
  });

  const results = await window.api.convertPdfs({ files: files.map((f) => f.path), outputDir });

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;

  converting = false;
  convertBtn.disabled = false;
  clearBtn.style.display = 'inline-block';
  openOutputBtn.style.display = 'inline-block';
  progressBar.style.width = '100%';

  if (fail === 0) {
    setStatus(`Done — ${ok} file${ok !== 1 ? 's' : ''} converted successfully.`);
  } else {
    setStatus(`Done — ${ok} OK, ${fail} failed.`);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────
function addFiles(paths) {
  const existing = new Set(files.map((f) => f.path));
  const newEntries = paths
    .filter((p) => !existing.has(p))
    .map((p) => ({
      path: p,
      name: p.split(/[\\/]/).pop(),
      status: 'pending',
    }));
  files.push(...newEntries);
  renderList();
  convertBtn.disabled = files.length === 0;
  clearBtn.style.display = files.length ? 'inline-block' : 'none';
  setStatus(`${files.length} file${files.length !== 1 ? 's' : ''} queued`);
}

function renderList() {
  fileCount.textContent = files.length;

  if (!files.length) {
    fileList.innerHTML = '';
    fileList.appendChild(emptyState);
    return;
  }

  fileList.innerHTML = files
    .map(
      (f) => `
    <div class="file-item">
      <span class="file-icon">📄</span>
      <span class="file-name" title="${f.path}">${f.name}</span>
      <span class="file-status status-${f.status}">${statusLabel(f.status)}</span>
    </div>`
    )
    .join('');
}

function statusLabel(s) {
  return { pending: 'Pending', converting: 'Converting…', ok: 'Done ✓', error: 'Failed ✗' }[s] || s;
}

function setStatus(msg) {
  statusMsg.textContent = msg;
}
