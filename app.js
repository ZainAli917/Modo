// ---------- CLOCK ----------
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString();
  document.getElementById('date').textContent = now.toDateString();
}
updateClock();
setInterval(updateClock, 1000);

// ---------- TODO ----------
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');

function loadTodos() {
  const todos = JSON.parse(localStorage.getItem('todos') || '[]');
  todoList.innerHTML = '';
  todos.forEach((todo, i) => {
    const li = document.createElement('li');
    li.className = todo.done ? 'completed' : '';
    li.innerHTML = `
      <input type="checkbox" ${todo.done ? 'checked' : ''} data-index="${i}" />
      <span>${escapeHtml(todo.text)}</span>
      <button data-index="${i}" class="delete-btn" style="margin-left:auto;background:#f44336;padding:0.2rem 0.5rem;font-size:0.8rem;">X</button>
    `;
    todoList.appendChild(li);
  });

  todoList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', toggleTodo);
  });
  todoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', deleteTodo);
  });
}

function saveTodos(todos) {
  localStorage.setItem('todos', JSON.stringify(todos));
  loadTodos();
}

function getTodos() {
  return JSON.parse(localStorage.getItem('todos') || '[]');
}

todoForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;
  const todos = getTodos();
  todos.push({ text, done: false });
  saveTodos(todos);
  todoInput.value = '';
});

function toggleTodo(e) {
  const index = e.target.dataset.index;
  const todos = getTodos();
  todos[index].done = e.target.checked;
  saveTodos(todos);
}

function deleteTodo(e) {
  const index = e.target.dataset.index;
  const todos = getTodos();
  todos.splice(index, 1);
  saveTodos(todos);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadTodos();

// ---------- NOTES ----------
const notesArea = document.getElementById('notes-area');
notesArea.value = localStorage.getItem('notes') || '';

notesArea.addEventListener('input', () => {
  localStorage.setItem('notes', notesArea.value);
});

// ---------- SERVICE WORKER REGISTRATION (V3 - cache bust & force update) ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js?v=3', { scope: '/' })
    .then(reg => {
      console.log('Service Worker registered with scope:', reg.scope);
      // If a waiting worker exists, tell it to skipWaiting immediately
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // When a new worker is found, also force activation
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      // Dummy background sync / periodic sync register
      reg.sync.register('modo-sync').catch(() => {});
      if ('periodicSync' in reg) {
        reg.periodicSync.register('modo-periodic', {
          minInterval: 24 * 60 * 60 * 1000
        }).catch(() => {});
      }
    })
    .catch(err => console.error('Service Worker registration failed:', err));
}