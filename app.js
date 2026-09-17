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
};
let settings = Object.assign({}, defaultSettings, LS.get(KEYS.settings, {}));

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

  // Кнопки под ответом бота
  if (msg.role === 'assistant' && !opts.streaming) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    const speakBtn = document.createElement('button');
    speakBtn.className = 'mini-btn';
    speakBtn.textContent = '🔊 Озвучить';
    speakBtn.onclick = () => speak(stripMarkup(msg.content));
    actions.appendChild(speakBtn);
    wrap.appendChild(actions);
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
  wrap.innerHTML = `<div class="bubble">
    <p>⚠️ <strong>Не получилось получить ответ.</strong></p>
    <p>${escapeHtml(msg)}</p>
    <p>Проверь настройки (⚙️). Если используешь Ollama — убедись, что он запущен, а модель скачана
    (<code>ollama pull ${escapeHtml(settings.ollamaModel)}</code>). Подробнее в README.</p>
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
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.openaiKey,
      },
      body: JSON.stringify({ model: settings.openaiModel, messages, stream: true }),
    });
  } catch (e) {
    throw new Error('Не удалось подключиться к API по адресу ' + base + '. Проверь Base URL и интернет.');
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
  checkStatus();
}

document.addEventListener('DOMContentLoaded', init);
