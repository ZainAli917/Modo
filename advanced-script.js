// ============ ADVANCED FEATURES MODULE ============
(function() {
  'use strict';

  // Feature flags – you can turn on/off anything
  const FEATURES = {
    themeToggle: true,
    voiceInput: true,
    categories: true,
    dueDates: true,
    dragDrop: true,
    search: true,
    richNotes: true,
    pomodoro: false,
    dailyQuote: true,
    notifications: true,
    shareTarget: true
  };

  // ====================
  // 1. THEME TOGGLE
  // ====================
  function initTheme() {
    const saved = localStorage.getItem('modo-theme');
    if (saved === 'light') document.body.classList.add('light-mode');
    if (!saved && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.body.classList.add('light-mode');
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'theme-toggle';
    toggleBtn.innerHTML = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
    toggleBtn.title = 'Toggle light/dark mode';
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('modo-theme', isLight ? 'light' : 'dark');
      toggleBtn.innerHTML = isLight ? '☀️' : '🌙';
    });
  }

  // ====================
  // 2. CATEGORIES & TAGS
  // ====================
  function parseTask(text) {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) tags.push(match[1]);
    const cleanText = text.replace(tagRegex, '').trim();
    return { text: cleanText, tags };
  }

  // Enhanced addTodo
  window.addTodo = function() {
    const input = document.getElementById('todo-input');
    const raw = input.value.trim();
    if (!raw) return;
    const { text, tags } = FEATURES.categories ? parseTask(raw) : { text: raw, tags: [] };
    const dueDate = document.getElementById('todo-due')?.value || null;
    todos.unshift({ text, tags, dueDate, done: false, created: Date.now() });
    saveTodos();
    renderTodos();
    input.value = '';
    input.focus();
    if (FEATURES.notifications && dueDate) scheduleNotification(text, dueDate);
  };

  // ====================
  // 3. ENHANCED RENDER
  // ====================
  window.renderTodos = function() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    if (todos.length === 0) {
      list.innerHTML = `<div class="empty">
        <div class="empty-icon">✨</div>
        <p>No tasks yet. Try “Buy milk #errands”</p>
      </div>`;
      return;
    }
    list.innerHTML = todos.map((t, i) => {
      let dueHTML = '';
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const now = new Date();
        const diff = due - now;
        const days = Math.ceil(diff / (1000*60*60*24));
        let label = '';
        if (days < 0) label = 'Overdue';
        else if (days === 0) label = 'Today';
        else if (days === 1) label = 'Tomorrow';
        else label = `${days}d left`;
        const overdueClass = days < 0 ? 'overdue' : '';
        dueHTML = `<span class="due-badge ${overdueClass}">📅 ${label}</span>`;
      }
      const tagsHTML = (t.tags||[]).map(tag => `<span class="tag">#${tag}</span>`).join('');
      return `
        <div class="todo-item ${t.done ? 'done' : ''}" draggable="true" data-index="${i}">
          <div class="swipe-action swipe-right">✓</div>
          <div class="swipe-action swipe-left">✕</div>
          <div class="todo-check" onclick="toggleTodo(${i})"></div>
          <span class="todo-text">${escHtml(t.text)}${tagsHTML}${dueHTML}</span>
          <button class="todo-del" onclick="deleteTodo(${i})">×</button>
        </div>`;
    }).join('');
    if (FEATURES.dragDrop) initDragDrop();
    initSwipe();
  };

  // Helper escHtml (ensure it exists)
  window.escHtml = window.escHtml || function(s) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  };

  // ====================
  // 4. DUE DATE INPUT
  // ====================
  if (FEATURES.dueDates) {
    const row = document.querySelector('.input-row');
    if (row && !document.getElementById('todo-due')) {
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.id = 'todo-due';
      dateInput.style.cssText = 'width:130px; margin-left:8px;';
      row.appendChild(dateInput);
    }
  }

  // ====================
  // 5. DRAG & DROP
  // ====================
  function initDragDrop() {
    document.querySelectorAll('.todo-item').forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  }

  let dragSrcIndex;
  function handleDragStart(e) {
    dragSrcIndex = +this.dataset.index;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
  }
  function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const targetIndex = +this.dataset.index;
    if (dragSrcIndex !== targetIndex && !isNaN(targetIndex)) {
      const moved = todos.splice(dragSrcIndex, 1)[0];
      todos.splice(targetIndex, 0, moved);
      saveTodos();
      renderTodos();
    }
  }
  function handleDragEnd() {
    this.classList.remove('dragging');
  }

  // ====================
  // 6. SWIPE GESTURES
  // ====================
  function initSwipe() {
    document.querySelectorAll('.todo-item').forEach(item => {
      let startX = 0;
      item.addEventListener('touchstart', e => startX = e.touches[0].clientX);
      item.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 80) {
          const index = +item.dataset.index;
          if (diff > 0) deleteTodo(index);   // swipe left -> delete
          else toggleTodo(index);             // swipe right -> complete
        }
      });
    });
  }

  // ====================
  // 7. VOICE INPUT
  // ====================
  if (FEATURES.voiceInput && 'webkitSpeechRecognition' in window) {
    const row = document.querySelector('.input-row');
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'btn';
    voiceBtn.innerHTML = '🎤';
    voiceBtn.title = 'Add task by voice';
    voiceBtn.style.marginLeft = '8px';
    row.appendChild(voiceBtn);
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    voiceBtn.addEventListener('click', () => recognition.start());
    recognition.onresult = (event) => {
      document.getElementById('todo-input').value = event.results[0][0].transcript;
      window.addTodo();
    };
  }

  // ====================
  // 8. RICH NOTES (replace textarea with contenteditable)
  // ====================
  if (FEATURES.richNotes) {
    const notesArea = document.getElementById('notes-area');
    if (notesArea) {
      const editableDiv = document.createElement('div');
      editableDiv.id = 'notes-editor';
      editableDiv.contentEditable = true;
      editableDiv.style.cssText = notesArea.style.cssText + ' min-height:160px; white-space: pre-wrap; outline: none;';
      editableDiv.innerHTML = localStorage.getItem('modo-notes') || '';
      notesArea.parentNode.replaceChild(editableDiv, notesArea);

      // Toolbar
      const toolbar = document.createElement('div');
      toolbar.id = 'notes-toolbar';
      toolbar.innerHTML = `
        <button data-cmd="bold"><b>B</b></button>
        <button data-cmd="italic"><i>I</i></button>
        <button data-cmd="insertUnorderedList">• List</button>
      `;
      editableDiv.parentNode.insertBefore(toolbar, editableDiv.nextSibling);

      toolbar.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
          document.execCommand(e.target.dataset.cmd, false, null);
          editableDiv.focus();
        }
      });

      // Auto-save
      editableDiv.addEventListener('input', () => {
        localStorage.setItem('modo-notes', editableDiv.innerHTML);
        const savedSpan = document.getElementById('notes-saved');
        if (savedSpan) {
          savedSpan.classList.add('show');
          setTimeout(() => savedSpan.classList.remove('show'), 2000);
        }
        const charSpan = document.getElementById('char-count');
        if (charSpan) {
          const text = editableDiv.innerText || '';
          charSpan.textContent = text.length + ' chars';
        }
      });
    }
  }

  // ====================
  // 9. GLOBAL SEARCH
  // ====================
  if (FEATURES.search) {
    const searchInput = document.createElement('input');
    searchInput.id = 'search-bar';
    searchInput.placeholder = 'Search tasks & notes...';
    const main = document.querySelector('main');
    main.insertBefore(searchInput, main.firstChild);
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('.todo-item').forEach(item => {
        const text = item.querySelector('.todo-text')?.innerText.toLowerCase() || '';
        item.style.display = text.includes(term) ? '' : 'none';
      });
      const editor = document.getElementById('notes-editor');
      if (editor && term) {
        // simple highlight (reset first)
        const html = editor.innerHTML.replace(/<mark>/g,'').replace(/<\/mark>/g,'');
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        editor.innerHTML = html.replace(regex, '<mark>$1</mark>');
      } else if (editor) {
        editor.innerHTML = editor.innerText; // reset
      }
    });
  }

  // ====================
  // 10. POMODORO (optional)
  // ====================
  if (FEATURES.pomodoro) {
    const fab = document.createElement('button');
    fab.innerHTML = '⏱️';
    fab.style.cssText = 'position:fixed;bottom:20px;right:20px;width:48px;height:48px;border-radius:50%;background:var(--accent);color:white;border:none;font-size:24px;cursor:pointer;z-index:300;';
    document.body.appendChild(fab);
    let timerInterval, seconds = 25*60, running = false;
    const panel = document.createElement('div');
    panel.id = 'pomodoro-panel';
    panel.style.display = 'none';
    panel.innerHTML = `<span id="timer-display">25:00</span>
      <button id="timer-start">▶</button>
      <button id="timer-reset">↺</button>`;
    document.body.appendChild(panel);
    fab.addEventListener('click', () => panel.style.display = 'flex');
    document.getElementById('timer-start').addEventListener('click', () => {
      if (running) { clearInterval(timerInterval); running = false; return; }
      running = true;
      timerInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) { clearInterval(timerInterval); running = false; seconds = 0; }
        const m = Math.floor(seconds/60).toString().padStart(2,'0');
        const s = (seconds%60).toString().padStart(2,'0');
        document.getElementById('timer-display').textContent = `${m}:${s}`;
      }, 1000);
    });
    document.getElementById('timer-reset').addEventListener('click', () => {
      clearInterval(timerInterval);
      running = false;
      seconds = 25*60;
      document.getElementById('timer-display').textContent = '25:00';
    });
  }

  // ====================
  // 11. DAILY QUOTE
  // ====================
  if (FEATURES.dailyQuote) {
    fetch('https://api.quotable.io/random?tags=productivity')
      .then(r => r.json())
      .then(data => {
        const quoteBox = document.createElement('div');
        quoteBox.style.cssText = 'text-align:center;margin:16px 0;font-style:italic;color:var(--text-muted);font-size:14px;';
        quoteBox.innerHTML = `"${data.content}" — ${data.author}`;
        const main = document.querySelector('main');
        main.insertBefore(quoteBox, main.firstChild);
      })
      .catch(() => {});
  }

  // ====================
  // 12. SHARE TARGET
  // ====================
  if (FEATURES.shareTarget) {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('title') || urlParams.get('url');
    if (sharedText) {
      const input = document.getElementById('todo-input');
      if (input) {
        input.value = sharedText;
        window.addTodo();
      }
    }
  }

  // ====================
  // 13. NOTIFICATIONS
  // ====================
  function scheduleNotification(taskText, dueDate) {
    if (!('Notification' in window) || !dueDate) return;
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    if (due > now) {
      const timeout = due - now;
      setTimeout(() => {
        new Notification('⏰ Task Due', { body: taskText, icon: '/icons/icon-192x192.png' });
      }, timeout);
    }
  }

  // ====================
  // INIT
  // ====================
  if (FEATURES.themeToggle) initTheme();
  // Re-render to pick up new markup (after original script already ran once)
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.renderTodos === 'function') window.renderTodos();
  });
})();