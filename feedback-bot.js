// ══════════════════════════════════════════════════════
//  ПРОРЫВ — Бот обратной связи
//  Запуск: node feedback-bot.js
// ══════════════════════════════════════════════════════

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.FEEDBACK_BOT_TOKEN; // токен этого бота
const ADMIN_ID  = process.env.FEEDBACK_ADMIN_ID;  // ваш Telegram ID (куда падают сообщения)

if (!BOT_TOKEN || !ADMIN_ID) {
  console.error('❌ Укажите FEEDBACK_BOT_TOKEN и FEEDBACK_ADMIN_ID в .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Бот обратной связи запущен...');

// ── /start ──────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || 'друг';

  bot.sendMessage(msg.chat.id,
    `Привет, ${name}! 👋\n\n` +
    `Это анонимная обратная связь клуба *ПРОРЫВ*.\n\n` +
    `Напиши любое сообщение — пожелание, идею, замечание или вопрос. Мы обязательно прочитаем.\n\n` +
    `_Все сообщения полностью анонимны — мы не знаем кто ты._`,
    { parse_mode: 'Markdown' }
  );
});

// ── Любое другое сообщение = обратная связь ─────────────
bot.on('message', (msg) => {
  // Игнорируем команды
  if (msg.text?.startsWith('/')) return;

  const userId = msg.chat.id;

  // 1) Подтверждение пользователю
  bot.sendMessage(userId,
    `✅ Спасибо! Ваше сообщение получено.\n\n_Мы читаем каждое обращение._`,
    { parse_mode: 'Markdown' }
  );

  // 2) Пересылаем администратору — БЕЗ имени и ID отправителя
  const text = msg.text || '[не текстовое сообщение]';
  const time  = new Date().toLocaleString('ru', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  bot.sendMessage(ADMIN_ID,
    `📩 *Новая обратная связь*\n\n` +
    `${text}\n\n` +
    `_${time} · анонимно_`,
    { parse_mode: 'Markdown' }
  );
});

// ── Ошибки ──────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});
