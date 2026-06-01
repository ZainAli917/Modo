function updateClock(){
  const n=new Date;
  document.getElementById('clock').textContent=n.toLocaleTimeString();
  document.getElementById('date').textContent=n.toDateString()
}
updateClock();setInterval(updateClock,1000);

const todoForm=document.getElementById('todo-form'),
      todoInput=document.getElementById('todo-input'),
      todoList=document.getElementById('todo-list');

function loadTodos(){
  const t=JSON.parse(localStorage.getItem('todos')||'[]');
  todoList.innerHTML='';
  t.forEach((o,i)=>{
    const li=document.createElement('li');
    li.className=o.done?'completed':'';
    li.innerHTML=`
      <input type="checkbox" ${o.done?'checked':''} data-index="${i}">
      <span>${escapeHtml(o.text)}</span>
      <button data-index="${i}" class="del" style="margin-left:auto;background:#f44336;padding:.2rem .5rem;font-size:.8rem;">X</button>
    `;
    todoList.appendChild(li)
  });
  todoList.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',toggleTodo));
  todoList.querySelectorAll('.del').forEach(b=>b.addEventListener('click',deleteTodo))
}
function saveTodos(a){localStorage.setItem('todos',JSON.stringify(a));loadTodos()}
function getTodos(){return JSON.parse(localStorage.getItem('todos')||'[]')}
todoForm.addEventListener('submit',e=>{
  e.preventDefault();
  const txt=todoInput.value.trim();
  if(!txt)return;
  const t=getTodos();t.push({text:txt,done:!1});saveTodos(t);todoInput.value=''
});
function toggleTodo(e){const i=e.target.dataset.index,t=getTodos();t[i].done=e.target.checked;saveTodos(t)}
function deleteTodo(e){const i=e.target.dataset.index,t=getTodos();t.splice(i,1);saveTodos(t)}
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
loadTodos();

const notesArea=document.getElementById('notes-area');
notesArea.value=localStorage.getItem('notes')||'';
notesArea.addEventListener('input',()=>localStorage.setItem('notes',notesArea.value));