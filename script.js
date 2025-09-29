let notes = JSON.parse(localStorage.getItem("dailyNotes")) || []
let editIndex = null
let query = ''
let lastDeleted = null
let undoTimer = null

// DOM-элементы
const app = document.getElementById('app')
const createBtn = document.getElementById('createNoteBtn')

// форма
const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modalTitle')
const form = document.getElementById('noteForm')
const cancelBtn = document.getElementById('cancelBtn')
const titleInput = document.getElementById('noteTitle')
const topicInput = document.getElementById('noteTopic')
const textInput = document.getElementById('noteText')
const fileInput = document.getElementById('noteFile')

// просмотр
const viewModal = document.getElementById('viewModal')
const viewTitle = document.getElementById('viewTitle')
const viewTopic = document.getElementById('viewTopic')
const viewText = document.getElementById('viewText')
const viewFile = document.getElementById('viewFile')
const closeViewBtn = document.getElementById('closeViewBtn')

// поиск
const searchInput = document.getElementById('searchInput')

// экспорт/импорт
const exportBtn = document.getElementById('exportBtn')
const importBtn = document.getElementById('importBtn')
const importInput = document.getElementById('importInput')

// тост undo
const toast = document.getElementById('toast')
const undoLink = document.getElementById('undoLink')

// плотность
const densityBtn = document.getElementById('densityBtn')

// ======================= РЕНДЕР ==========================
function renderNotes() {
  const filtered = notes.filter(n =>
    (n.title || '').toLowerCase().includes(query) ||
    (n.topic || '').toLowerCase().includes(query) ||
    (n.text || '').toLowerCase().includes(query)
  )

  app.innerHTML = `
    <div class="card-grid">
      ${filtered.map((note, i) => `
        <div class="card" data-index="${i}">
          <div class="card__actions">
            <button onclick="editNote(${i})">✏️</button>
            <button onclick="deleteNote(${i})">❌</button>
          </div>
          <div class="card__header">${note.topic || "Без темы"}</div>
          <div class="card__content">
            <h2 class="card__title">${note.title}</h2>
            <p class="card__description">${note.text.slice(0, 80)}${note.text.length > 80 ? "..." : ""}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `

  // клики на карточки (открытие просмотра)
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return // не открывать, если клик по кнопке
      const idx = card.dataset.index
      openView(idx)
    })
  })
}

// ======================= СОЗДАНИЕ ==========================
createBtn.addEventListener("click", () => {
  editIndex = null
  modalTitle.textContent = "Новая запись"
  modal.classList.remove("hidden")
  form.reset()
})

// закрыть модалку
cancelBtn.addEventListener("click", () => {
  modal.classList.add("hidden")
})

// сохранить запись
form.addEventListener("submit", (e) => {
  e.preventDefault()
  const title = titleInput.value.trim()
  const topic = topicInput.value.trim()
  const text = textInput.value.trim()
  const file = fileInput.files[0]

  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      saveNote(title, topic, text, reader.result)
    }
    reader.readAsDataURL(file)
  } else {
    saveNote(title, topic, text, editIndex !== null ? notes[editIndex].file : null)
  }
  modal.classList.add("hidden")
})

function saveNote(title, topic, text, file) {
  const newNote = { title, topic, text, file }
  if (editIndex !== null) {
    notes[editIndex] = newNote
    editIndex = null
  } else {
    notes.push(newNote)
  }
  localStorage.setItem("dailyNotes", JSON.stringify(notes))
  renderNotes()
}

// ======================= РЕДАКТИРОВАНИЕ ==========================
window.editNote = function(index) {
  editIndex = index
  const note = notes[index]
  modalTitle.textContent = "Редактировать запись"
  titleInput.value = note.title
  topicInput.value = note.topic
  textInput.value = note.text
  modal.classList.remove("hidden")
}

// ======================= УДАЛЕНИЕ + UNDO ==========================
window.deleteNote = function(index) {
  const removed = notes.splice(index, 1)[0]
  lastDeleted = { removed, index }
  localStorage.setItem("dailyNotes", JSON.stringify(notes))
  renderNotes()
  showToast()
}

function showToast() {
  toast.classList.remove('hidden')
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => toast.classList.add('hidden'), 5000)
}

undoLink?.addEventListener('click', () => {
  if (!lastDeleted) return
  notes.splice(lastDeleted.index, 0, lastDeleted.removed)
  localStorage.setItem("dailyNotes", JSON.stringify(notes))
  lastDeleted = null
  toast.classList.add('hidden')
  renderNotes()
})

// ======================= ПРОСМОТР ==========================
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64.split(',')[1])
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)
  return bytes.buffer
}

function openView(index) {
  const note = notes[index]
  viewTitle.textContent = note.title
  viewTopic.textContent = note.topic ? "Тема: " + note.topic : ""
  viewText.innerHTML = window.marked ? marked.parse(note.text || '') : (note.text || '')

  if (note.file) {
    let preview = ''
    if (note.file.startsWith('data:image')) {
      preview = `<img src="${note.file}" alt="Превью">`
    } else if (note.file.startsWith('data:application/pdf')) {
      preview = `<embed src="${note.file}" type="application/pdf" width="100%" height="400px">`
    } else if (note.file.startsWith('data:text')) {
      const text = atob(note.file.split(',')[1]).slice(0, 500)
      preview = `<pre>${text}</pre>`
    } else if (note.file.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      // DOCX → mammoth
      mammoth.extractRawText({ arrayBuffer: base64ToArrayBuffer(note.file) })
        .then(result => {
          viewFile.innerHTML = `<pre>${result.value}</pre>`
        })
        .catch(() => {
          viewFile.innerHTML = `<a href="${note.file}" download="note.docx">📂 Скачать Word</a>`
        })
      preview = "Загружаю Word..."
    } else {
      preview = `<a href="${note.file}" target="_blank">📂 Открыть файл</a>`
    }
    viewFile.innerHTML = preview
  } else {
    viewFile.innerHTML = ""
  }

  viewModal.classList.remove("hidden")
}
closeViewBtn.addEventListener("click", () => {
  viewModal.classList.add("hidden")
})

// ======================= ПОИСК ==========================
searchInput?.addEventListener('input', () => {
  query = searchInput.value.toLowerCase()
  renderNotes()
})

// ======================= ЭКСПОРТ / ИМПОРТ ==========================
exportBtn?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(notes)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'daily-notes.json'
  a.click()
  URL.revokeObjectURL(url)
})

importBtn?.addEventListener('click', () => importInput.click())
importInput?.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return
  const r = new FileReader()
  r.onload = () => {
    try {
      notes = JSON.parse(r.result)
      localStorage.setItem("dailyNotes", JSON.stringify(notes))
      renderNotes()
    } catch {
      alert('Некорректный JSON')
    }
  }
  r.readAsText(file)
})

// ======================= ПЛОТНОСТЬ ==========================
densityBtn?.addEventListener('click', () => {
  document.body.classList.toggle('compact')
  densityBtn.textContent = document.body.classList.contains('compact') ? 'Удобочитаемо' : 'Компактно'
})

// ======================= КЛАВИАТУРА ==========================
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' && modal.classList.contains('hidden') && viewModal.classList.contains('hidden')) {
    e.preventDefault(); createBtn.click()
  }
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault(); searchInput?.focus()
  }
  if (e.key === 'Escape') {
    modal.classList.add("hidden")
    viewModal.classList.add("hidden")
    toast.classList.add("hidden")
  }
})

// ======================= DRAG & DROP ==========================
window.addEventListener('dragover', e => { e.preventDefault() })
window.addEventListener('drop', e => {
  e.preventDefault()
  const f = e.dataTransfer.files?.[0]
  if (!f) return
  editIndex = null
  modalTitle.textContent = "Новая запись"
  modal.classList.remove("hidden")
  form.reset()
  const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files
  titleInput.value ||= f.name
})

// ======================= СТАРТ ==========================
renderNotes()
