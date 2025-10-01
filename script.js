let notes = JSON.parse(localStorage.getItem("dailyNotes")) || [];
let editIndex = null, query = '', lastDeleted = null, undoTimer = null;

// DOM
const app = document.getElementById('app');
const createBtn = document.getElementById('createNoteBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('noteForm');
const cancelBtn = document.getElementById('cancelBtn');
const titleInput = document.getElementById('noteTitle');
const topicInput = document.getElementById('noteTopic');
const textInput = document.getElementById('noteText');
const fileInput = document.getElementById('noteFile');

const viewModal = document.getElementById('viewModal');
const viewTitle = document.getElementById('viewTitle');
const viewTopic = document.getElementById('viewTopic');
const viewFiles = document.getElementById('viewFiles');
const viewText = document.getElementById('viewText');
const closeViewBtn = document.getElementById('closeViewBtn');

const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const toast = document.getElementById('toast');
const undoLink = document.getElementById('undoLink');
const densityBtn = document.getElementById('densityBtn');

/* ===== тема → иконка/цвет ===== */
function getTopicMeta(topic = "") {
  const t = (topic || "").toLowerCase();
  const table = [
    { keys: ['работ','work'], emoji: '🛠', hue: 265 },
    { keys: ['лич','personal'], emoji: '🏷️', hue: 200 },
    { keys: ['иде','idea'], emoji: '💡', hue: 45 },
    { keys: ['учеб','учёб','study','school'], emoji: '🎓', hue: 160 },
    { keys: ['фин','бюдж','money'], emoji: '💰', hue: 110 },
    { keys: ['путеш','trip','travel'], emoji: '✈️', hue: 15 },
    { keys: ['арт','рис','design','art'], emoji: '🎨', hue: 300 },
    { keys: ['здоров','спорт','health'], emoji: '❤️', hue: 350 },
    { keys: ['встреч','мит','meet'], emoji: '📅', hue: 210 },
    { keys: ['покуп','shop'], emoji: '🛒', hue: 20 },
  ];
  for (const row of table) if (row.keys.some(k => t.includes(k)))
    return { emoji: row.emoji, color: `hsl(${row.hue},70%,55%)` };
  const hue = [...t].reduce((a,c)=>(a + c.charCodeAt(0)) % 360, 265);
  return { emoji: '🗒️', color: `hsl(${hue},70%,55%)` };
}

function base64ToArrayBuffer(b64){
  const bin = atob(b64.split(',')[1]);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for(let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* ===== РЕНДЕР КАРТОЧЕК ===== */
function renderNotes() {
  const filtered = notes
    .map((n, idx) => ({ n, idx }))
    .filter(({n}) =>
      (n.title||'').toLowerCase().includes(query) ||
      (n.topic||'').toLowerCase().includes(query) ||
      (n.text ||'').toLowerCase().includes(query)
    );

  app.innerHTML = `
    <div class="card-grid">
      ${filtered.map(({n, idx}) => {
        const meta = getTopicMeta(n.topic);

        // превью файлов (до 3 шт.)
        let filePreview = "";
        if (n.files && n.files.length > 0) {
          const previews = n.files.slice(0,3).map((f,j)=>{
            if(f.data.startsWith('data:image')){
              return `<img src="${f.data}" alt="${f.name}" data-idx="${idx}" data-f="${j}" />`;
            }
            return `<div class="file-icon" data-idx="${idx}" data-f="${j}">📎 ${f.name.split('.').pop()}</div>`;
          }).join("");
          const more = n.files.length>3 ? `<span class="more">+${n.files.length-3}</span>` : "";
          filePreview = `<div class="card__files">${previews}${more}</div>`;
        }

        return `
          <div class="card card--accent" data-index="${idx}" style="--accent:${meta.color}">
            <div class="card__actions">
              <button onclick="editNote(${idx});event.stopPropagation()">✏️</button>
              <button onclick="deleteNote(${idx});event.stopPropagation()">❌</button>
            </div>
            <div class="card__header">
              <span class="topic-badge" style="--accent:${meta.color}">${meta.emoji} ${n.topic||"Без темы"}</span>
            </div>
            <div class="card__content">
              <h2 class="card__title">${n.title}</h2>
              <p class="card__description">${n.text.slice(0,80)}${n.text.length>80?"...":""}</p>
              ${filePreview}
            </div>
          </div>
        `;
      }).join('')}
    </div>`;

  // клик по карточке (не по файлам/кнопкам)
  document.querySelectorAll(".card").forEach(card=>{
    card.addEventListener("click", e=>{
      if (e.target.tagName==="BUTTON" || e.target.closest(".card__files")) return;
      openView(card.dataset.index);
    });
  });
  // клик по мини-превью файла
  document.querySelectorAll(".card__files img, .card__files .file-icon").forEach(el=>{
    el.addEventListener("click", e=>{
      e.stopPropagation();
      openView(el.dataset.idx);
    });
  });
}

/* ===== СОЗДАНИЕ / РЕДАКТИРОВАНИЕ ===== */
createBtn.onclick = () => {
  editIndex = null;
  modalTitle.textContent = "Новая запись";
  form.reset();
  modal.classList.remove("hidden");
};
cancelBtn.onclick = () => modal.classList.add("hidden");

form.addEventListener("submit", e=>{
  e.preventDefault();
  const title = titleInput.value.trim();
  const topic = topicInput.value.trim();
  const text  = textInput.value.trim();
  const files = fileInput.files;

  // читаем выбранные файлы, иначе берём прежние при редактировании
  if (files.length > 0) {
    const promises = [...files].map(f => new Promise(res=>{
      const r = new FileReader();
      r.onload = () => res({ name:f.name, data:r.result, type:f.type });
      r.readAsDataURL(f);
    }));
    Promise.all(promises).then(results=>{
      saveNote(title, topic, text, results);
    });
  } else {
    const prev = editIndex!==null ? (notes[editIndex].files||[]) : [];
    saveNote(title, topic, text, prev);
  }
});

function saveNote(title, topic, text, files){
  const newNote = { title, topic, text, files };
  if (editIndex !== null) { notes[editIndex] = newNote; editIndex = null; }
  else { notes.push(newNote); }
  localStorage.setItem("dailyNotes", JSON.stringify(notes));
  modal.classList.add("hidden");
  renderNotes();
}

window.editNote = i => {
  editIndex = i;
  const n = notes[i];
  modalTitle.textContent = "Редактировать запись";
  titleInput.value = n.title || "";
  topicInput.value = n.topic || "";
  textInput.value  = n.text  || "";
  fileInput.value = ""; // сбрасываем выбор
  modal.classList.remove("hidden");
};

/* ===== УДАЛЕНИЕ + UNDO ===== */
window.deleteNote = i => {
  const removed = notes.splice(i,1)[0];
  lastDeleted = { removed, index: i };
  localStorage.setItem("dailyNotes", JSON.stringify(notes));
  renderNotes();
  showToast();
};
function showToast(){
  toast.classList.remove('hidden');
  clearTimeout(undoTimer);
  undoTimer = setTimeout(()=> toast.classList.add('hidden'), 5000);
}
undoLink.onclick = () => {
  if(!lastDeleted) return;
  notes.splice(lastDeleted.index, 0, lastDeleted.removed);
  localStorage.setItem("dailyNotes", JSON.stringify(notes));
  lastDeleted = null;
  toast.classList.add('hidden');
  renderNotes();
};

/* ===== ПРОСМОТР: сначала файлы, потом текст ===== */
function renderFilePreview(f){
  const { name, data } = f;

  // изображения
  if (data.startsWith('data:image')) {
    return `<div><p>📷 ${name}</p><img src="${data}" alt="${name}"></div>`;
  }

  // PDF
  if (data.startsWith('data:application/pdf')) {
    return `<div><p>📄 ${name}</p><embed src="${data}" type="application/pdf" width="100%" height="300"></div>`;
  }

  // текстовые (txt, csv и т.п.)
  if (data.startsWith('data:text')) {
    const text = atob(data.split(',')[1]).slice(0, 1000);
    return `<div><p>📄 ${name}</p><pre>${text}</pre></div>`;
  }

  // Word (docx) — извлекаем текст
  if (data.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    mammoth.extractRawText({ arrayBuffer: base64ToArrayBuffer(data) })
      .then(result => {
        const el = document.querySelector(`#viewFiles pre.loading[data-file="${CSS.escape(name)}"]`);
        if (el) el.outerHTML = `<pre>${result.value}</pre>`;
      })
      .catch(()=>{});
    return `<div><p>📄 ${name}</p><pre class="loading" data-file="${name}">Загружаю Word...</pre>
            <a href="${data}" download="${name}">⬇ Скачать DOCX</a></div>`;
  }

  // Excel (xlsx) — первые строки первой вкладки
  if (data.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    try {
      const wb = XLSX.read(base64ToArrayBuffer(data), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json  = XLSX.utils.sheet_to_json(sheet, { header:1, raw:false });
      const preview = json.slice(0,8)
        .map(row => "<tr>" + row.map(c => `<td>${c ?? ""}</td>`).join("") + "</tr>")
        .join("");
      return `<div><p>📊 ${name}</p><table><tbody>${preview}</tbody></table>
              <a href="${data}" download="${name}">⬇ Скачать XLSX</a></div>`;
    } catch(e) {
      return `<div><p>📊 ${name}</p><a href="${data}" download="${name}">⬇ Скачать XLSX</a></div>`;
    }
  }

  // PowerPoint — пока только скачивание
  if (data.startsWith('data:application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
    return `<div><p>📽 ${name}</p><a href="${data}" download="${name}">⬇ Скачать PPTX</a></div>`;
  }

  // Аудио
  if (name.match(/\.(mp3|wav|ogg)$/i)) {
    return `<div><p>🎵 ${name}</p><audio controls src="${data}"></audio></div>`;
  }

  // Видео
  if (name.match(/\.(mp4|webm|ogg)$/i)) {
    return `<div><p>🎥 ${name}</p><video controls src="${data}"></video></div>`;
  }

  // fallback
  return `<div><p>📎 ${name}</p><a href="${data}" download="${name}">⬇ Скачать</a></div>`;
}

function openView(i){
  const n = notes[i];
  const meta = getTopicMeta(n.topic);

  viewTitle.textContent = n.title;
  viewTopic.textContent = n.topic ? `${meta.emoji} Тема: ${n.topic}` : "";

  // файлы — первыми
  if (n.files && n.files.length) {
    const hasImg = n.files.some(f => f.data.startsWith('data:image'));
    const list = n.files.map(renderFilePreview).join("");
    viewFiles.innerHTML = hasImg ? `<div class="carousel">${list}</div>` : list;
  } else {
    viewFiles.innerHTML = `<div>Нет вложений</div>`;
  }

  // затем текст
  viewText.innerHTML = window.marked ? marked.parse(n.text || '') : (n.text || '');

  viewModal.classList.remove("hidden");
}
closeViewBtn.onclick = () => viewModal.classList.add("hidden");

/* ===== Поиск / Экспорт / Импорт ===== */
searchInput.oninput = () => { query = searchInput.value.toLowerCase(); renderNotes(); };

exportBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(notes)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'daily-notes.json'; a.click();
  URL.revokeObjectURL(url);
};

importBtn.onclick = () => importInput.click();
importInput.onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      notes = JSON.parse(r.result);
      localStorage.setItem("dailyNotes", JSON.stringify(notes));
      renderNotes();
    } catch {
      alert("Некорректный JSON");
    }
  };
  r.readAsText(f);
};

/* ===== Плотность / Клавиши / DnD ===== */
densityBtn.onclick = () => {
  document.body.classList.toggle('compact');
  densityBtn.textContent = document.body.classList.contains('compact') ? 'Удобочитаемо' : 'Компактно';
};

document.addEventListener('keydown', e=>{
  if (e.key==='n' && modal.classList.contains('hidden') && viewModal.classList.contains('hidden')) {
    e.preventDefault(); createBtn.click();
  }
  if (e.key==='/' && document.activeElement!==searchInput) {
    e.preventDefault(); searchInput.focus();
  }
  if (e.key==='Escape') {
    modal.classList.add('hidden');
    viewModal.classList.add('hidden');
    toast.classList.add('hidden');
  }
});

window.addEventListener('dragover', e=> e.preventDefault());
window.addEventListener('drop', e=>{
  e.preventDefault();
  const f = e.dataTransfer.files?.[0]; if (!f) return;
  editIndex = null;
  modalTitle.textContent = "Новая запись";
  modal.classList.remove("hidden");
  form.reset();
  const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files;
  titleInput.value ||= f.name;
});

/* старт */
renderNotes();
