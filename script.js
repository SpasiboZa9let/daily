let notes = JSON.parse(localStorage.getItem("dailyNotes")) || []
let editIndex = null

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

// рендер карточек
function renderNotes() {
  app.innerHTML = `
    <div class="card-grid">
      ${notes.map((note, i) => `
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

// открыть модалку создания
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

// редактирование
window.editNote = function(index) {
  editIndex = index
  const note = notes[index]
  modalTitle.textContent = "Редактировать запись"
  titleInput.value = note.title
  topicInput.value = note.topic
  textInput.value = note.text
  modal.classList.remove("hidden")
}

// удаление
window.deleteNote = function(index) {
  if (confirm("Удалить запись?")) {
    notes.splice(index, 1)
    localStorage.setItem("dailyNotes", JSON.stringify(notes))
    renderNotes()
  }
}

// просмотр
function openView(index) {
  const note = notes[index]
  viewTitle.textContent = note.title
  viewTopic.textContent = note.topic ? "Тема: " + note.topic : ""
  viewText.textContent = note.text
  viewFile.innerHTML = note.file ? `<a href="${note.file}" target="_blank">📂 Открыть файл</a>` : ""
  viewModal.classList.remove("hidden")
}
closeViewBtn.addEventListener("click", () => {
  viewModal.classList.add("hidden")
})

// первый запуск
renderNotes()
