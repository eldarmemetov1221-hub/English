/* ============================================================
   Данные для вкладки «Учёба»: слова по темам + правила грамматики.
   Всё на встроенном контенте (работает офлайн). Можно дополнять
   новыми словами через ИИ прямо в приложении.
   ============================================================ */

window.WORD_THEMES = [
  {
    key: 'basics', title: 'Базовые слова', emoji: '⭐',
    words: [
      { en: 'hello', ru: 'привет / здравствуйте', ex: 'Hello! Nice to meet you.' },
      { en: 'please', ru: 'пожалуйста (просьба)', ex: 'Water, please.' },
      { en: 'thank you', ru: 'спасибо', ex: 'Thank you for your help.' },
      { en: 'sorry', ru: 'извините / простите', ex: 'Sorry, I am late.' },
      { en: 'yes', ru: 'да', ex: 'Yes, I agree.' },
      { en: 'no', ru: 'нет', ex: 'No, thank you.' },
      { en: 'help', ru: 'помощь / помогать', ex: 'Can you help me?' },
      { en: 'excuse me', ru: 'извините (обратиться)', ex: 'Excuse me, where is the exit?' },
      { en: 'goodbye', ru: 'до свидания', ex: 'Goodbye, see you soon.' },
      { en: 'good morning', ru: 'доброе утро', ex: 'Good morning, everyone!' },
      { en: 'water', ru: 'вода', ex: 'I need some water.' },
      { en: 'friend', ru: 'друг', ex: 'She is my best friend.' },
    ],
  },
  {
    key: 'food', title: 'Еда и напитки', emoji: '🍎',
    words: [
      { en: 'bread', ru: 'хлеб', ex: 'I bought fresh bread.' },
      { en: 'coffee', ru: 'кофе', ex: 'I drink coffee every morning.' },
      { en: 'tea', ru: 'чай', ex: 'Would you like some tea?' },
      { en: 'apple', ru: 'яблоко', ex: 'An apple a day is healthy.' },
      { en: 'meat', ru: 'мясо', ex: 'I do not eat meat.' },
      { en: 'fish', ru: 'рыба', ex: 'The fish is very tasty.' },
      { en: 'rice', ru: 'рис', ex: 'I would like rice with chicken.' },
      { en: 'egg', ru: 'яйцо', ex: 'I eat two eggs for breakfast.' },
      { en: 'milk', ru: 'молоко', ex: 'There is no milk in the fridge.' },
      { en: 'sugar', ru: 'сахар', ex: 'No sugar in my coffee, please.' },
      { en: 'breakfast', ru: 'завтрак', ex: 'Breakfast is ready.' },
      { en: 'dinner', ru: 'ужин', ex: 'We have dinner at seven.' },
      { en: 'delicious', ru: 'вкусный', ex: 'This soup is delicious.' },
      { en: 'menu', ru: 'меню', ex: 'Can I see the menu, please?' },
    ],
  },
  {
    key: 'travel', title: 'Путешествия', emoji: '✈️',
    words: [
      { en: 'airport', ru: 'аэропорт', ex: 'We arrived at the airport early.' },
      { en: 'ticket', ru: 'билет', ex: 'I lost my ticket.' },
      { en: 'passport', ru: 'паспорт', ex: 'Show me your passport, please.' },
      { en: 'hotel', ru: 'отель / гостиница', ex: 'Our hotel is near the beach.' },
      { en: 'luggage', ru: 'багаж', ex: 'My luggage is heavy.' },
      { en: 'map', ru: 'карта', ex: 'Do you have a map of the city?' },
      { en: 'train', ru: 'поезд', ex: 'The train leaves at nine.' },
      { en: 'taxi', ru: 'такси', ex: 'Let us take a taxi.' },
      { en: 'station', ru: 'станция / вокзал', ex: 'Where is the train station?' },
      { en: 'left', ru: 'налево / левый', ex: 'Turn left at the corner.' },
      { en: 'right', ru: 'направо / правый', ex: 'The hotel is on the right.' },
      { en: 'straight', ru: 'прямо', ex: 'Go straight ahead.' },
      { en: 'how much', ru: 'сколько (стоит)', ex: 'How much is the ticket?' },
    ],
  },
  {
    key: 'work', title: 'Работа и офис', emoji: '💼',
    words: [
      { en: 'job', ru: 'работа (место)', ex: 'I have a new job.' },
      { en: 'meeting', ru: 'встреча / совещание', ex: 'The meeting is at ten.' },
      { en: 'email', ru: 'письмо / эл. почта', ex: 'I sent you an email.' },
      { en: 'boss', ru: 'начальник', ex: 'My boss is very kind.' },
      { en: 'colleague', ru: 'коллега', ex: 'She is my colleague.' },
      { en: 'salary', ru: 'зарплата', ex: 'The salary is good.' },
      { en: 'office', ru: 'офис', ex: 'I work in a big office.' },
      { en: 'deadline', ru: 'срок сдачи', ex: 'The deadline is Friday.' },
      { en: 'project', ru: 'проект', ex: 'We finished the project.' },
      { en: 'busy', ru: 'занятой', ex: 'I am very busy today.' },
      { en: 'to hire', ru: 'нанимать', ex: 'They want to hire me.' },
      { en: 'experience', ru: 'опыт', ex: 'I have five years of experience.' },
    ],
  },
  {
    key: 'home', title: 'Дом', emoji: '🏠',
    words: [
      { en: 'house', ru: 'дом', ex: 'They live in a small house.' },
      { en: 'room', ru: 'комната', ex: 'My room is on the second floor.' },
      { en: 'kitchen', ru: 'кухня', ex: 'She is cooking in the kitchen.' },
      { en: 'door', ru: 'дверь', ex: 'Please close the door.' },
      { en: 'window', ru: 'окно', ex: 'Open the window, it is hot.' },
      { en: 'table', ru: 'стол', ex: 'The keys are on the table.' },
      { en: 'chair', ru: 'стул', ex: 'Take a chair and sit down.' },
      { en: 'bed', ru: 'кровать', ex: 'I go to bed at eleven.' },
      { en: 'bathroom', ru: 'ванная / туалет', ex: 'Where is the bathroom?' },
      { en: 'key', ru: 'ключ', ex: 'I cannot find my keys.' },
      { en: 'clean', ru: 'чистый / убирать', ex: 'The room is clean.' },
      { en: 'light', ru: 'свет / лампа', ex: 'Turn off the light, please.' },
    ],
  },
  {
    key: 'time', title: 'Время и числа', emoji: '⏰',
    words: [
      { en: 'today', ru: 'сегодня', ex: 'What are you doing today?' },
      { en: 'tomorrow', ru: 'завтра', ex: 'See you tomorrow.' },
      { en: 'yesterday', ru: 'вчера', ex: 'I called you yesterday.' },
      { en: 'morning', ru: 'утро', ex: 'I run in the morning.' },
      { en: 'evening', ru: 'вечер', ex: 'We met in the evening.' },
      { en: 'week', ru: 'неделя', ex: 'I work five days a week.' },
      { en: 'month', ru: 'месяц', ex: 'Next month I am on holiday.' },
      { en: 'year', ru: 'год', ex: 'Happy New Year!' },
      { en: 'hour', ru: 'час', ex: 'The lesson lasts one hour.' },
      { en: 'minute', ru: 'минута', ex: 'Wait a minute, please.' },
      { en: 'early', ru: 'рано', ex: 'I woke up early.' },
      { en: 'late', ru: 'поздно', ex: 'Do not be late.' },
    ],
  },
  {
    key: 'verbs', title: 'Частые глаголы', emoji: '🏃',
    words: [
      { en: 'to be', ru: 'быть', ex: 'I want to be a doctor.' },
      { en: 'to have', ru: 'иметь', ex: 'I have a question.' },
      { en: 'to do', ru: 'делать', ex: 'What do you do?' },
      { en: 'to go', ru: 'идти / ехать', ex: 'Let us go home.' },
      { en: 'to make', ru: 'делать / создавать', ex: 'I want to make a cake.' },
      { en: 'to take', ru: 'брать', ex: 'Take an umbrella.' },
      { en: 'to get', ru: 'получать / становиться', ex: 'I need to get a taxi.' },
      { en: 'to see', ru: 'видеть', ex: 'I can see the sea.' },
      { en: 'to come', ru: 'приходить', ex: 'Come here, please.' },
      { en: 'to know', ru: 'знать', ex: 'I do not know his name.' },
      { en: 'to want', ru: 'хотеть', ex: 'I want to learn English.' },
      { en: 'to give', ru: 'давать', ex: 'Give me a chance.' },
    ],
  },
  {
    key: 'irregular', title: 'Неправильные глаголы (по временам)', emoji: '🔁',
    note: 'Форма: сейчас → прошлое → 3-я форма (после have/has). Например: I go → I went → I have gone.',
    words: [
      { en: 'go — went — gone', ru: 'идти', ex: 'Yesterday I went home. I have gone there before.' },
      { en: 'do — did — done', ru: 'делать', ex: 'I did my homework. It is done.' },
      { en: 'have — had — had', ru: 'иметь', ex: 'I had a car. I have had it for years.' },
      { en: 'see — saw — seen', ru: 'видеть', ex: 'I saw him. I have seen this film.' },
      { en: 'take — took — taken', ru: 'брать', ex: 'She took my pen. I have taken the bus.' },
      { en: 'come — came — come', ru: 'приходить', ex: 'He came late. They have come already.' },
      { en: 'get — got — got', ru: 'получать', ex: 'I got a gift. I have got a message.' },
      { en: 'make — made — made', ru: 'делать', ex: 'I made tea. I have made a mistake.' },
      { en: 'know — knew — known', ru: 'знать', ex: 'I knew the answer. I have known her for years.' },
      { en: 'give — gave — given', ru: 'давать', ex: 'He gave me a book. I have given up.' },
      { en: 'eat — ate — eaten', ru: 'есть', ex: 'I ate lunch. I have eaten too much.' },
      { en: 'write — wrote — written', ru: 'писать', ex: 'She wrote a letter. I have written it.' },
    ],
  },
  {
    key: 'adjectives', title: 'Прилагательные и эмоции', emoji: '😊',
    words: [
      { en: 'happy', ru: 'счастливый', ex: 'I am happy to see you.' },
      { en: 'sad', ru: 'грустный', ex: 'Why are you sad?' },
      { en: 'tired', ru: 'уставший', ex: 'I am very tired today.' },
      { en: 'angry', ru: 'злой / сердитый', ex: 'Please do not be angry.' },
      { en: 'good', ru: 'хороший', ex: 'This is a good idea.' },
      { en: 'bad', ru: 'плохой', ex: 'The weather is bad.' },
      { en: 'big', ru: 'большой', ex: 'They have a big dog.' },
      { en: 'small', ru: 'маленький', ex: 'I live in a small town.' },
      { en: 'hot', ru: 'горячий / жаркий', ex: 'The coffee is hot.' },
      { en: 'cold', ru: 'холодный', ex: 'It is cold outside.' },
      { en: 'easy', ru: 'лёгкий (простой)', ex: 'This task is easy.' },
      { en: 'difficult', ru: 'трудный', ex: 'English is not difficult.' },
    ],
  },
];

/* ============================================================
   Правила грамматики (простое объяснение на русском + примеры)
   ============================================================ */
window.GRAMMAR_LESSONS = [
  {
    key: 'articles', title: 'Артикли: a / an / the', emoji: '📌',
    body: `**Артикли** ставятся перед существительным.

**a / an** — «какой-то один, любой» (неопределённый). Используем, когда говорим о чём-то впервые или неважно, о каком именно.
- **a** — перед согласным звуком: *a car, a dog, a book*.
- **an** — перед гласным звуком: *an apple, an hour, an idea*.

**the** — «тот самый, конкретный» (определённый). Используем, когда собеседник понимает, о чём речь, или предмет уже упоминали.
- *I bought **a** car. **The** car is red.* (сначала «какая-то», потом «та самая»)
- *the sun, the moon* — единственные в своём роде.

**Без артикля** — с множественным числом в общем смысле и с неисчисляемым: *I like **coffee**. **Dogs** are friendly.*`,
  },
  {
    key: 'to-be', title: 'Глагол to be (am / is / are)', emoji: '🔷',
    body: `**to be** = «быть, являться». В русском часто опускается («Я студент»), в английском — обязателен.

- **I am** (I'm) — я есть
- **He / She / It is** (is) — он/она/оно есть
- **We / You / They are** (are) — мы/вы/они есть

Примеры:
- *I **am** a student.* — Я студент.
- *She **is** happy.* — Она счастлива.
- *They **are** at home.* — Они дома.

Отрицание: добавляем **not** → *I am **not** tired. He **is not** (isn't) here.*
Вопрос: ставим глагол вперёд → ***Are** you ready? **Is** she a doctor?*`,
  },
  {
    key: 'present-simple', title: 'Present Simple — регулярные действия', emoji: '🔁',
    body: `**Present Simple** — то, что происходит **обычно, регулярно, всегда** (факты, привычки, расписание).

Форма: обычный глагол. Но для **he / she / it** добавляем **-s**!
- *I **work**. You **work**. We **work**.*
- *He **works**. She **plays**. It **rains**.*

Слова-маркеры: *always, usually, often, sometimes, every day, never.*
- *I **drink** coffee every morning.*
- *She **goes** to school every day.*

Отрицание и вопрос — через **do / does** (does для he/she/it), и тогда **-s исчезает**:
- *I **do not** (don't) like fish.*
- *He **does not** (doesn't) like fish.*
- ***Do** you speak English? **Does** she live here?*`,
  },
  {
    key: 'present-continuous', title: 'Present Continuous — сейчас, в процессе', emoji: '⏳',
    body: `**Present Continuous** — действие происходит **прямо сейчас** или в текущий период.

Форма: **am / is / are + глагол-ing**.
- *I **am working** now.* — Я работаю сейчас.
- *She **is sleeping**.* — Она спит.
- *They **are playing** football.*

Слова-маркеры: *now, right now, at the moment, look!, listen!*

Сравни:
- *I **work** in a bank.* (вообще, работа) — Present Simple
- *I **am working** right now.* (сейчас, в процессе) — Present Continuous`,
  },
  {
    key: 'past-simple', title: 'Past Simple — прошедшее время', emoji: '⏮️',
    body: `**Past Simple** — действие **закончилось в прошлом**.

**Правильные глаголы**: добавляем **-ed**.
- *work → work**ed**, play → play**ed**, want → want**ed***
- *I **worked** yesterday.*

**Неправильные глаголы** — форму нужно запомнить (см. тему «Неправильные глаголы»):
- *go → **went**, see → **saw**, have → **had**, make → **made***
- *I **went** to the cinema. She **saw** a film.*

Слова-маркеры: *yesterday, last week, ago, in 2020.*

Отрицание и вопрос — через **did** (и глагол возвращается в начальную форму!):
- *I **did not** (didn't) **go**.* (не *didn't went*!)
- ***Did** you **see** it?*`,
  },
  {
    key: 'future', title: 'Будущее: will и going to', emoji: '⏭️',
    body: `Два основных способа сказать о будущем.

**will + глагол** — решение в момент речи, обещание, предсказание.
- *I **will call** you later.*
- *It **will rain** tomorrow.*
- Отрицание: *I **will not** (won't) go.*

**be going to + глагол** — план, намерение (уже решил заранее).
- *I **am going to** visit my parents.*
- *We **are going to** buy a house.*

Коротко: **will** — «пожалуй, сделаю / точно будет», **going to** — «я собираюсь, уже планирую».`,
  },
  {
    key: 'plural', title: 'Множественное число', emoji: '#️⃣',
    body: `Обычно добавляем **-s**: *cat → cat**s**, book → book**s**.*

**-es** — после s, x, ch, sh, o: *box → box**es**, watch → watch**es**, potato → potato**es**.*

**y → ies** (если перед y согласная): *city → cit**ies**, baby → bab**ies**.* (но: *boy → boys*)

**Особые (запомнить):**
- *man → **men**, woman → **women***
- *child → **children***
- *foot → **feet**, tooth → **teeth***
- *person → **people***
- *fish → **fish**, sheep → **sheep*** (не меняются)`,
  },
  {
    key: 'prepositions', title: 'Предлоги in / on / at', emoji: '📍',
    body: `**Время:**
- **at** — точное время: *at 7 o'clock, at night.*
- **on** — дни и даты: *on Monday, on July 5.*
- **in** — месяцы, годы, части суток: *in May, in 2025, in the morning.*

**Место:**
- **at** — точка / конкретное место: *at the door, at the station, at home.*
- **on** — на поверхности: *on the table, on the wall.*
- **in** — внутри: *in the box, in the room, in the city.*

Примеры: *I will meet you **at** the station **on** Monday **in** the morning.*`,
  },
  {
    key: 'questions', title: 'Как задавать вопросы', emoji: '❓',
    body: `**Общий вопрос** (да/нет) — вспомогательный глагол вперёд:
- *to be:* ***Are** you ok? **Is** he home?*
- *Present Simple:* ***Do** you like tea? **Does** she work?*
- *Past Simple:* ***Did** you go?*

**Специальный вопрос** — вопросительное слово + тот же порядок:
- **What** (что), **Where** (где), **When** (когда), **Who** (кто), **Why** (почему), **How** (как).
- ***Where do** you live? **What is** your name? **How did** you do it?*

Схема: **(Вопрос-слово) + вспом. глагол + подлежащее + основной глагол.**`,
  },
  {
    key: 'modals', title: 'Модальные: can / must / should', emoji: '🔑',
    body: `Модальные глаголы ставятся перед основным глаголом **без частицы to** и без **-s**.

- **can** — умею / могу / можно: *I **can** swim. **Can** I help you?*
- **can't** — не могу / нельзя: *You **can't** park here.*
- **must** — должен (обязательно): *You **must** stop at a red light.*
- **should** — следует, стоит (совет): *You **should** rest. You **shouldn't** smoke.*
- **have to** — вынужден / надо: *I **have to** work tomorrow.*

Примеры: *I **can** speak a little English. You **should** practise every day.*`,
  },
];
