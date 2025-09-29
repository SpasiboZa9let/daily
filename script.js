let notes = JSON.parse(localStorage.getItem("dailyNotes")) || []

const app = document.getElementById('app')
const createBtn = document.getElementById('createNoteBtn')

// элементы модалки
const modal = document.getElementById('modal')
const form = document.getElementById('noteForm')
const cancelBtn = document.getElementById('cancelBtn')
const titleInput = document.getElementById('noteTitle')
const topicInput = document.getElementById('noteTopic')
const textInput = document.getElementById('noteText')
const fileInput = document.getElementById('noteFile')

// рендер карточек
function renderNotes() {
  app.innerHTML = `
    <div class="card-grid">
      ${notes.map((note) => `
        <div class="card">
          <div class="card__header">${note.topic || "Без темы"}</div>
          <div class="card__content">
            <h2 class="card__title">${note.title}</h2>
            <p class="card__description">${note.text}</p>
            ${note.file ? `<a href="${note.file}" target="_blank">📂 Открыть файл</a>` : ""}
          </div>
        </div>
      `).join('')}
    </div>
  `
}

// открыть модалку
createBtn.addEventListener("click", () => {
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
    saveNote(title, topic, text, null)
  }
  modal.classList.add("hidden")
})

function saveNote(title, topic, text, file) {
  notes.push({ title, topic, text, file })
  localStorage.setItem("dailyNotes", JSON.stringify(notes))
  renderNotes()
}

// первый запуск
renderNotes()
