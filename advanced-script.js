// ============ ADVANCED FEATURES MODULE ============
(function() {
  'use strict';

  // === CONFIG ===
  const FEATURES = {
    themeToggle: true,
    voiceInput: true,
    categories: true,
    dueDates: true,
    dragDrop: true,
    search: true,
    richNotes: true,
    pomodoro: false,   // optional
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
    toggleBtn.innerHTML = '🌙';
    toggleBtn.title = 'Toggle light/dark mode';
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      localStorage.setItem('modo-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
      toggleBtn.innerHTML = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
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

  // Override addTodo to include tags
  const originalAddTodo = window.addTodo || function(){};
  window.addTodo = function() {
    const input = document.getElementById('todo-input');
    const raw = input.value.trim();
    if (!raw) return;
    const { text, tags } = parseTask(raw);
    const dueDate = document.getElementById('todo-due')?.value || null;
    todos.unshift({ text, tags, dueDate, done: false, created: Date.now() });
    saveTodos();
    renderTodos();
    input.value = '';
    input.focus();
    scheduleNotification(text, dueDate);
  };

  // Enhanced render with tags & due dates
  const originalRender = window.renderTodos || function(){};
  window.renderTodos = function() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    if (todos.length === 0) {
      list.innerHTML = `<div class="empty">
        <div class="empty-icon">✨</div>
        <p>No tasks yet. Say something like “Buy milk #errands”</p>
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
    initDragDrop();
    initSwipe();
  };

  // Helper to show saved render
  function escHtml(s) { 
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  // ====================
  // 3. DUE DATE INPUT
  // ====================
  if (FEATURES.dueDates) {
    const row = document.querySelector('.input-row');
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'todo-due';
    dateInput.style.cssText = 'width:130px; margin-left:8px;';
    row.appendChild(dateInput);
  }

  // ====================
  // 4. DRAG & DROP
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
    if (dragSrcIndex !== targetIndex) {
      const moved = todos.splice(dragSrcIndex, 1)[0];
      todos.splice(targetIndex, 0, moved);
      saveTodos();
      renderTodos();
    }
  }
  function handleDragEnd(e) {
    this.classList.remove('dragging');
  }

  // ====================
  // 5. SWIPE GESTURES
  // ====================
  function initSwipe() {
    document.querySelectorAll('.todo-item').forEach(item => {
      let startX = 0;
      item.addEventListener('touchstart', e => startX = e.touches[0].clientX);
      item.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 80) {
          const index = +item.dataset.index;
          if (diff > 0) deleteTodo(index);   // swipe left
          else toggleTodo(index);             // swipe right
        }
      });
    });
  }

  // ====================
  // 6. VOICE INPUT
  // ====================
  if (FEATURES.voiceInput && 'webkitSpeechRecognition' in window) {
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'btn';
    voiceBtn.innerHTML = '🎤';
    voiceBtn.title = 'Add task by voice';
    voiceBtn.style.marginLeft = '8px';
    document.querySelector('.input-row').appendChild(voiceBtn);
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    voiceBtn.addEventListener('click', () => {
      recognition.start();
    });
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('todo-input').value = transcript;
      window.addTodo();
    };
  }

  // ====================
  // 7. RICH NOTES
  // ====================
  if (FEATURES.richNotes) {
    const notesArea = document.getElementById('notes-area');
    if (notesArea) {
      notesArea.removeAttribute('placeholder'); // we'll use contenteditable div
      const editableDiv = document.createElement('div');
      editableDiv.id = 'notes-editor';
      editableDiv.contentEditable = true;
      editableDiv.style.cssText = notesArea.style.cssText + ' min-height:160px; white-space: pre-wrap;';
      editableDiv.innerHTML = notesArea.value;
      notesArea.parentNode.replaceChild(editableDiv, notesArea);

      const toolbar = document.createElement('div');
      toolbar.id = 'notes-toolbar';
      toolbar.innerHTML = `
        <button data-cmd="bold">B</button>
        <button data-cmd="italic">I</button>
        <button data-cmd="insertUnorderedList">•</button>
      `;
      editableDiv.parentNode.insertBefore(toolbar, editableDiv.nextSibling);

      toolbar.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
          document.execCommand(e.target.dataset.cmd, false, null);
          editableDiv.focus();
        }
      });

      editableDiv.addEventListener('input', () => {
        localStorage.setItem('modo-notes', editableDiv.innerHTML);
        document.getElementById('notes-saved')?.classList.add('show');
        setTimeout(() => document.getElementById('notes-saved')?.classList.remove('show'), 2000);
        const wordCount = editableDiv.innerText.length;
        const charSpan = document.getElementById('char-count');
        if (charSpan) charSpan.textContent = wordCount + ' chars';
      });
    }
  }

  // ====================
  // 8. GLOBAL SEARCH
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
      // also highlight in notes if rich editor active
      const editor = document.getElementById('notes-editor');
      if (editor) {
        // simple highlight (you could implement mark.js)
        const html = editor.innerHTML.replace(/<mark>/g,'').replace(/<\/mark>/g,'');
        if (term) {
          const regex = new RegExp(`(${term})`, 'gi');
          editor.innerHTML = html.replace(regex, '<mark>$1</mark>');
        } else {
          editor.innerHTML = html;
        }
      }
    });
  }

  // ====================
  // 9. POMODORO TIMER (optional)
  // ====================
  if (FEATURES.pomodoro) {
    // Add a fab button to start pomodoro
    // This is a full mini timer, but I'll keep it brief
    // Actually, I'll include a simple implementation
    const fab = document.createElement('button');
    fab.id = 'pomodoro-fab';
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
    // rest of timer logic...
  }

  // ====================
  // 10. DAILY MOTIVATION QUOTE
  // ====================
  if (FEATURES.dailyQuote) {
    fetch('https://api.quotable.io/random?tags=productivity')
      .then(r => r.json())
      .then(data => {
        const quoteBox = document.createElement('div');
        quoteBox.style.cssText = 'text-align:center;margin:16px 0;font-style:italic;color:var(--text-muted);font-size:14px;';
        quoteBox.innerHTML = `"${data.content}" — ${data.author}`;
        document.querySelector('main').prepend(quoteBox);
      })
      .catch(() => {});
  }

  // ====================
  // 11. SHARE TARGET HANDLING
  // ====================
  if (FEATURES.shareTarget) {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('title') || urlParams.get('url');
    if (sharedText) {
      document.getElementById('todo-input').value = sharedText;
      window.addTodo();
    }
  }

  // ====================
  // 12. NOTIFICATIONS (due tasks)
  // ====================
  function scheduleNotification(taskText, dueDate) {
    if (!('Notification' in window) || !dueDate) return;
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        const due = new Date(dueDate).getTime();
        const now = Date.now();
        if (due > now) {
          setTimeout(() => {
            new Notification('Modo Reminder', { body: `Task due: ${taskText}`, icon: '/icons/icon-192x192.png' });
          }, due - now);
        }
      }
    });
  }

  // Initialize everything
  if (FEATURES.themeToggle) initTheme();
  // Note: renderTodos is already called in original script, but we've overridden it, so it will use new version
  // Re-render to pick up new markup (but careful: original renderTodos already called once)
  // So just call it again after DOM ready.
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.renderTodos === 'function') window.renderTodos();
  });

})();