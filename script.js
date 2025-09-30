let notes = JSON.parse(localStorage.getItem("dailyNotes")) || []
let editIndex = null, query = '', lastDeleted=null, undoTimer=null

// DOM
const app = document.getElementById('app')
const createBtn = document.getElementById('createNoteBtn')
const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modalTitle')
const form = document.getElementById('noteForm')
const cancelBtn = document.getElementById('cancelBtn')
const titleInput = document.getElementById('noteTitle')
const topicInput = document.getElementById('noteTopic')
const textInput = document.getElementById('noteText')
const fileInput = document.getElementById('noteFile')
const viewModal = document.getElementById('viewModal')
const viewTitle = document.getElementById('viewTitle')
const viewTopic = document.getElementById('viewTopic')
const viewText = document.getElementById('viewText')
const viewFile = document.getElementById('viewFile')
const closeViewBtn = document.getElementById('closeViewBtn')
const searchInput = document.getElementById('searchInput')
const exportBtn = document.getElementById('exportBtn')
const importBtn = document.getElementById('importBtn')
const importInput = document.getElementById('importInput')
const toast = document.getElementById('toast')
const undoLink = document.getElementById('undoLink')
const densityBtn = document.getElementById('densityBtn')

// ================== РЕНДЕР ==================
function renderNotes() {
  const filtered = notes.filter(n =>
    (n.title||'').toLowerCase().includes(query) ||
    (n.topic||'').toLowerCase().includes(query) ||
    (n.text||'').toLowerCase().includes(query)
  )
  app.innerHTML = `
    <div class="card-grid">
      ${filtered.map((n,i)=>`
        <div class="card" data-index="${i}">
          <div class="card__actions">
            <button onclick="editNote(${i})">✏️</button>
            <button onclick="deleteNote(${i})">❌</button>
          </div>
          <div class="card__header">${n.topic||"Без темы"}</div>
          <div class="card__content">
            <h2 class="card__title">${n.title}</h2>
            <p class="card__description">${n.text.slice(0,80)}${n.text.length>80?"...":""}</p>
          </div>
        </div>
      `).join('')}
    </div>`
  document.querySelectorAll(".card").forEach(card=>{
    card.addEventListener("click",e=>{
      if(e.target.tagName==="BUTTON")return
      openView(card.dataset.index)
    })
  })
}

// ================== СОЗДАНИЕ / СОХРАНЕНИЕ ==================
createBtn.onclick=()=>{
  editIndex=null
  modalTitle.textContent="Новая запись"
  modal.classList.remove("hidden")
  form.reset()
}
cancelBtn.onclick=()=> modal.classList.add("hidden")

form.onsubmit=(e)=>{
  e.preventDefault()
  const title=titleInput.value.trim(), topic=topicInput.value.trim(), text=textInput.value.trim()
  const files=fileInput.files
  if(files.length>0){
    const promises=[...files].map(f=>new Promise(res=>{
      const r=new FileReader()
      r.onload=()=>res({name:f.name,data:r.result})
      r.readAsDataURL(f)
    }))
    Promise.all(promises).then(results=>{
      saveNote(title,topic,text,results)
      modal.classList.add("hidden")
    })
  } else {
    saveNote(title,topic,text,editIndex!==null?notes[editIndex].files:[])
    modal.classList.add("hidden")
  }
}
function saveNote(title,topic,text,files){
  const newNote={title,topic,text,files}
  if(editIndex!==null){ notes[editIndex]=newNote; editIndex=null } else notes.push(newNote)
  localStorage.setItem("dailyNotes",JSON.stringify(notes))
  renderNotes()
}

// ================== РЕДАКТИРОВАНИЕ ==================
window.editNote=i=>{
  editIndex=i
  const n=notes[i]
  modalTitle.textContent="Редактировать запись"
  titleInput.value=n.title; topicInput.value=n.topic; textInput.value=n.text
  modal.classList.remove("hidden")
}

// ================== УДАЛЕНИЕ + UNDO ==================
window.deleteNote=i=>{
  const removed=notes.splice(i,1)[0]
  lastDeleted={removed,index:i}
  localStorage.setItem("dailyNotes",JSON.stringify(notes))
  renderNotes(); showToast()
}
function showToast(){
  toast.classList.remove('hidden')
  clearTimeout(undoTimer)
  undoTimer=setTimeout(()=>toast.classList.add('hidden'),5000)
}
undoLink.onclick=()=>{
  if(!lastDeleted)return
  notes.splice(lastDeleted.index,0,lastDeleted.removed)
  localStorage.setItem("dailyNotes",JSON.stringify(notes))
  lastDeleted=null; toast.classList.add('hidden'); renderNotes()
}

// ================== ПРОСМОТР ==================
function base64ToArrayBuffer(b64){
  const bin=atob(b64.split(',')[1]); const len=bin.length; const bytes=new Uint8Array(len)
  for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i)
  return bytes.buffer
}
function renderFilePreview(f){
  const {name,data}=f
  if(data.startsWith('data:image'))
    return `<div><p>📷 ${name}</p><img src="${data}" alt="${name}"></div>`
  if(data.startsWith('data:application/pdf'))
    return `<div><p>📄 ${name}</p><embed src="${data}" type="application/pdf" width="100%" height="300"></div>`
  if(data.startsWith('data:text')){
    const text=atob(data.split(',')[1]).slice(0,300)
    return `<div><p>📄 ${name}</p><pre>${text}</pre></div>`
  }
  if(data.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')){
    mammoth.extractRawText({arrayBuffer:base64ToArrayBuffer(data)})
      .then(r=>{
        document.querySelectorAll('#viewFile pre.loading').forEach(el=>{
          if(el.dataset.file===name)el.outerHTML=`<pre>${r.value}</pre>`
        })
      })
    return `<div><p>📄 ${name}</p><pre class="loading" data-file="${name}">Загружаю Word...</pre></div>`
  }
  return `<div><p>📎 ${name}</p><a href="${data}" download="${name}">📂 Скачать</a></div>`
}
function openView(i){
  const n=notes[i]
  viewTitle.textContent=n.title
  viewTopic.textContent=n.topic?"Тема: "+n.topic:""
  viewText.innerHTML=window.marked?marked.parse(n.text||''):(n.text||'')

  // если есть хотя бы одно изображение → включаем карусель
  const hasImage = (n.files||[]).some(f=>f.data.startsWith('data:image'))
  viewFile.className = hasImage ? "carousel" : ""
  viewFile.innerHTML=(n.files||[]).map(renderFilePreview).join("")
  viewModal.classList.remove("hidden")
}
closeViewBtn.onclick=()=>viewModal.classList.add("hidden")

// ================== ПОИСК / ЭКСПОРТ / ИМПОРТ ==================
searchInput.oninput=()=>{ query=searchInput.value.toLowerCase(); renderNotes() }
exportBtn.onclick=()=>{
  const blob=new Blob([JSON.stringify(notes)],{type:'application/json'})
  const url=URL.createObjectURL(blob); const a=document.createElement('a')
  a.href=url;a.download='daily-notes.json';a.click();URL.revokeObjectURL(url)
}
importBtn.onclick=()=>importInput.click()
importInput.onchange=e=>{
  const f=e.target.files[0]; if(!f)return
  const r=new FileReader()
  r.onload=()=>{ notes=JSON.parse(r.result); localStorage.setItem("dailyNotes",JSON.stringify(notes)); renderNotes() }
  r.readAsText(f)
}

// ================== ПЛОТНОСТЬ / КЛАВИАТУРА ==================
densityBtn.onclick=()=>{
  document.body.classList.toggle('compact')
  densityBtn.textContent=document.body.classList.contains('compact')?'Удобочитаемо':'Компактно'
}
document.addEventListener('keydown',e=>{
  if(e.key==='n'&&modal.classList.contains('hidden')&&viewModal.classList.contains('hidden')){e.preventDefault();createBtn.click()}
  if(e.key==='/'&&document.activeElement!==searchInput){e.preventDefault();searchInput.focus()}
  if(e.key==='Escape'){modal.classList.add('hidden');viewModal.classList.add('hidden');toast.classList.add('hidden')}
})

// ================== DRAG & DROP ==================
window.addEventListener('dragover',e=>e.preventDefault())
window.addEventListener('drop',e=>{
  e.preventDefault()
  const f=e.dataTransfer.files?.[0]; if(!f)return
  editIndex=null; modalTitle.textContent="Новая запись"; modal.classList.remove("hidden"); form.reset()
  const dt=new DataTransfer();dt.items.add(f);fileInput.files=dt.files
  titleInput.value ||= f.name
})

// ================== СТАРТ ==================
renderNotes()
