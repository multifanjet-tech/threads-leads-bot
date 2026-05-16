# Threads Leads Bot

Автоматический бот для поиска потенциальных клиентов в Threads по ключевым словам.  
Анализирует посты через Claude AI, оценивает горячесть лида и отправляет уведомления в Telegram.

## Стек

- **Node.js** 18+ (ES Modules)
- **Apify** — скрапинг Threads
- **Claude AI** (Haiku) — анализ постов
- **Telegraf** — Telegram Bot
- **better-sqlite3** — локальная БД
- **node-cron** — планировщик

## Быстрый старт

### 1. Клонировать и установить зависимости

```bash
git clone https://github.com/your/threads-leads-bot.git
cd threads-leads-bot
npm install
```

### 2. Создать `.env` из примера

```bash
cp .env.example .env
```

Заполнить все переменные в `.env` (инструкции ниже).

### 3. Запустить

```bash
npm start
```

---

## Получение токенов

### Apify API Token

1. Зайти на [console.apify.com](https://console.apify.com)
2. Регистрация → Settings → Integrations
3. Скопировать **API token**
4. Вставить в `.env` как `APIFY_API_TOKEN`

> Actor по умолчанию: `apidojo/threads-scraper`  
> Найти другие акторы можно на [apify.com/store](https://apify.com/store) → поиск "threads"

### Anthropic Claude API Key

1. Зайти на [console.anthropic.com](https://console.anthropic.com)
2. Settings → API Keys → Create Key
3. Вставить в `.env` как `ANTHROPIC_API_KEY`

> Используется модель `claude-haiku-4-5-20251001` — самая быстрая и дешёвая

### Telegram Bot Token

1. Открыть [@BotFather](https://t.me/BotFather) в Telegram
2. Отправить `/newbot`
3. Дать имя боту и username
4. Скопировать полученный токен → `TELEGRAM_BOT_TOKEN`

### Telegram Chat ID

**Для личных сообщений:**
1. Написать [@userinfobot](https://t.me/userinfobot)
2. Он вернёт ваш ID — вставить в `TELEGRAM_CHAT_ID`

**Для группы/канала:**
1. Добавить бота в группу как администратора
2. Написать в группе любое сообщение
3. Открыть: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Найти `"chat":{"id": -100xxxxxxxxx}` — это и есть Chat ID

---

## Структура проекта

```
threads-leads-bot/
├── src/
│   ├── index.js       # Точка входа
│   ├── config.js      # Конфигурация и ключевые слова
│   ├── logger.js      # Логирование
│   ├── database.js    # SQLite (better-sqlite3)
│   ├── scraper.js     # Apify Threads Scraper
│   ├── analyzer.js    # Claude AI анализ
│   ├── telegram.js    # Telegram уведомления
│   └── scheduler.js   # Cron планировщик
├── data/              # Создаётся автоматически (SQLite файл)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Настройка `.env`

| Переменная | Описание | Обязательна |
|---|---|---|
| `APIFY_API_TOKEN` | Токен Apify | ✅ |
| `APIFY_ACTOR_ID` | ID актора (default: apidojo/threads-scraper) | |
| `APIFY_MAX_ITEMS` | Макс. постов за запрос (default: 50) | |
| `ANTHROPIC_API_KEY` | Ключ Claude AI | ✅ |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | ✅ |
| `TELEGRAM_CHAT_ID` | Chat ID для уведомлений | ✅ |
| `MIN_SCORE` | Минимальный score для отправки (default: 6) | |
| `CHECK_INTERVAL_MINUTES` | Интервал проверки в минутах (default: 10) | |
| `DB_PATH` | Путь к SQLite файлу (default: ./data/leads.db) | |
| `LOG_LEVEL` | debug / info / warn / error (default: info) | |

---

## Деплой на VPS

### Ubuntu/Debian

```bash
# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонировать проект
git clone https://github.com/your/threads-leads-bot.git
cd threads-leads-bot
npm install

# Настроить окружение
cp .env.example .env
nano .env   # заполнить все токены

# Запустить через PM2
npm install -g pm2
pm2 start src/index.js --name threads-bot
pm2 save
pm2 startup   # автозапуск при перезагрузке
```

### Команды PM2

```bash
pm2 logs threads-bot        # смотреть логи
pm2 restart threads-bot     # перезапустить
pm2 stop threads-bot        # остановить
pm2 status                  # статус процессов
```

### Docker (опционально)

```bash
# Создать Dockerfile
cat > Dockerfile <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY src/ ./src/
CMD ["node", "src/index.js"]
EOF

# Собрать и запустить
docker build -t threads-leads-bot .
docker run -d --name threads-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  threads-leads-bot
```

---

## Ключевые слова

Бот ищет посты по следующим запросам:

**Русский:** ищу таргетолога · нужен таргетолог · meta ads · facebook ads · нужен маркетолог

**Украинский:** шукаю таргетолога · потрібен таргетолог · потрібен маркетолог · шукаю маркетолога · таргетована реклама · хто налаштовує рекламу · потрібна реклама

Добавить новые ключевые слова можно в `src/config.js` в массиве `KEYWORDS`.

---

## Пример Telegram уведомления

```
🔥🔥 Новый лид найден!

Score: 8/10 🔥🔥
Статус: ✅ Лид
Ниша: E-commerce / интернет-магазин

👤 Username: @example_user
🔑 Ключевое слово: нужен таргетолог

📝 Текст поста:
Ищу специалиста по таргетированной рекламе для моего магазина одежды...

🤖 AI анализ:
Автор явно ищет таргетолога для интернет-магазина. Горячий лид — указывает на конкретную потребность.

🔗 Открыть пост
```

---

## Примерная стоимость

| Сервис | Цена |
|---|---|
| Apify | ~$5/мес (Free tier: 5$ кредитов) |
| Claude Haiku | ~$0.001 за анализ поста |
| VPS (минимальный) | $3-5/мес |

**Итого:** ~$10-15/месяц при активном использовании
