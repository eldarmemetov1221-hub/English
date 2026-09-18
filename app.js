/* ============================================================
   My English Tutor — личный AI-репетитор английского
   Чистый JS, без сборки. Данные хранятся в localStorage.
   ============================================================ */

'use strict';

/* ---------- Хранилище ---------- */
const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const KEYS = {
  settings: 'met.settings',
  chat: 'met.chat',
  vocab: 'met.vocab',
  progress: 'met.progress',
};

/* ---------- Настройки ---------- */
const defaultSettings = {
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  openaiUrl: 'https://api.groq.com/openai/v1',
  openaiKey: '',
  openaiModel: 'llama-3.3-70b-versatile',
  sttModel: 'whisper-large-v3-turbo', // модель распознавания речи (Groq Whisper)
};
// Порядок приоритета: значения по умолчанию → config.local.js → сохранённые в браузере.
let settings = Object.assign(
  {},
  defaultSettings,
  (typeof window !== 'undefined' && window.MET_CONFIG) ? window.MET_CONFIG : {},
  LS.get(KEYS.settings, {})
);

/* ---------- Прогресс ---------- */
const defaultProgress = { streak: 0, lastActive: null, totalMessages: 0, days: {} };
let progress = Object.assign({}, defaultProgress, LS.get(KEYS.progress, {}));

/* ---------- DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const el = {
  status: $('#statusLine'),
  messages: $('#messages'),
  composer: $('#composer'),
  input: $('#input'),
  sendBtn: $('#sendBtn'),
  levelSelect: $('#levelSelect'),
  scenarioSelect: $('#scenarioSelect'),
  newChatBtn: $('#newChatBtn'),
  // словарь
  wordList: $('#wordList'),
  vocabEmpty: $('#vocabEmpty'),
  addWordForm: $('#addWordForm'),
  wordEn: $('#wordEn'),
  wordRu: $('#wordRu'),
  startReviewBtn: $('#startReviewBtn'),
  dueInfo: $('#dueInfo'),
  reviewArea: $('#reviewArea'),
  flashcard: $('#flashcard'),
  flashFront: $('#flashFront'),
  flashBack: $('#flashBack'),
  reviewShow: $('#reviewShow'),
  reviewGrade: $('#reviewGrade'),
  showAnswerBtn: $('#showAnswerBtn'),
  closeReview: $('#closeReview'),
  reviewCount: $('#reviewCount'),
  // прогресс
  statStreak: $('#statStreak'),
  statMessages: $('#statMessages'),
  statWords: $('#statWords'),
  statLearned: $('#statLearned'),
  activityChart: $('#activityChart'),
  resetProgress: $('#resetProgress'),
  // настройки
  settingsModal: $('#settingsModal'),
  openSettings: $('#openSettings'),
  closeSettings: $('#closeSettings'),
  providerSelect: $('#providerSelect'),
  ollamaFields: $('#ollamaFields'),
  openaiFields: $('#openaiFields'),
  ollamaUrl: $('#ollamaUrl'),
  ollamaModel: $('#ollamaModel'),
  openaiUrl: $('#openaiUrl'),
  openaiKey: $('#openaiKey'),
  openaiModel: $('#openaiModel'),
  saveSettings: $('#saveSettings'),
  testConnBtn: $('#testConnBtn'),
  connResult: $('#connResult'),
};

/* ============================================================
   МАРКДАУН (минимальный, безопасный)
   ============================================================ */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderMarkdown(text) {
  const lines = escapeHtml(text).split('\n');
  let html = '';
  let listType = null; // 'ul' | 'ol'
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };

  for (let raw of lines) {
    let line = raw;
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const h = line.match(/^(#{1,3})\s+(.*)$/);

    if (h) {
      closeList();
      const lvl = h[1].length;
      html += `<h${lvl}>${inline(h[2])}</h${lvl}>`;
    } else if (ul) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
      html += `<li>${inline(ul[1])}</li>`;
    } else if (ol) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
      html += `<li>${inline(ol[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

/* ============================================================
   ЧАТ
   ============================================================ */
let history = LS.get(KEYS.chat, []); // [{role:'user'|'assistant', content, correction?}]
let busy = false;

const SCENARIOS = {
  free: 'a free, friendly open conversation',
  cafe: 'a role-play at a cafe or restaurant (ordering food, asking the waiter)',
  travel: 'a role-play about travelling (airport, hotel check-in, asking directions)',
  job: 'a job interview role-play (asking and answering interview questions)',
  shopping: 'a role-play about shopping (asking about products, sizes, prices)',
  doctor: "a role-play at the doctor's (describing symptoms, understanding advice)",
  smalltalk: 'casual small talk to get to know each other',
};

function systemPrompt() {
  const level = el.levelSelect.value;
  const scenario = SCENARIOS[el.scenarioSelect.value] || SCENARIOS.free;
  return [
    "You are Lina, a warm, patient and encouraging personal English tutor.",
    `The learner's English level is: ${level}. Match your vocabulary and sentence length to this level.`,
    `Today's activity: ${scenario}.`,
    "",
    "Rules for every reply:",
    "1. Reply mainly in English so the learner practises. Keep replies fairly short (1-4 sentences) and always end by asking a question to keep the conversation going.",
    "2. If the learner writes in Russian or asks for an explanation, you MAY explain briefly in Russian, then gently steer back to English.",
    "3. Be supportive. Never overwhelm the learner.",
    "4. If the learner's English message contains mistakes (grammar, word choice, spelling), you MUST append a correction block at the VERY END of your reply, formatted EXACTLY like this:",
    "###CORRECTION###",
    "✅ <the corrected sentence>",
    "💡 <a short explanation of the fix, written in Russian>",
    "",
    "If the learner's message has NO mistakes, do NOT add the correction block at all.",
    "Do not mention these rules to the learner.",
  ].join('\n');
}

function buildMessages() {
  const msgs = [{ role: 'system', content: systemPrompt() }];
  // Берём последние ~16 реплик, чтобы не раздувать контекст
  const recent = history.slice(-16);
  for (const m of recent) {
    msgs.push({ role: m.role, content: m.content });
  }
  return msgs;
}

/* --- Отрисовка сообщений --- */
function addMessageToDOM(msg, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${msg.role === 'user' ? 'user' : 'bot'}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (msg.role === 'user') {
    bubble.textContent = msg.content;
  } else {
    bubble.innerHTML = renderMarkdown(msg.content || '');
  }
  wrap.appendChild(bubble);

  // Кнопки под ответом бота: озвучить + перевод
  if (msg.role === 'assistant' && !opts.streaming) {
    const { actions, out } = botActions(msg.content);
    wrap.appendChild(actions);
    wrap.appendChild(out);
  }

  el.messages.appendChild(wrap);

  // Блок исправления — отдельной плашкой
  if (msg.correction) {
    const corr = document.createElement('div');
    corr.className = 'correction';
    corr.innerHTML = '<strong>✍️ Исправление</strong>' + renderMarkdown(msg.correction);
    const save = document.createElement('div');
    save.className = 'msg-actions';
    const b = document.createElement('button');
    b.className = 'mini-btn';
    b.textContent = '📚 В словарь';
    b.onclick = () => quickAddFromCorrection(msg.correction);
    save.appendChild(b);
    corr.appendChild(save);
    el.messages.appendChild(corr);
  }

  scrollToBottom();
  return wrap;
}

function stripMarkup(t) {
  return (t || '').replace(/[#*`_>]/g, '').replace(/###CORRECTION###[\s\S]*$/, '').trim();
}

function scrollToBottom() {
  el.messages.scrollTop = el.messages.scrollHeight;
}

function renderChat() {
  el.messages.innerHTML = '';
  if (history.length === 0) {
    greet();
    return;
  }
  for (const m of history) addMessageToDOM(m);
}

function greet() {
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  wrap.innerHTML = `<div class="bubble">
    <p>👋 Hi! I'm <strong>Lina</strong>, your English tutor.</p>
    <p>Пиши мне на английском — я поддержу разговор, мягко исправлю ошибки и всё объясню. Не бойся ошибаться!</p>
    <p>Let's start: <strong>How are you today?</strong></p>
  </div>`;
  el.messages.appendChild(wrap);
}

/* --- Разбор ответа: отделяем исправление --- */
function splitCorrection(full) {
  const idx = full.indexOf('###CORRECTION###');
  if (idx === -1) return { reply: full.trim(), correction: '' };
  return {
    reply: full.slice(0, idx).trim(),
    correction: full.slice(idx + '###CORRECTION###'.length).trim(),
  };
}

/* --- Отправка --- */
async function sendMessage(textArg) {
  const text = (textArg ?? el.input.value).trim();
  if (!text || busy) return;

  busy = true;
  el.sendBtn.disabled = true;
  el.input.value = '';
  autoGrow();

  const userMsg = { role: 'user', content: text };
  history.push(userMsg);
  addMessageToDOM(userMsg);
  bumpProgress();

  // Плашка "печатает…"
  const typingWrap = document.createElement('div');
  typingWrap.className = 'msg bot';
  typingWrap.innerHTML = '<div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>';
  el.messages.appendChild(typingWrap);
  scrollToBottom();
  const typingBubble = typingWrap.querySelector('.bubble');

  let full = '';
  try {
    await streamChat(buildMessages(), (chunk) => {
      full += chunk;
      const { reply } = splitCorrection(full);
      typingBubble.innerHTML = renderMarkdown(reply || '…');
      scrollToBottom();
    });
  } catch (err) {
    typingWrap.remove();
    showError(err);
    busy = false;
    el.sendBtn.disabled = false;
    return;
  }

  typingWrap.remove();
  const { reply, correction } = splitCorrection(full);
  const botMsg = { role: 'assistant', content: reply, correction };
  history.push(botMsg);
  LS.set(KEYS.chat, history);
  addMessageToDOM(botMsg);

  busy = false;
  el.sendBtn.disabled = false;
  el.input.focus();
}

function showError(err) {
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  const msg = String(err && err.message ? err.message : err);
  const tip = settings.provider === 'ollama'
    ? `Убедись, что Ollama запущен, а модель скачана (<code>ollama pull ${escapeHtml(settings.ollamaModel)}</code>).`
    : 'Скорее всего, сеть/провайдер нестабильно пропускает запросы к этому сервису. Попробуй ещё раз, смени сеть (мобильный интернет / VPN) или перейди на локальную модель Ollama.';
  wrap.innerHTML = `<div class="bubble">
    <p>⚠️ <strong>Не получилось получить ответ.</strong></p>
    <p>${escapeHtml(msg)}</p>
    <p>${tip}</p>
  </div>`;
  el.messages.appendChild(wrap);
  scrollToBottom();
}

/* ============================================================
   LLM провайдеры (со стримингом)
   ============================================================ */
async function streamChat(messages, onToken) {
  if (settings.provider === 'ollama') {
    return streamOllama(messages, onToken);
  }
  return streamOpenAI(messages, onToken);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch с автоповтором при обрыве соединения / 5xx (помогает на нестабильной сети).
async function fetchWithRetry(url, opts, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status >= 500 && i < tries - 1) { await sleep(500 * (i + 1)); continue; }
      return res;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(500 * (i + 1));
    }
  }
  throw lastErr || new Error('network');
}

async function streamOllama(messages, onToken) {
  const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/chat';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: settings.ollamaModel, messages, stream: true }),
    });
  } catch (e) {
    throw new Error('Не удалось подключиться к Ollama по адресу ' + settings.ollamaUrl +
      '. Запусти Ollama и разреши доступ браузеру (см. README про OLLAMA_ORIGINS).');
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Ollama ответил с ошибкой ${res.status}. ${t.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      try {
        const obj = JSON.parse(s);
        const piece = obj.message && obj.message.content;
        if (piece) onToken(piece);
      } catch {}
    }
  }
}

async function streamOpenAI(messages, onToken) {
  const base = settings.openaiUrl.replace(/\/$/, '');
  const url = base + '/chat/completions';
  let res;
  try {
    res = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.openaiKey,
      },
      body: JSON.stringify({ model: settings.openaiModel, messages, stream: true }),
    });
  } catch (e) {
    throw new Error('Не удалось подключиться к API (' + base + ') после нескольких попыток. Похоже, твоя сеть/провайдер блокирует доступ к этому сервису. Попробуй мобильный интернет, VPN или локальную модель Ollama.');
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API ответил с ошибкой ${res.status}. Проверь ключ и модель. ${t.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const s = line.trim();
      if (!s || !s.startsWith('data:')) continue;
      const data = s.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const obj = JSON.parse(data);
        const piece = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
        if (piece) onToken(piece);
      } catch {}
    }
  }
}

/* --- Перевод текста на русский (через ту же модель) --- */
async function translateText(text) {
  let out = '';
  await streamChat([
    { role: 'system', content: 'You are a translator. Translate the user text into natural Russian. Output ONLY the translation, no quotes, no extra words.' },
    { role: 'user', content: text },
  ], (c) => { out += c; });
  return out.trim();
}

/* --- Кнопки под ответом бота: озвучить + перевод --- */
function botActions(text) {
  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  const play = document.createElement('button');
  play.className = 'mini-btn';
  play.textContent = '🔊';
  play.title = 'Озвучить';
  play.onclick = () => { unlockTTS(); speak(stripMarkup(text)); };

  const tr = document.createElement('button');
  tr.className = 'mini-btn';
  tr.textContent = '🌐 Перевод';

  const out = document.createElement('div');
  out.className = 'translation hidden';

  tr.onclick = async () => {
    if (out.dataset.done) { out.classList.toggle('hidden'); return; }
    tr.disabled = true; tr.textContent = '🌐 …';
    try {
      out.textContent = await translateText(stripMarkup(text));
      out.dataset.done = '1';
      out.classList.remove('hidden');
    } catch { out.textContent = 'Не удалось перевести (сеть).'; out.classList.remove('hidden'); }
    tr.disabled = false; tr.textContent = '🌐 Перевод';
  };

  actions.append(play, tr);
  return { actions, out };
}

/* --- Проверка связи --- */
async function testConnection() {
  el.connResult.textContent = 'Проверяю…';
  el.connResult.className = 'conn-result';
  // Сначала применим значения из формы, но без сохранения
  const probe = collectSettingsFromForm();
  const saved = settings;
  settings = probe;
  try {
    let out = '';
    await streamChat(
      [{ role: 'user', content: 'Reply with the single word: OK' }],
      (t) => { out += t; }
    );
    el.connResult.textContent = '✅ Связь есть! Ответ модели: ' + (out.trim().slice(0, 40) || '(пусто)');
    el.connResult.className = 'conn-result ok';
  } catch (err) {
    el.connResult.textContent = '❌ ' + (err.message || err);
    el.connResult.className = 'conn-result err';
  } finally {
    settings = saved;
  }
}

/* ============================================================
   ОЗВУЧКА (Web Speech API, встроена в браузер)
   ============================================================ */
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/* ============================================================
   СЛОВАРЬ + КАРТОЧКИ (система Лейтнера)
   ============================================================ */
let vocab = LS.get(KEYS.vocab, []); // [{id, en, ru, box, due, learned}]

function saveVocab() { LS.set(KEYS.vocab, vocab); }

function addWord(en, ru) {
  en = (en || '').trim();
  ru = (ru || '').trim();
  if (!en) return false;
  if (vocab.some((w) => w.en.toLowerCase() === en.toLowerCase())) return false;
  vocab.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    en, ru, box: 1, due: Date.now(), learned: false,
  });
  saveVocab();
  renderVocab();
  updateProgressUI();
  return true;
}

function deleteWord(id) {
  vocab = vocab.filter((w) => w.id !== id);
  saveVocab();
  renderVocab();
  updateProgressUI();
}

function quickAddFromCorrection(correctionText) {
  // Пытаемся вытащить исправленную фразу из строки после ✅
  const line = (correctionText || '').split('\n').find((l) => l.includes('✅'));
  const en = line ? line.replace(/.*✅/, '').trim() : '';
  el.wordEn.value = en;
  el.wordRu.value = '';
  switchTab('vocab');
  el.wordEn.focus();
}

function renderVocab() {
  el.wordList.innerHTML = '';
  if (vocab.length === 0) {
    el.vocabEmpty.classList.remove('hidden');
  } else {
    el.vocabEmpty.classList.add('hidden');
  }
  for (const w of vocab) {
    const li = document.createElement('li');
    li.className = 'word-item';
    const main = document.createElement('div');
    main.className = 'w-main';
    main.innerHTML = `<span class="w-en">${escapeHtml(w.en)}</span>` +
      (w.ru ? `<span class="w-ru">${escapeHtml(w.ru)}</span>` : '');
    const box = document.createElement('span');
    box.className = 'w-box';
    box.textContent = w.learned ? '✅ выучено' : 'ур. ' + w.box;
    const speakBtn = document.createElement('button');
    speakBtn.className = 'del';
    speakBtn.textContent = '🔊';
    speakBtn.title = 'Произнести';
    speakBtn.onclick = () => speak(w.en);
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '🗑';
    del.title = 'Удалить';
    del.onclick = () => deleteWord(w.id);
    li.append(main, box, speakBtn, del);
    el.wordList.appendChild(li);
  }
  updateDueInfo();
}

function dueCards() {
  const now = Date.now();
  return vocab.filter((w) => !w.learned && w.due <= now);
}

function updateDueInfo() {
  const n = dueCards().length;
  el.dueInfo.textContent = n > 0 ? `К повторению: ${n}` : 'На повторение сейчас ничего нет';
  el.startReviewBtn.disabled = n === 0;
}

// Интервалы боксов Лейтнера (в миллисекундах)
const BOX_INTERVALS = [0, 4 * 3600e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3, 30 * 24 * 3600e3];

let reviewQueue = [];
let currentCard = null;

function startReview() {
  reviewQueue = dueCards();
  if (reviewQueue.length === 0) return;
  el.reviewArea.classList.remove('hidden');
  nextCard();
}

function nextCard() {
  if (reviewQueue.length === 0) {
    el.reviewArea.classList.add('hidden');
    renderVocab();
    return;
  }
  currentCard = reviewQueue.shift();
  el.reviewCount.textContent = `Осталось: ${reviewQueue.length + 1}`;
  el.flashFront.textContent = currentCard.en;
  el.flashBack.textContent = currentCard.ru || '(нет перевода)';
  el.flashBack.classList.add('hidden');
  el.reviewShow.classList.remove('hidden');
  el.reviewGrade.classList.add('hidden');
}

function showAnswer() {
  el.flashBack.classList.remove('hidden');
  el.reviewShow.classList.add('hidden');
  el.reviewGrade.classList.remove('hidden');
}

function gradeCard(grade) {
  const w = vocab.find((x) => x.id === currentCard.id);
  if (w) {
    if (grade === 0) w.box = 1;            // не помню — в начало
    else if (grade === 1) w.box = Math.max(1, w.box); // сложно — остаётся
    else w.box = Math.min(BOX_INTERVALS.length - 1, w.box + 1); // легко — дальше
    const interval = BOX_INTERVALS[w.box];
    w.due = Date.now() + interval;
    if (w.box >= BOX_INTERVALS.length - 1 && grade === 2) w.learned = true;
    saveVocab();
  }
  nextCard();
  updateProgressUI();
}

/* ============================================================
   ПРОГРЕСС
   ============================================================ */
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function bumpProgress() {
  const today = todayKey();
  progress.totalMessages = (progress.totalMessages || 0) + 1;
  progress.days = progress.days || {};
  progress.days[today] = (progress.days[today] || 0) + 1;

  if (progress.lastActive !== today) {
    const yesterday = new Date(Date.now() - 86400e3);
    const yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    progress.streak = progress.lastActive === yKey ? (progress.streak || 0) + 1 : 1;
    progress.lastActive = today;
  }
  LS.set(KEYS.progress, progress);
  updateProgressUI();
}

function updateProgressUI() {
  el.statStreak.textContent = progress.streak || 0;
  el.statMessages.textContent = progress.totalMessages || 0;
  el.statWords.textContent = vocab.length;
  el.statLearned.textContent = vocab.filter((w) => w.learned).length;
  renderActivity();
}

function renderActivity() {
  el.activityChart.innerHTML = '';
  const days = progress.days || {};
  const data = [];
  let max = 1;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400e3);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const val = days[key] || 0;
    max = Math.max(max, val);
    data.push({ key, val, label: String(d.getDate()) });
  }
  for (const d of data) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.title = `${d.key}: ${d.val} сообщ.`;
    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.height = Math.round((d.val / max) * 100) + '%';
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = d.label;
    bar.append(fill, lbl);
    el.activityChart.appendChild(bar);
  }
}

/* ============================================================
   НАСТРОЙКИ (модалка)
   ============================================================ */
function fillSettingsForm() {
  el.providerSelect.value = settings.provider;
  el.ollamaUrl.value = settings.ollamaUrl;
  el.ollamaModel.value = settings.ollamaModel;
  el.openaiUrl.value = settings.openaiUrl;
  el.openaiKey.value = settings.openaiKey;
  el.openaiModel.value = settings.openaiModel;
  toggleProviderFields();
}

function toggleProviderFields() {
  const isOllama = el.providerSelect.value === 'ollama';
  el.ollamaFields.classList.toggle('hidden', !isOllama);
  el.openaiFields.classList.toggle('hidden', isOllama);
}

function collectSettingsFromForm() {
  return {
    provider: el.providerSelect.value,
    ollamaUrl: el.ollamaUrl.value.trim() || defaultSettings.ollamaUrl,
    ollamaModel: el.ollamaModel.value.trim() || defaultSettings.ollamaModel,
    openaiUrl: el.openaiUrl.value.trim() || defaultSettings.openaiUrl,
    openaiKey: el.openaiKey.value.trim(),
    openaiModel: el.openaiModel.value.trim() || defaultSettings.openaiModel,
  };
}

function saveSettings() {
  settings = collectSettingsFromForm();
  LS.set(KEYS.settings, settings);
  closeSettings();
  checkStatus();
}

function openSettings() { el.settingsModal.classList.remove('hidden'); fillSettingsForm(); el.connResult.textContent = ''; }
function closeSettings() { el.settingsModal.classList.add('hidden'); }

/* --- Индикатор статуса в шапке --- */
async function checkStatus() {
  el.status.textContent = 'Проверяю подключение…';
  el.status.className = '';
  try {
    if (settings.provider === 'ollama') {
      const res = await fetch(settings.ollamaUrl.replace(/\/$/, '') + '/api/tags');
      if (!res.ok) throw new Error();
      el.status.textContent = 'Ollama · ' + settings.ollamaModel;
    } else {
      el.status.textContent = 'API · ' + settings.openaiModel;
    }
    el.status.className = 'ok';
  } catch {
    el.status.textContent = 'Нет связи — открой ⚙️ Настройки';
    el.status.className = 'err';
  }
}

/* ============================================================
   ВКЛАДКИ
   ============================================================ */
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $('#tab-' + name).classList.add('active');
  if (name === 'progress') updateProgressUI();
  if (name === 'vocab') renderVocab();
}

/* ============================================================
   Ввод: авто-рост textarea + Enter
   ============================================================ */
function autoGrow() {
  el.input.style.height = 'auto';
  el.input.style.height = Math.min(el.input.scrollHeight, 140) + 'px';
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  // чат
  renderChat();
  el.composer.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
  el.input.addEventListener('input', autoGrow);
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  el.newChatBtn.addEventListener('click', () => {
    if (!confirm('Начать новый диалог? Текущая переписка удалится.')) return;
    history = [];
    LS.set(KEYS.chat, history);
    renderChat();
  });
  el.levelSelect.addEventListener('change', () => LS.set('met.level', el.levelSelect.value));
  el.scenarioSelect.addEventListener('change', () => LS.set('met.scenario', el.scenarioSelect.value));
  const savedLevel = LS.get('met.level', null);
  if (savedLevel) el.levelSelect.value = savedLevel;
  const savedScenario = LS.get('met.scenario', null);
  if (savedScenario) el.scenarioSelect.value = savedScenario;

  // вкладки
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  // словарь
  el.addWordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (addWord(el.wordEn.value, el.wordRu.value)) {
      el.wordEn.value = '';
      el.wordRu.value = '';
      el.wordEn.focus();
    }
  });
  el.startReviewBtn.addEventListener('click', startReview);
  el.showAnswerBtn.addEventListener('click', showAnswer);
  el.closeReview.addEventListener('click', () => { el.reviewArea.classList.add('hidden'); });
  el.reviewGrade.querySelectorAll('.grade-btn').forEach((b) => {
    b.addEventListener('click', () => gradeCard(Number(b.dataset.grade)));
  });

  // прогресс
  el.resetProgress.addEventListener('click', () => {
    if (!confirm('Сбросить весь прогресс, словарь и переписку?')) return;
    history = []; vocab = []; progress = Object.assign({}, defaultProgress);
    LS.set(KEYS.chat, history); LS.set(KEYS.vocab, vocab); LS.set(KEYS.progress, progress);
    renderChat(); renderVocab(); updateProgressUI();
  });

  // настройки
  el.openSettings.addEventListener('click', openSettings);
  el.closeSettings.addEventListener('click', closeSettings);
  el.providerSelect.addEventListener('change', toggleProviderFields);
  el.saveSettings.addEventListener('click', saveSettings);
  el.testConnBtn.addEventListener('click', testConnection);
  el.settingsModal.addEventListener('click', (e) => { if (e.target === el.settingsModal) closeSettings(); });

  renderVocab();
  updateProgressUI();
  initVoice();
  checkStatus();
}

/* ============================================================
   РАСПОЗНАВАНИЕ РЕЧИ (Web Speech API)
   ============================================================ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function speechSupported() { return !!SR; }

// Универсальный однократный слушатель (push-to-talk).
function listenOnce({ onInterim, onFinal, onError, onEnd }) {
  if (!SR) { onError && onError('Браузер не поддерживает распознавание речи. Открой приложение в Chrome или Edge.'); return null; }
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  let finalText = '';
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    onInterim && onInterim((finalText + interim).trim());
  };
  r.onerror = (e) => { onError && onError(errText(e.error)); };
  r.onend = () => { onEnd && onEnd(finalText.trim()); };
  try { r.start(); } catch { onError && onError('Не удалось запустить микрофон.'); }
  return r;
}

function errText(code) {
  const map = {
    'not-allowed': 'Нет доступа к микрофону. Разреши его в настройках браузера.',
    'service-not-allowed': 'Нет доступа к микрофону. Разреши его в настройках браузера.',
    'no-speech': 'Я ничего не услышала. Попробуй ещё раз.',
    'audio-capture': 'Микрофон не найден. Проверь, что он подключён.',
    'network': 'Ошибка сети при распознавании речи.',
  };
  return map[code] || ('Ошибка микрофона: ' + code);
}

/* --- Распознавание через Groq Whisper (работает в любом браузере) --- */
async function transcribeGroq(blob, filename) {
  const base = settings.openaiUrl.replace(/\/$/, '');
  const fd = new FormData();
  fd.append('file', blob, filename || 'audio.webm');
  fd.append('model', settings.sttModel || 'whisper-large-v3-turbo');
  fd.append('language', 'en'); // это тренировка английского — распознаём как английский
  fd.append('response_format', 'json');
  const res = await fetchWithRetry(base + '/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + settings.openaiKey },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('Whisper вернул ошибку ' + res.status + '. ' + t.slice(0, 150));
  }
  const data = await res.json().catch(() => ({}));
  return (data.text || '').trim();
}

// Выбор поддерживаемого формата записи (важно для Safari/iOS).
function pickAudioType() {
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
    for (const c of cands) { if (MediaRecorder.isTypeSupported(c)) return c; }
  }
  return '';
}
function extForMime(mime) {
  if (!mime) return 'webm';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

function whisperAvailable() {
  return settings.provider === 'openai' && !!settings.openaiKey;
}

// Запись голоса → отправка в Whisper. Возвращает контроллер со stop()/abort().
function beginWhisperCapture(h) {
  let mr = null, stream = null, stopped = false;
  const chunks = [];
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    h.onError && h.onError('Браузер не даёт доступ к микрофону. Открой приложение по https или на localhost.');
    return { stop() {}, abort() {}, mode: 'whisper' };
  }
  navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
    stream = s;
    if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
    const type = pickAudioType();
    try { mr = type ? new MediaRecorder(s, { mimeType: type }) : new MediaRecorder(s); }
    catch {
      try { mr = new MediaRecorder(s); }
      catch { h.onError && h.onError('Этот браузер не умеет записывать звук.'); s.getTracks().forEach((t) => t.stop()); return; }
    }
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (chunks.length === 0) { h.onFinal && h.onFinal(''); return; }
      h.onTranscribing && h.onTranscribing();
      try {
        const mime = mr.mimeType || type || 'audio/webm';
        const blob = new Blob(chunks, { type: mime });
        const text = await transcribeGroq(blob, 'audio.' + extForMime(mime));
        h.onFinal && h.onFinal(text);
      } catch (err) { h.onError && h.onError(err.message || String(err)); }
    };
    mr.start(1000); // timeslice: данные идут порциями (надёжнее в Safari)
    h.onListeningStart && h.onListeningStart();
  }).catch(() => {
    h.onError && h.onError('Нет доступа к микрофону. Разреши доступ и открой сайт по https или на localhost.');
  });
  return {
    stop() { stopped = true; if (mr && mr.state !== 'inactive') mr.stop(); },
    abort() {
      stopped = true;
      if (mr && mr.state !== 'inactive') { mr.onstop = null; mr.ondataavailable = null; mr.stop(); }
      if (stream) stream.getTracks().forEach((t) => t.stop());
    },
    mode: 'whisper',
  };
}

// Единая точка входа: Whisper (если есть ключ) или встроенное распознавание браузера.
function beginCapture(h) {
  if (whisperAvailable()) return beginWhisperCapture(h);
  const r = listenOnce({
    onInterim: h.onInterim,
    onError: h.onError,
    onEnd: (final) => h.onFinal && h.onFinal(final),
  });
  if (r) h.onListeningStart && h.onListeningStart();
  return { stop() { r && r.stop(); }, abort() { r && r.abort(); }, mode: 'webspeech' };
}

// Озвучка с колбэком по завершении.
function speakThen(text, cb) {
  if (!('speechSynthesis' in window) || !text) { cb && cb(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  u.onend = () => cb && cb();
  u.onerror = () => cb && cb();
  window.speechSynthesis.speak(u);
}

// iOS/Safari разрешают озвучку только после касания. «Будим» синтезатор в жесте.
let ttsUnlocked = false;
function unlockTTS() {
  if (ttsUnlocked || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    ttsUnlocked = true;
  } catch {}
}

/* ============================================================
   РЕЖИМ «РАЗГОВОР» (голосом)
   ============================================================ */
let talkHistory = [];
let talkController = null;
let talkListening = false;
let talkBusy = false;

const talkEl = {};
function initTalk() {
  talkEl.log = $('#talkLog');
  talkEl.mic = $('#talkMic');
  talkEl.status = $('#talkStatus');
  talkEl.level = $('#talkLevel');
  talkEl.auto = $('#autoTalk');
  talkEl.clear = $('#talkClear');
  talkEl.hint = $('#talkHint');
  talkEl.type = $('#talkType');
  talkEl.typeForm = $('#talkTypeForm');
  talkEl.typeInput = $('#talkTypeInput');
  talkEl.avatar = document.querySelector('.talk-avatar');

  renderTalkEmpty();
  talkEl.mic.addEventListener('click', toggleTalk);
  talkEl.hint.addEventListener('click', talkHint);
  talkEl.type.addEventListener('click', () => {
    talkEl.typeForm.classList.toggle('hidden');
    if (!talkEl.typeForm.classList.contains('hidden')) talkEl.typeInput.focus();
  });
  talkEl.typeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = talkEl.typeInput.value.trim();
    if (!t || talkBusy) return;
    talkEl.typeInput.value = '';
    talkEl.typeForm.classList.add('hidden');
    unlockTTS();
    handleTalkUtterance(t);
  });
  talkEl.clear.addEventListener('click', () => {
    if (talkController) { talkController.abort(); talkController = null; }
    talkMicActive(false);
    window.speechSynthesis && window.speechSynthesis.cancel();
    talkHistory = [];
    renderTalkEmpty();
    setTalkStatus('Нажми на микрофон и говори по-английски');
  });
  const savedLvl = LS.get('met.talkLevel', null);
  if (savedLvl) talkEl.level.value = savedLvl;
  talkEl.level.addEventListener('change', () => LS.set('met.talkLevel', talkEl.level.value));
}

async function talkHint() {
  if (talkBusy) return;
  setTalkStatus('💡 Подбираю фразу…');
  try {
    let out = '';
    const msgs = [{ role: 'system', content: 'You help an English learner during a conversation. Suggest ONE short, natural English sentence the learner could say next. Output ONLY that sentence, no quotes, no extra words.' }];
    for (const m of talkHistory.slice(-6)) msgs.push({ role: m.role, content: m.content });
    if (talkHistory.length === 0) msgs.push({ role: 'user', content: 'Suggest a friendly opening line to start a conversation.' });
    await streamChat(msgs, (c) => { out += c; });
    const phrase = out.trim().replace(/^["']+|["']+$/g, '').split('\n')[0];
    if (talkHistory.length === 0) talkEl.log.innerHTML = '';
    showHintBubble(phrase);
    setTalkStatus('Нажми 🎤 и скажи это — или свой вариант');
  } catch { setTalkStatus('Не удалось получить подсказку (сеть).'); }
}

function showHintBubble(phrase) {
  if (!phrase) return;
  const div = document.createElement('div');
  div.className = 'hint-bubble';
  div.innerHTML = '💡 Попробуй сказать: <b>' + escapeHtml(phrase) + '</b> ';
  const b = document.createElement('button');
  b.className = 'mini-btn';
  b.textContent = '🔊';
  b.onclick = () => { unlockTTS(); speak(phrase); };
  div.appendChild(b);
  talkEl.log.appendChild(div);
  talkEl.log.scrollTop = talkEl.log.scrollHeight;
}

function renderTalkEmpty() {
  const canVoice = whisperAvailable() || speechSupported();
  talkEl.log.innerHTML = canVoice
    ? '<p class="talk-empty">🎙️ Живой разговор с репетитором.<br>Нажми на микрофон, скажи что-нибудь по-английски — и Lina ответит голосом.<br><br>Включи «Без рук» для непрерывной беседы.</p>'
    : '<p class="talk-empty">🎙️ Чтобы говорить голосом, укажи ключ Groq в ⚙️ Настройках (распознавание пойдёт через Whisper) — или открой приложение в Chrome/Edge.</p>';
}

function setTalkStatus(t) { talkEl.status.textContent = t; }
function talkMicActive(on) {
  talkListening = on;
  talkEl.mic.classList.toggle('listening', on);
  talkEl.mic.textContent = on ? '⏹' : '🎤';
}

function toggleTalk() {
  if (talkBusy) return;
  unlockTTS();
  if (talkController) { talkController.stop(); return; } // идёт запись → остановить
  startTalkCapture();
}

function startTalkCapture() {
  if (talkController || talkBusy) return;
  window.speechSynthesis && window.speechSynthesis.cancel();
  talkController = beginCapture({
    onListeningStart: () => {
      talkMicActive(true);
      setTalkStatus(talkController && talkController.mode === 'whisper'
        ? '🔴 Идёт запись… нажми ⏹, когда договоришь'
        : 'Слушаю… говори');
    },
    onInterim: (t) => setTalkStatus('🎤 ' + (t || '…')),
    onTranscribing: () => { talkMicActive(false); setTalkStatus('Распознаю речь…'); },
    onError: (msg) => {
      talkController = null;
      talkMicActive(false);
      setTalkStatus('Ошибка (см. сообщение)');
      if (talkHistory.length === 0) talkEl.log.innerHTML = '';
      const w = talkBubble('bot', '⚠️ ' + msg);
      w.querySelector('.bubble').style.color = '#ef4444';
    },
    onFinal: (text) => {
      talkController = null;
      talkMicActive(false);
      if (text) handleTalkUtterance(text);
      else setTalkStatus('Не расслышала. Нажми 🎤 и повтори.');
    },
  });
}

function talkBubble(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
  const b = document.createElement('div');
  b.className = 'bubble';
  if (role === 'user') b.textContent = text; else b.innerHTML = renderMarkdown(text);
  wrap.appendChild(b);
  talkEl.log.appendChild(wrap);
  talkEl.log.scrollTop = talkEl.log.scrollHeight;
  return wrap;
}

function talkSystemPrompt() {
  const level = talkEl.level.value;
  return [
    "You are Lina, a warm and encouraging English conversation partner having a SPOKEN conversation.",
    `The learner's level is ${level}. Match your vocabulary to it.`,
    "Your reply will be read aloud by a text-to-speech voice, so:",
    "- Reply ONLY in English, in 1-2 short natural sentences.",
    "- Do NOT use markdown, emojis, bullet points, or any special symbols.",
    "- Always finish with a short, easy follow-up question to keep the conversation flowing.",
    "If the learner made a clear English mistake, after your spoken reply add a correction block EXACTLY like:",
    "###CORRECTION###",
    "✅ <corrected sentence>",
    "💡 <short explanation in Russian>",
    "Otherwise do not add it.",
  ].join('\n');
}

function buildTalkMessages() {
  const msgs = [{ role: 'system', content: talkSystemPrompt() }];
  for (const m of talkHistory.slice(-16)) msgs.push({ role: m.role, content: m.content });
  return msgs;
}

async function handleTalkUtterance(text) {
  // убрать заглушку при первом сообщении
  if (talkHistory.length === 0) talkEl.log.innerHTML = '';
  talkBubble('user', text);
  talkHistory.push({ role: 'user', content: text });
  bumpProgress();

  talkBusy = true;
  talkEl.mic.disabled = true;
  setTalkStatus('Думаю…');

  const wrap = talkBubble('bot', '…');
  const bubble = wrap.querySelector('.bubble');
  let full = '';
  try {
    await streamChat(buildTalkMessages(), (c) => {
      full += c;
      const { reply } = splitCorrection(full);
      bubble.innerHTML = renderMarkdown(reply || '…');
      talkEl.log.scrollTop = talkEl.log.scrollHeight;
    });
  } catch (err) {
    bubble.innerHTML = '⚠️ ' + escapeHtml(err.message || String(err));
    talkBusy = false; talkEl.mic.disabled = false;
    setTalkStatus('Ошибка соединения. Проверь ⚙️ Настройки.');
    return;
  }

  const { reply, correction } = splitCorrection(full);
  bubble.innerHTML = renderMarkdown(reply);
  const acts = botActions(reply);
  wrap.appendChild(acts.actions);
  wrap.appendChild(acts.out);
  if (correction) {
    const corr = document.createElement('div');
    corr.className = 'correction';
    corr.innerHTML = '<strong>✍️ Исправление</strong>' + renderMarkdown(correction);
    talkEl.log.appendChild(corr);
  }
  talkHistory.push({ role: 'assistant', content: reply });
  talkEl.log.scrollTop = talkEl.log.scrollHeight;

  talkBusy = false;
  talkEl.mic.disabled = false;
  setTalkStatus('🔊 Отвечаю…');
  if (talkEl.avatar) talkEl.avatar.classList.add('speaking');
  speakThen(stripMarkup(reply), () => {
    if (talkEl.avatar) talkEl.avatar.classList.remove('speaking');
    if (talkEl.auto.checked) startTalkCapture();
    else setTalkStatus('Нажми 🎤, чтобы ответить');
  });
}

/* ============================================================
   РЕЖИМ «ПРОИЗНОШЕНИЕ» (упражнения)
   ============================================================ */
const SENTENCE_BANK = {
  beginner: [
    "Hello, how are you today?",
    "I would like a cup of coffee, please.",
    "What time does the train leave?",
    "My favorite color is blue.",
    "Can you help me, please?",
    "I am learning English every day.",
    "The weather is very nice today.",
    "Where is the nearest bus stop?",
    "I have two brothers and one sister.",
    "See you tomorrow morning.",
  ],
  intermediate: [
    "I've been studying English for three years.",
    "Could you recommend a good restaurant nearby?",
    "I'm really looking forward to the weekend.",
    "She usually goes to work by bus.",
    "This is the best decision I've ever made.",
    "I would appreciate it if you could reply soon.",
    "Let me know if you have any questions.",
    "We should probably leave a bit earlier.",
  ],
  advanced: [
    "Despite the challenges, they managed to finish the project on time.",
    "I'd rather stay home than go out in this weather.",
    "The committee has yet to reach a final decision.",
    "Had I known earlier, I would have acted differently.",
    "Her argument was both compelling and thoroughly researched.",
    "We need to take a variety of factors into account.",
  ],
};

let currentSentence = '';
let pronController = null;
let pronListening = false;

const pronEl = {};
function initPron() {
  pronEl.level = $('#pronLevel');
  pronEl.new = $('#pronNew');
  pronEl.ai = $('#pronAI');
  pronEl.target = $('#pronTarget');
  pronEl.targetRu = $('#pronTargetRu');
  pronEl.listen = $('#pronListen');
  pronEl.mic = $('#pronMic');
  pronEl.status = $('#pronStatus');
  pronEl.result = $('#pronResult');
  pronEl.score = $('#pronScore');
  pronEl.marked = $('#pronMarked');
  pronEl.heard = $('#pronHeard');

  const savedLvl = LS.get('met.pronLevel', null);
  if (savedLvl) pronEl.level.value = savedLvl;

  newSentence();
  pronEl.level.addEventListener('change', () => { LS.set('met.pronLevel', pronEl.level.value); newSentence(); });
  pronEl.new.addEventListener('click', newSentence);
  pronEl.ai.addEventListener('click', aiSentence);
  pronEl.listen.addEventListener('click', () => speak(currentSentence));
  pronEl.mic.addEventListener('click', togglePron);
}

function newSentence() {
  const bank = SENTENCE_BANK[pronEl.level.value] || SENTENCE_BANK.intermediate;
  let s = bank[Math.floor(Math.random() * bank.length)];
  if (s === currentSentence && bank.length > 1) s = bank[(bank.indexOf(s) + 1) % bank.length];
  currentSentence = s;
  pronEl.target.textContent = s;
  pronEl.result.classList.add('hidden');
  pronEl.status.textContent = 'Нажми 🎤 и произнеси фразу';
  showPronTranslation(s);
}

// Показать русский перевод текущей фразы под ней.
async function showPronTranslation(sentence) {
  if (!pronEl.targetRu) return;
  pronEl.targetRu.textContent = '🌐 …';
  try {
    pronEl.targetRu.textContent = await translateText(sentence);
  } catch { pronEl.targetRu.textContent = ''; }
}

async function aiSentence() {
  if (settings.provider === 'openai' && !settings.openaiKey) { pronEl.status.textContent = 'Для ИИ-фраз укажи API-ключ в ⚙️ Настройках.'; return; }
  pronEl.status.textContent = '✨ Генерирую фразу…';
  const levelName = pronEl.level.value;
  let out = '';
  try {
    await streamChat([
      { role: 'system', content: 'You generate ONE short English practice sentence for pronunciation drills. Output ONLY the sentence, nothing else. No quotes, no numbering.' },
      { role: 'user', content: `Give me one ${levelName}-level English sentence (6-12 words) to read aloud.` },
    ], (c) => { out += c; });
    const s = out.replace(/^["'\s]+|["'\s]+$/g, '').split('\n')[0].trim();
    if (s) { currentSentence = s; pronEl.target.textContent = s; pronEl.result.classList.add('hidden'); pronEl.status.textContent = 'Нажми 🎤 и произнеси фразу'; showPronTranslation(s); }
    else pronEl.status.textContent = 'Не удалось сгенерировать. Попробуй ещё раз.';
  } catch (err) {
    pronEl.status.textContent = '⚠️ ' + (err.message || err);
  }
}

function pronMicActive(on) {
  pronListening = on;
  pronEl.mic.classList.toggle('listening', on);
  pronEl.mic.textContent = on ? '⏹' : '🎤';
}

function togglePron() {
  unlockTTS();
  if (pronController) { pronController.stop(); return; }
  window.speechSynthesis && window.speechSynthesis.cancel();
  pronController = beginCapture({
    onListeningStart: () => {
      pronMicActive(true);
      pronEl.status.textContent = pronController && pronController.mode === 'whisper'
        ? '🔴 Запись… нажми ⏹, когда прочитаешь'
        : 'Слушаю… произнеси фразу';
    },
    onInterim: (t) => { pronEl.status.textContent = '🎤 ' + (t || '…'); },
    onTranscribing: () => { pronMicActive(false); pronEl.status.textContent = 'Проверяю…'; },
    onError: (msg) => { pronController = null; pronMicActive(false); pronEl.status.textContent = msg; },
    onFinal: (text) => {
      pronController = null;
      pronMicActive(false);
      if (text) scorePronunciation(text);
      else pronEl.status.textContent = 'Не расслышала. Нажми 🎤 и повтори.';
    },
  });
}

function normalizeWord(w) { return w.toLowerCase().replace(/[^a-z0-9']/g, ''); }

function scorePronunciation(spoken) {
  const spokenWords = spoken.split(/\s+/).map(normalizeWord).filter(Boolean);
  const spokenSet = new Set(spokenWords);
  const tokens = currentSentence.split(/\s+/);
  let total = 0, matched = 0;
  let html = '';
  for (const tok of tokens) {
    const n = normalizeWord(tok);
    if (!n) { html += escapeHtml(tok) + ' '; continue; }
    total++;
    const ok = spokenSet.has(n);
    if (ok) matched++;
    html += `<span class="${ok ? 'w-ok' : 'w-miss'}">${escapeHtml(tok)}</span> `;
  }
  const score = total ? Math.round((matched / total) * 100) : 0;

  pronEl.result.classList.remove('hidden');
  pronEl.score.textContent = score + '%';
  pronEl.score.className = 'pron-score ' + (score >= 85 ? 'good' : score >= 60 ? 'ok' : 'bad');
  pronEl.marked.innerHTML = html;
  pronEl.heard.textContent = 'Услышала: ' + spoken;
  pronEl.status.textContent = score >= 85 ? '🎉 Отлично!' : score >= 60 ? '👍 Неплохо, попробуй ещё раз' : '🔁 Давай попробуем снова';
  bumpProgress();
}

/* ============================================================
   ПЛАН ОБУЧЕНИЯ (персональный курс с нуля)
   ============================================================ */
let plan = LS.get('met.plan', null); // {title, days:[{day,topic,tasks:[]}], done:{}, config}
const planEl = {};

function initPlan() {
  planEl.setup = $('#planSetup');
  planEl.view = $('#planView');
  planEl.level = $('#planLevel');
  planEl.focus = $('#planFocus');
  planEl.minutes = $('#planMinutes');
  planEl.goal = $('#planGoal');
  planEl.generate = $('#planGenerate');
  planEl.status = $('#planStatus');
  planEl.title = $('#planTitle');
  planEl.progressText = $('#planProgressText');
  planEl.barFill = $('#planBarFill');
  planEl.days = $('#planDays');
  planEl.reset = $('#planReset');

  planEl.generate.addEventListener('click', generatePlan);
  planEl.reset.addEventListener('click', () => {
    if (!confirm('Составить новый план? Текущий прогресс по плану сбросится.')) return;
    plan = null;
    LS.set('met.plan', plan);
    renderPlan();
  });
  renderPlan();
}

function renderPlan() {
  if (!plan || !plan.days) {
    planEl.setup.classList.remove('hidden');
    planEl.view.classList.add('hidden');
    return;
  }
  planEl.setup.classList.add('hidden');
  planEl.view.classList.remove('hidden');
  planEl.title.textContent = plan.title || 'Мой план';

  let total = 0, done = 0;
  planEl.days.innerHTML = '';
  plan.days.forEach((d, di) => {
    const card = document.createElement('div');
    card.className = 'plan-day';
    const head = document.createElement('div');
    head.className = 'plan-day-head';
    head.innerHTML = `<span class="plan-day-num">День ${d.day || di + 1}</span><span class="plan-day-topic">${escapeHtml(d.topic || '')}</span>`;
    card.appendChild(head);

    (d.tasks || []).forEach((task, ti) => {
      total++;
      const key = di + '-' + ti;
      const isDone = !!(plan.done && plan.done[key]);
      if (isDone) done++;
      const row = document.createElement('label');
      row.className = 'plan-task' + (isDone ? ' done' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isDone;
      cb.onchange = () => toggleTask(di, ti);
      const span = document.createElement('span');
      span.textContent = task;
      row.append(cb, span);
      card.appendChild(row);
    });

    const practice = document.createElement('button');
    practice.className = 'mini-btn plan-practice';
    practice.textContent = '🎙️ Практика с Lina';
    practice.onclick = () => startPlanPractice(d);
    card.appendChild(practice);

    planEl.days.appendChild(card);
  });

  const pct = total ? Math.round((done / total) * 100) : 0;
  planEl.barFill.style.width = pct + '%';
  planEl.progressText.textContent = `Выполнено ${done} из ${total} заданий · ${pct}%`;
}

function toggleTask(di, ti) {
  plan.done = plan.done || {};
  const key = di + '-' + ti;
  plan.done[key] = !plan.done[key];
  LS.set('met.plan', plan);
  renderPlan();
}

function startPlanPractice(day) {
  switchTab('talk');
  talkHistory = [];
  talkEl.log.innerHTML = '';
  const topic = day.topic || 'today';
  showHintBubble(`Тема дня: ${topic}. Нажми 🎤 и начни разговор на эту тему!`);
  setTalkStatus('Тема: ' + topic + ' — нажми 🎤');
  // Дадим Lina контекст темы через первую подсказку
  talkHistory.push({ role: 'assistant', content: `Let's practice talking about: ${topic}.` });
}

async function generatePlan() {
  const level = planEl.level.value;
  const focus = Array.from(planEl.focus.querySelectorAll('input:checked')).map((c) => c.value).join(', ') || 'разговорная речь';
  const minutes = planEl.minutes.value;
  const goal = planEl.goal.value.trim() || 'общее улучшение английского';

  planEl.generate.disabled = true;
  planEl.status.textContent = '✨ Lina составляет план… (это займёт несколько секунд)';

  const sys = 'You are an English tutor creating a personalized study plan. Respond with STRICT JSON ONLY — no markdown, no code fences, no comments, no text before or after. Schema: {"title": string, "days": [{"day": number, "topic": string, "tasks": [string, string, string]}]}. Make exactly 7 days. Each day has exactly 3 short, concrete tasks written in RUSSIAN telling the learner what to do (for example: выучить 5 слов о ..., произнести вслух 3 предложения про ..., сыграть диалог «в кафе»). The "topic" field is in Russian. Keep each day doable in about the given minutes. Tailor everything to the learner.';
  const usr = `Уровень: ${level}. Подтянуть: ${focus}. Минут в день: ${minutes}. Цель: ${goal}. Составь план ровно на 7 дней.`;

  try {
    let out = '';
    await streamChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], (c) => { out += c; });
    const obj = parsePlanJson(out);
    plan = { title: obj.title || 'Мой план', days: obj.days, done: {}, config: { level, focus, minutes, goal } };
    LS.set('met.plan', plan);
    planEl.status.textContent = '';
    renderPlan();
  } catch (err) {
    planEl.status.textContent = '⚠️ Не удалось составить план (' + (err.message || err) + '). Попробуй ещё раз.';
  }
  planEl.generate.disabled = false;
}

function parsePlanJson(text) {
  let t = (text || '').trim();
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  const obj = JSON.parse(t);
  if (!obj || !Array.isArray(obj.days) || obj.days.length === 0) throw new Error('пустой план');
  return obj;
}

/* ============================================================
   УЧЁБА: слова по темам + правила грамматики
   ============================================================ */
const learnEl = {};
let currentTheme = 0;
const aiWordsCache = {}; // key -> [words] сгенерированные ИИ

function initLearn() {
  learnEl.chips = $('#themeChips');
  learnEl.note = $('#themeNote');
  learnEl.list = $('#studyList');
  learnEl.info = $('#wordsInfo');
  learnEl.more = $('#moreWordsBtn');
  learnEl.grammarList = $('#grammarList');
  learnEl.grammarView = $('#grammarView');
  learnEl.grammarTitle = $('#grammarTitle');
  learnEl.grammarBody = $('#grammarBody');
  learnEl.grammarBack = $('#grammarBack');
  learnEl.grammarAsk = $('#grammarAsk');
  learnEl.grammarAnswer = $('#grammarAnswer');

  // Подвкладки
  document.querySelectorAll('#tab-learn .subtab').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#tab-learn .subtab').forEach((x) => x.classList.toggle('active', x === b));
      $('#sub-words').classList.toggle('hidden', b.dataset.sub !== 'words');
      $('#sub-grammar').classList.toggle('hidden', b.dataset.sub !== 'grammar');
    });
  });

  renderThemeChips();
  selectTheme(0);
  learnEl.more.addEventListener('click', moreWords);

  renderGrammarList();
  learnEl.grammarBack.addEventListener('click', () => {
    learnEl.grammarView.classList.add('hidden');
    learnEl.grammarList.classList.remove('hidden');
  });
}

function renderThemeChips() {
  learnEl.chips.innerHTML = '';
  (window.WORD_THEMES || []).forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'theme-chip' + (i === currentTheme ? ' active' : '');
    b.innerHTML = `${t.emoji} ${escapeHtml(t.title)}`;
    b.onclick = () => selectTheme(i);
    learnEl.chips.appendChild(b);
  });
}

function selectTheme(i) {
  currentTheme = i;
  renderThemeChips();
  const theme = window.WORD_THEMES[i];
  learnEl.note.textContent = theme.note || '';
  renderStudyList();
}

function renderStudyList() {
  const theme = window.WORD_THEMES[currentTheme];
  const words = theme.words.concat(aiWordsCache[theme.key] || []);
  learnEl.list.innerHTML = '';
  learnEl.info.textContent = words.length + ' слов';
  for (const w of words) {
    const card = document.createElement('div');
    card.className = 'study-card';
    const top = document.createElement('div');
    top.className = 'study-top';
    top.innerHTML = `<div class="study-en">${escapeHtml(w.en)}</div><div class="study-ru">${escapeHtml(w.ru)}</div>`;
    const ex = document.createElement('div');
    ex.className = 'study-ex';
    ex.textContent = w.ex || '';
    const acts = document.createElement('div');
    acts.className = 'study-acts';
    const play = document.createElement('button');
    play.className = 'mini-btn';
    play.textContent = '🔊';
    play.onclick = () => { unlockTTS(); speak(w.en.replace(/—/g, ',')); };
    const add = document.createElement('button');
    add.className = 'mini-btn';
    add.textContent = '＋ В словарь';
    add.onclick = () => { if (addWord(w.en, w.ru)) { add.textContent = '✓ Добавлено'; add.disabled = true; } };
    acts.append(play, add);
    card.append(top, ex, acts);
    learnEl.list.appendChild(card);
  }
}

async function moreWords() {
  const theme = window.WORD_THEMES[currentTheme];
  learnEl.more.disabled = true;
  const old = learnEl.more.textContent;
  learnEl.more.textContent = '✨ Генерирую…';
  try {
    let out = '';
    await streamChat([
      { role: 'system', content: 'You generate English vocabulary for a Russian learner. Respond with STRICT JSON only: an array of 8 objects {"en": string, "ru": string, "ex": string}. "en" = English word/phrase, "ru" = short Russian translation, "ex" = a short example sentence in English. No markdown, no extra text.' },
      { role: 'user', content: `Тема: "${theme.title}". Дай 8 НОВЫХ полезных слов по этой теме (не самых базовых).` },
    ], (c) => { out += c; });
    let t = out.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const s = t.indexOf('['), e = t.lastIndexOf(']');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
    const arr = JSON.parse(t);
    aiWordsCache[theme.key] = (aiWordsCache[theme.key] || []).concat(arr.filter((w) => w && w.en));
    renderStudyList();
  } catch {
    learnEl.info.textContent = 'Не удалось получить слова (сеть). Попробуй ещё раз.';
  }
  learnEl.more.disabled = false;
  learnEl.more.textContent = old;
}

function renderGrammarList() {
  learnEl.grammarList.innerHTML = '';
  (window.GRAMMAR_LESSONS || []).forEach((g) => {
    const card = document.createElement('button');
    card.className = 'grammar-card';
    card.innerHTML = `<span class="grammar-emoji">${g.emoji}</span><span>${escapeHtml(g.title)}</span><span class="grammar-arrow">›</span>`;
    card.onclick = () => openGrammar(g);
    learnEl.grammarList.appendChild(card);
  });
}

let currentLesson = null;
function openGrammar(g) {
  currentLesson = g;
  learnEl.grammarList.classList.add('hidden');
  learnEl.grammarView.classList.remove('hidden');
  learnEl.grammarTitle.textContent = g.emoji + ' ' + g.title;
  learnEl.grammarBody.innerHTML = renderMarkdown(g.body);
  learnEl.grammarAnswer.innerHTML = '';
  learnEl.grammarAsk.disabled = false;
  learnEl.grammarAsk.onclick = () => askGrammar(g);
  learnEl.grammarView.scrollTop = 0;
}

async function askGrammar(g) {
  learnEl.grammarAsk.disabled = true;
  learnEl.grammarAnswer.innerHTML = '<p class="muted">Lina печатает…</p>';
  try {
    let out = '';
    await streamChat([
      { role: 'system', content: 'You are a friendly English teacher explaining grammar to a Russian speaker. Explain in Russian, simply, with several clear English examples. Use short paragraphs.' },
      { role: 'user', content: `Объясни подробнее тему «${g.title}» с дополнительными примерами и типичными ошибками.` },
    ], (c) => { out += c; learnEl.grammarAnswer.innerHTML = renderMarkdown(out); });
  } catch {
    learnEl.grammarAnswer.innerHTML = '<p class="muted">Не удалось получить ответ (сеть).</p>';
  }
  learnEl.grammarAsk.disabled = false;
}

function initVoice() {
  initTalk();
  initPron();
  initPlan();
  initLearn();
}

document.addEventListener('DOMContentLoaded', init);
