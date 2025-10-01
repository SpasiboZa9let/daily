let notes = JSON.parse(localStorage.getItem("dailyNotes")) || [];
let editIndex = null, query = '';

const app = document.getElementById('app');
const modal = document.getElementById('modal');
const viewModal = document.getElementById('viewModal');
const viewTitle = document.getElementById('viewTitle');
const viewTopic = document.getElementById('viewTopic');
const viewFiles = document.getElementById('viewFiles');
const viewText = document.getElementById('viewText');
const closeViewBtn = document.getElementById('closeViewBtn');
const createBtn = document.getElementById('createNoteBtn');
const form = document.getElementById('noteForm');
const cancelBtn = document.getElementById('cancelBtn');
const titleInput = document.getElementById('noteTitle');
const topicInput = document.getElementById('noteTopic');
const textInput = document.getElementById('noteText');
const fileInput = document.getElementById('noteFile');

function base64ToArrayBuffer(b64){
  const bin=atob(b64.split(',')[1]); const len=bin.length; const bytes=new Uint8Array(len);
  for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);
  return bytes.buffer;
}

/* файлы */
function renderFilePreview(f){
  const {name,data}=f;

  if(data.startsWith('data:image'))
    return `<div><p>📷 ${name}</p><img src="${data}" alt="${name}">`;

  if(/\.(docx|xlsx|pptx)$/i.test(name)){
    const blob = new Blob([base64ToArrayBuffer(data)], { type: f.type });
    const url = URL.createObjectURL(blob);
    return `<div><p>📂 ${name}</p>
      <a href="https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}" target="_blank">
        Открыть в Office Online
      </a></div>`;
  }

  if(data.startsWith('data:application/pdf'))
    return `<div><p>📄 ${name}</p><embed src="${data}" type="application/pdf" width="100%" height="300"></div>`;

  if(name.match(/\.(mp3|wav|ogg)$/i))
    return `<div><p>🎵 ${name}</p><audio controls src="${data}"></audio></div>`;

  if(name.match(/\.(mp4|webm|ogg)$/i))
    return `<div><p>🎥 ${name}</p><video controls src="${data}"></video></div>`;

  return `<div><p>📎 ${name}</p><a href="${data}" download="${name}">📂 Скачать</a></div>`;
}

/* просмотр */
function openView(i){
  const n = notes[i];
  viewTitle.textContent = n.title;
  viewTopic.textContent = n.topic ? `Тема: ${n.topic}` : "";

  if(n.files && n.files.length){
    const hasImg = n.files.some(f=>f.data.startsWith('data:image'));
    const previews = n.files.map(renderFilePreview).join("");
    viewFiles.innerHTML = hasImg ? `<div class="carousel">${previews}</div>` : previews;
  } else {
    viewFiles.innerHTML = "<p>Нет вложений</p>";
  }

  viewText.innerHTML = window.marked ? marked.parse(n.text||'') : (n.text||'');

  viewModal.classList.remove("hidden");
}
closeViewBtn.onclick=()=>viewModal.classList.add("hidden");

/* сохранение */
form.onsubmit=(e)=>{
  e.preventDefault();
  const newNote={
    title:titleInput.value,
    topic:topicInput.value,
    text:textInput.value,
    files:[]
  };
  const files=fileInput.files;
  if(files.length>0){
    const promises=[...files].map(f=>new Promise(res=>{
      const r=new FileReader(); r.onload=()=>res({name:f.name,data:r.result,type:f.type}); r.readAsDataURL(f);
    }));
    Promise.all(promises).then(results=>{
      newNote.files=results;
      save(newNote);
    });
  } else save(newNote);
};
function save(note){
  if(editIndex!==null){notes[editIndex]=note;editIndex=null;} else notes.push(note);
  localStorage.setItem("dailyNotes",JSON.stringify(notes));
  renderNotes();
  modal.classList.add("hidden");
}

createBtn.onclick=()=>{editIndex=null;form.reset();modal.classList.remove("hidden");};
cancelBtn.onclick=()=>modal.classList.add("hidden");

/* рендер */
function renderNotes(){
  app.innerHTML=`
    <div class="card-grid">
      ${notes.map((n,i)=>`
        <div class="card" onclick="openView(${i})">
          <div class="card__header">
            <span class="topic-badge">${n.topic||"Без темы"}</span>
          </div>
          <h2>${n.title}</h2>
          <p>${n.text.slice(0,80)}${n.text.length>80?"...":""}</p>
        </div>
      `).join("")}
    </div>`;
}
renderNotes();
