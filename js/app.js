/* ═══════════════════════════════════════════════════════════
   Personal Productivity Dashboard — app.js
   Zero dependencies. Module-per-widget via Revealing Module
   Pattern. All state persisted in localStorage under ppd_.
═══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────
// Environment detection
// Pure-logic functions must be importable in Node (Vitest)
// without browser globals. All DOM / storage accesses are
// guarded so the IIFEs initialise safely in both contexts.
// ─────────────────────────────────────────────────────────
const _isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const _storage   = _isBrowser ? window.localStorage : null;

function _getEl(id) {
  return _isBrowser ? document.getElementById(id) : null;
}


// ─────────────────────────────────────────────────────────
// StorageService
// Central adapter for window.localStorage.
// ─────────────────────────────────────────────────────────
const StorageService = (function () {
  const KEYS = {
    THEME:    'ppd_theme',
    NAME:     'ppd_name',
    DURATION: 'ppd_duration',
    TASKS:    'ppd_tasks',
    LINKS:    'ppd_links',
  };

  function read(key) {
    if (!_storage) return null;
    try {
      const raw = _storage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function write(key, value) {
    if (!_storage) return false;
    try {
      _storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_e) {
      NotificationService.show('Change could not be saved', 'error');
      return false;
    }
  }

  function remove(key) {
    if (!_storage) return;
    try {
      _storage.removeItem(key);
    } catch (_e) {
      // silently ignore
    }
  }

  function hydrate() {
    const theme    = read(KEYS.THEME);
    const name     = read(KEYS.NAME);
    const duration = read(KEYS.DURATION);
    let   tasks    = [];
    let   links    = [];

    try {
      const rawTasks = read(KEYS.TASKS);
      tasks = Array.isArray(rawTasks) ? rawTasks : [];
    } catch (_e) {
      NotificationService.show('Could not load saved data', 'error');
    }

    try {
      const rawLinks = read(KEYS.LINKS);
      links = Array.isArray(rawLinks) ? rawLinks : [];
    } catch (_e) {
      NotificationService.show('Could not load saved data', 'error');
    }

    return {
      theme:    (theme === 'dark' || theme === 'light') ? theme : 'light',
      name:     typeof name === 'string' ? name : '',
      duration: Number.isInteger(duration) && duration >= 1 && duration <= 120 ? duration : 25,
      tasks,
      links,
    };
  }

  return { KEYS, read, write, remove, hydrate };
})();


// ─────────────────────────────────────────────────────────
// NotificationService
// Appends a toast to the DOM for 1–3 s then removes it.
// ─────────────────────────────────────────────────────────
const NotificationService = (function () {
  function show(message, type = 'info') {
    const container = _getEl('notifications');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    container.appendChild(toast);

    const displayDuration = type === 'error' ? 3000 : 2000;
    setTimeout(() => {
      toast.classList.add('toast--leaving');
      // wait for the 0.35s fade-out animation to finish before removing
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, displayDuration);
  }

  return { show };
})();


// ─────────────────────────────────────────────────────────
// AudioService
// Plays audio files for timer tick and completion.
// Falls back to Web Audio API synth if files can't load.
// ─────────────────────────────────────────────────────────
const AudioService = (function () {
  let _tickAudio = null;
  let _bellAudio = null;

  function _loadAudio(src) {
    if (!_isBrowser) return null;
    const a = new Audio(src);
    a.preload = 'auto';
    return a;
  }

  function _ensureLoaded() {
    if (!_tickAudio) _tickAudio = _loadAudio('./media/mp3/clock-ticking-js.mp3');
    if (!_bellAudio) _bellAudio = _loadAudio('./media/mp3/mixkit-clock-bells-hour-signal-1069.wav');
  }

  function playTick() {
    if (!_isBrowser) return;
    _ensureLoaded();
    if (!_tickAudio) return;
    // Restart from beginning so rapid calls don't pile up
    _tickAudio.currentTime = 0;
    _tickAudio.play().catch(() => {});
  }

  function playAlert() {
    if (!_isBrowser) return;
    _ensureLoaded();
    if (_bellAudio) {
      _bellAudio.currentTime = 0;
      _bellAudio.play().catch(() => _synthAlert());
    } else {
      _synthAlert();
    }
  }

  function _synthAlert() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx  = new AudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
      osc.onended = () => ctx.close();
    } catch (_e) {}
  }

  return { playTick, playAlert };
})();


// ─────────────────────────────────────────────────────────
// BackgroundMusic
// Plays the looping background track via an HTML Audio element.
// ─────────────────────────────────────────────────────────
const BackgroundMusic = (function () {
  let _audio = null;
  let _playing = false;

  function _getAudio() {
    if (!_isBrowser) return null;
    if (!_audio) {
      _audio = new Audio('./media/mp3/[no copyright music]  coffee time  cute vlog music.mp3');
      _audio.loop = true;
      _audio.volume = 0.4;
    }
    return _audio;
  }

  function play() {
    const audio = _getAudio();
    if (!audio || _playing) return;
    audio.play().then(() => {
      _playing = true;
      _syncButtons();
      const statusEl = _getEl('settings-music-status');
      if (statusEl) {
        statusEl.textContent = 'Music playing';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      }
      NotificationService.show('Background music playing', 'info');
    }).catch(() => {
      NotificationService.show('Could not play music', 'error');
    });
  }

  function stop() {
    const audio = _getAudio();
    if (!audio || !_playing) return;
    audio.pause();
    audio.currentTime = 0;
    _playing = false;
    _syncButtons();
    const statusEl = _getEl('settings-music-status');
    if (statusEl) {
      statusEl.textContent = 'Music stopped';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    }
    NotificationService.show('Background music stopped', 'info');
  }

  function _syncButtons() {
    const playBtn = _getEl('music-play-btn');
    const stopBtn = _getEl('music-stop-btn');
    if (playBtn) playBtn.disabled = _playing;
    if (stopBtn) stopBtn.disabled = !_playing;
  }

  function init() {
    const playBtn = _getEl('music-play-btn');
    const stopBtn = _getEl('music-stop-btn');
    if (playBtn) playBtn.addEventListener('click', play);
    if (stopBtn) stopBtn.addEventListener('click', stop);
    _syncButtons();
  }

  return { init, play, stop };
})();


// ─────────────────────────────────────────────────────────
// GreetingWidget
// ─────────────────────────────────────────────────────────
const GreetingWidget = (function () {
  const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS   = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

  // Pure logic ─────────────────────────────────────────────

  function formatTime(hour, minute) {
    return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
  }

  function formatDate(date) {
    const weekday = WEEKDAYS[date.getDay()];
    const month   = MONTHS[date.getMonth()];
    const day     = date.getDate();
    const year    = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  }

  function getGreetingPrefix(hour) {
    if (hour >= 5  && hour <= 11) return 'Good morning';
    if (hour >= 12 && hour <= 17) return 'Good afternoon';
    if (hour >= 18 && hour <= 21) return 'Good evening';
    return 'Good night';
  }

  function buildGreeting(prefix, name) {
    if (typeof name === 'string' && name.trim().length > 0) {
      return `${prefix}, ${name}`;
    }
    return prefix;
  }

  // DOM ─────────────────────────────────────────────────────

  function render() {
    const now    = new Date();
    const hour   = now.getHours();
    const minute = now.getMinutes();

    const timeEl = _getEl('greeting-time');
    const dateEl = _getEl('greeting-date');
    const textEl = _getEl('greeting-text');

    if (timeEl) timeEl.textContent = formatTime(hour, minute);
    if (dateEl) dateEl.textContent = formatDate(now);
    if (textEl) textEl.textContent = buildGreeting(getGreetingPrefix(hour), _currentName);
  }

  let _currentName = '';
  let _interval    = null;

  function init(name) {
    _currentName = name || '';
    render();
    if (!_interval) {
      _interval = setInterval(render, 60_000);
    }
  }

  function setName(name) {
    _currentName = name || '';
    render();
  }

  return { init, setName, formatTime, formatDate, getGreetingPrefix, buildGreeting };
})();


// ─────────────────────────────────────────────────────────
// FocusTimer
// ─────────────────────────────────────────────────────────
const FocusTimer = (function () {
  // Pure logic ─────────────────────────────────────────────

  function formatTimer(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function validateTimerDuration(value) {
    if (!Number.isInteger(value) || value < 1 || value > 180) {
      return { valid: false, error: 'Duration must be a whole number between 1 and 180 minutes.' };
    }
    return { valid: true, error: null };
  }

  // State ───────────────────────────────────────────────────

  let _state         = 'idle'; // idle | running | paused | completed
  let _totalSeconds  = 25 * 60;
  let _remaining     = _totalSeconds;
  let _intervalId    = null;

  function _updateDisplay() {
    const el = _getEl('timer-display');
    if (!el) return;
    el.textContent = formatTimer(_remaining);
    el.classList.toggle('completed', _state === 'completed');
  }

  // DOM ─────────────────────────────────────────────────────

  function init(durationMinutes) {
    const mins = (durationMinutes && Number.isInteger(durationMinutes)) ? durationMinutes : 25;
    _totalSeconds = mins * 60;
    _remaining    = _totalSeconds;
    _state        = 'idle';
    _updateDisplay();
  }

  function setDuration(minutes) {
    if (_state !== 'idle') return;
    _totalSeconds = minutes * 60;
    _remaining    = _totalSeconds;
    _updateDisplay();
  }

  function start() {
    if (_state === 'running') return; // no-op guard
    if (_state === 'completed') return;

    _state = 'running';
    SettingsPanel.lockDurationInput();

    _intervalId = setInterval(() => {
      _remaining -= 1;
      _updateDisplay();
      AudioService.playTick();

      if (_remaining <= 0) {
        clearInterval(_intervalId);
        _intervalId = null;
        _state = 'completed';
        _updateDisplay();
        AudioService.playAlert();
        SettingsPanel.unlockDurationInput();
      }
    }, 1000);
  }

  function stop() {
    if (_state !== 'running') return;
    clearInterval(_intervalId);
    _intervalId = null;
    _state = 'paused';
    SettingsPanel.unlockDurationInput();
  }

  function reset() {
    clearInterval(_intervalId);
    _intervalId = null;
    _remaining  = _totalSeconds;
    _state      = 'idle';
    _updateDisplay();
    SettingsPanel.unlockDurationInput();
  }

  return { init, setDuration, start, stop, reset, formatTimer, validateTimerDuration };
})();


// ─────────────────────────────────────────────────────────
// TodoList
// ─────────────────────────────────────────────────────────
const TodoList = (function () {
  // Pure logic ─────────────────────────────────────────────

  function validateTask(description) {
    if (typeof description !== 'string' || description.trim().length === 0) {
      return { valid: false, error: 'Task description cannot be empty or whitespace.' };
    }
    if (description.length > 500) {
      return { valid: false, error: 'Task description must be 500 characters or fewer.' };
    }
    return { valid: true, error: null };
  }

  function serializeTasks(tasks) {
    return JSON.stringify(tasks);
  }

  function deserializeTasks(json) {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  // State ───────────────────────────────────────────────────

  let _tasks = [];

  function _generateId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function _save() {
    StorageService.write(StorageService.KEYS.TASKS, _tasks);
  }

  function _render() {
    const listEl  = _getEl('todo-list');
    const emptyEl = _getEl('todo-empty');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (_tasks.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    _tasks.forEach(task => {
      const li   = document.createElement('li');
      li.className = 'todo__item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      const checkbox = document.createElement('input');
      checkbox.type    = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark "${task.description}" as complete`);
      checkbox.addEventListener('change', () => toggleComplete(task.id));

      const span = document.createElement('span');
      span.className   = 'todo__description';
      span.textContent = task.description;

      const editBtn = document.createElement('button');
      editBtn.className   = 'btn btn--secondary';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', `Edit "${task.description}"`);
      editBtn.style.minWidth  = '44px';
      editBtn.style.minHeight = '44px';
      editBtn.addEventListener('click', () => _startEdit(task.id, li, span));

      const delBtn = document.createElement('button');
      delBtn.className   = 'btn btn--secondary';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', `Delete "${task.description}"`);
      delBtn.style.minWidth  = '44px';
      delBtn.style.minHeight = '44px';
      delBtn.addEventListener('click', () => deleteTask(task.id));

      li.append(checkbox, span, editBtn, delBtn);
      listEl.appendChild(li);
    });
  }

  function _startEdit(id, li, span) {
    const input = document.createElement('input');
    input.type      = 'text';
    input.className = 'input todo__edit-input';
    input.value     = span.textContent;
    input.maxLength = 500;

    const saveBtn = document.createElement('button');
    saveBtn.className   = 'btn btn--primary';
    saveBtn.textContent = 'Save';
    saveBtn.setAttribute('aria-label', 'Save task edit');

    span.replaceWith(input);
    saveBtn.addEventListener('click', () => {
      editTask(id, input.value);
    });
    input.after(saveBtn);
    input.focus();
  }

  // Mutations ───────────────────────────────────────────────

  function init(tasks) {
    _tasks = Array.isArray(tasks) ? tasks : [];
    _render();
  }

  function addTask(description) {
    const result = validateTask(description);
    const errorEl = _getEl('todo-error');
    if (!result.valid) {
      if (errorEl) errorEl.textContent = result.error;
      return;
    }
    if (errorEl) errorEl.textContent = '';

    _tasks.push({
      id:          _generateId(),
      description: description.trim(),
      completed:   false,
      createdAt:   Date.now(),
    });
    _save();
    _render();

    const input = _getEl('todo-input');
    if (input) input.value = '';
  }

  function editTask(id, description) {
    const result = validateTask(description);
    if (!result.valid) {
      NotificationService.show(result.error, 'error');
      return;
    }
    _tasks = _tasks.map(t => t.id === id ? { ...t, description: description.trim() } : t);
    _save();
    _render();
  }

  function toggleComplete(id) {
    _tasks = _tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    _save();
    _render();
  }

  function deleteTask(id) {
    _tasks = _tasks.filter(t => t.id !== id);
    _save();
    _render();
  }

  return { init, addTask, editTask, toggleComplete, deleteTask, validateTask, serializeTasks, deserializeTasks };
})();


// ─────────────────────────────────────────────────────────
// QuickLinks
// ─────────────────────────────────────────────────────────
const QuickLinks = (function () {
  const MAX_LINKS = 20;

  // Pure logic ─────────────────────────────────────────────

  function validateLink(label, url, existingLinks = []) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      return { valid: false, error: 'Label cannot be empty.' };
    }
    if (label.trim().length > 50) {
      return { valid: false, error: 'Label must be 50 characters or fewer.' };
    }
    if (typeof url !== 'string' || url.trim().length === 0) {
      return { valid: false, error: 'URL cannot be empty.' };
    }
    if (url.trim().length > 2048) {
      return { valid: false, error: 'URL must be 2048 characters or fewer.' };
    }
    const normalized = normalizeUrl(url.trim());
    const duplicate  = existingLinks.some(l => l.url === normalized);
    if (duplicate) {
      return { valid: false, error: 'This URL has already been added.' };
    }
    return { valid: true, error: null };
  }

  function normalizeUrl(url) {
    if (typeof url !== 'string') return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  }

  // State ───────────────────────────────────────────────────

  let _links = [];

  function _generateId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function _save() {
    StorageService.write(StorageService.KEYS.LINKS, _links);
  }

  function _render() {
    const listEl  = _getEl('links-list');
    const emptyEl = _getEl('links-empty');
    const capEl   = _getEl('links-capacity');
    const addBtn  = _getEl('links-add-btn');

    if (!listEl) return;

    listEl.innerHTML = '';

    const atCapacity = _links.length >= MAX_LINKS;
    if (addBtn) addBtn.disabled = atCapacity;
    if (capEl)  capEl.textContent = atCapacity ? `Maximum ${MAX_LINKS} links reached.` : '';

    if (_links.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    _links.forEach(link => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '4px';

      const a = document.createElement('a');
      a.href        = link.url;
      a.target      = '_blank';
      a.rel         = 'noopener noreferrer';
      a.className   = 'link-btn';
      a.textContent = link.label;

      const delBtn = document.createElement('button');
      delBtn.className   = 'link-delete-btn';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', `Remove link "${link.label}"`);
      delBtn.addEventListener('click', () => deleteLink(link.id));

      wrapper.append(a, delBtn);
      listEl.appendChild(wrapper);
    });
  }

  // Mutations ───────────────────────────────────────────────

  function init(links) {
    _links = Array.isArray(links) ? links : [];
    _render();
  }

  function addLink(label, url) {
    const errorEl = _getEl('links-error');
    if (_links.length >= MAX_LINKS) {
      if (errorEl) errorEl.textContent = `Maximum ${MAX_LINKS} links reached.`;
      return;
    }

    const result = validateLink(label, url, _links);
    if (!result.valid) {
      if (errorEl) errorEl.textContent = result.error;
      return;
    }
    if (errorEl) errorEl.textContent = '';

    _links.push({
      id:    _generateId(),
      label: label.trim(),
      url:   normalizeUrl(url.trim()),
    });
    _save();
    _render();

    const labelInput = _getEl('link-label-input');
    const urlInput   = _getEl('link-url-input');
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
  }

  function deleteLink(id) {
    _links = _links.filter(l => l.id !== id);
    _save();
    _render();
  }

  return { init, addLink, deleteLink, validateLink, normalizeUrl };
})();


// ─────────────────────────────────────────────────────────
// ThemeToggle
// ─────────────────────────────────────────────────────────
const ThemeToggle = (function () {
  // Pure logic ─────────────────────────────────────────────

  function toggleTheme(current) {
    return current === 'light' ? 'dark' : 'light';
  }

  // DOM ─────────────────────────────────────────────────────

  function applyTheme(theme, notify = false) {
    if (_isBrowser) document.body.dataset.theme = theme;
    StorageService.write(StorageService.KEYS.THEME, theme);

    const btn = _getEl('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    if (notify) {
      const label = theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled';
      const statusEl = _getEl('settings-theme-status');
      if (statusEl) {
        statusEl.textContent = label;
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }
      NotificationService.show(label, 'info');
    }
  }

  function init(savedTheme) {
    const theme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    applyTheme(theme, false); // silent on load

    const btn = _getEl('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        applyTheme(toggleTheme(document.body.dataset.theme), true); // notify on user click
      });
    }
  }

  return { init, toggleTheme, applyTheme };
})();


// ─────────────────────────────────────────────────────────
// SettingsPanel
// ─────────────────────────────────────────────────────────
const SettingsPanel = (function () {
  // Pure logic ─────────────────────────────────────────────

  function sanitizeName(raw) {
    if (typeof raw !== 'string') return '';
    return raw.trim().slice(0, 50);
  }

  function validateDuration(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 120) {
      return { valid: false, error: 'Duration must be a whole number between 1 and 120 minutes.' };
    }
    return { valid: true, error: null };
  }

  // DOM ─────────────────────────────────────────────────────

  function lockDurationInput() {
    const input = _getEl('settings-duration-input');
    if (input) input.disabled = true;
  }

  function unlockDurationInput() {
    const input = _getEl('settings-duration-input');
    if (input) input.disabled = false;
  }

  function init(savedName, savedDuration) {
    const nameInput     = _getEl('settings-name-input');
    const durationInput = _getEl('settings-duration-input');

    if (nameInput)     nameInput.value     = savedName     || '';
    if (durationInput) durationInput.value = savedDuration || 25;

    // Name form
    const nameForm = _getEl('settings-name-form');
    if (nameForm) {
      nameForm.addEventListener('submit', e => {
        e.preventDefault();
        const raw   = nameInput ? nameInput.value : '';
        const clean = sanitizeName(raw);
        const errorEl = _getEl('settings-name-error');

        if (clean.length === 0) {
          StorageService.remove(StorageService.KEYS.NAME);
          GreetingWidget.setName('');
          if (errorEl) errorEl.textContent = '';
          NotificationService.show('Display name cleared', 'info');
        } else {
          StorageService.write(StorageService.KEYS.NAME, clean);
          GreetingWidget.setName(clean);
          if (nameInput) nameInput.value = clean;
          if (errorEl) errorEl.textContent = '';
          NotificationService.show('Name saved', 'success');
        }
      });
    }

    // Duration form
    const durationForm = _getEl('settings-duration-form');
    if (durationForm) {
      durationForm.addEventListener('submit', e => {
        e.preventDefault();
        const raw      = durationInput ? durationInput.value.trim() : '';
        const errorEl  = _getEl('settings-duration-error');

        if (raw === '') {
          // Empty → restore default
          StorageService.write(StorageService.KEYS.DURATION, 25);
          FocusTimer.setDuration(25);
          if (durationInput) durationInput.value = 25;
          if (errorEl) errorEl.textContent = '';
          NotificationService.show('Duration reset to 25 minutes', 'info');
          return;
        }

        const parsed = parseInt(raw, 10);
        const result = validateDuration(parsed);
        if (!result.valid) {
          if (errorEl) errorEl.textContent = result.error;
          return;
        }
        if (errorEl) errorEl.textContent = '';
        StorageService.write(StorageService.KEYS.DURATION, parsed);
        FocusTimer.setDuration(parsed);
        NotificationService.show('Duration saved', 'success');
      });
    }
  }

  return { init, lockDurationInput, unlockDurationInput, sanitizeName, validateDuration };
})();


// ─────────────────────────────────────────────────────────
// Wire up timer controls
// ─────────────────────────────────────────────────────────
function _wireTimerControls() {
  const startBtn = _getEl('timer-start');
  const stopBtn  = _getEl('timer-stop');
  const resetBtn = _getEl('timer-reset');

  if (startBtn) startBtn.addEventListener('click', () => FocusTimer.start());
  if (stopBtn)  stopBtn.addEventListener('click',  () => FocusTimer.stop());
  if (resetBtn) resetBtn.addEventListener('click', () => FocusTimer.reset());
}

// ─────────────────────────────────────────────────────────
// Wire up todo form
// ─────────────────────────────────────────────────────────
function _wireTodoForm() {
  const form  = _getEl('todo-form');
  const input = _getEl('todo-input');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (input) TodoList.addTask(input.value);
    });
  }
}

// ─────────────────────────────────────────────────────────
// Wire up links form
// ─────────────────────────────────────────────────────────
function _wireLinksForm() {
  const form       = _getEl('links-form');
  const labelInput = _getEl('link-label-input');
  const urlInput   = _getEl('link-url-input');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      QuickLinks.addLink(
        labelInput ? labelInput.value : '',
        urlInput   ? urlInput.value   : ''
      );
    });
  }
}


// ─────────────────────────────────────────────────────────
// App — orchestrator
// ─────────────────────────────────────────────────────────
const App = (function () {
  function init() {
    let data;
    try {
      data = StorageService.hydrate();
    } catch (_e) {
      NotificationService.show('Could not load saved data', 'error');
      data = { theme: 'light', name: '', duration: 25, tasks: [], links: [] };
    }

    ThemeToggle.init(data.theme);
    GreetingWidget.init(data.name);
    FocusTimer.init(data.duration);
    TodoList.init(data.tasks);
    QuickLinks.init(data.links);
    SettingsPanel.init(data.name, data.duration);
    BackgroundMusic.init();

    _wireTimerControls();
    _wireTodoForm();
    _wireLinksForm();
  }

  return { init };
})();

if (_isBrowser) {
  document.addEventListener('DOMContentLoaded', App.init);
}

// ─────────────────────────────────────────────────────────
// Pure-function exports (for Node/Vitest testing)
// Each widget module exposes its pure helpers as named
// exports so tests can import them without a browser.
// ─────────────────────────────────────────────────────────
export {
  StorageService,
  GreetingWidget,
  FocusTimer,
  TodoList,
  QuickLinks,
  ThemeToggle,
  SettingsPanel,
};
