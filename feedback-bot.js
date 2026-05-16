// ══════════════════════════════════════════════════════
//  ПРОРЫВ — Бот обратной связи с возможностью ответа
//  Запуск: node feedback-bot.js
// ══════════════════════════════════════════════════════

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.FEEDBACK_BOT_TOKEN;
const ADMIN_ID  = Number(process.env.FEEDBACK_ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
  console.error('❌ Укажите FEEDBACK_BOT_TOKEN и FEEDBACK_ADMIN_ID в .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Когда админ нажал "Ответить" — сохраняем userId получателя
const awaitingReply = {}; // { adminId: targetUserId }

console.log('🤖 Бот обратной связи запущен...');

// ── /start ──────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || 'друг';
  bot.sendMessage(msg.chat.id,
    `Добро пожаловать в бот анонимной обратной связи мужского клуба «ПРОРЫВ».\n\n` +
    `Здесь вы можете написать любое пожелание, идею, замечание или вопрос. Мы внимательно читаем каждое сообщение и стараемся ответить в кратчайшие сроки.\n\n` +
    `Все сообщения полностью анонимны. Однако если вы хотите, чтобы мы знали к кому обратиться — можете указать своё имя в сообщении.`
  );
});

// ── Входящее сообщение ──────────────────────────────────
bot.on('message', async (msg) => {
  const userId = msg.chat.id;
  const text   = msg.text || '';

  if (text.startsWith('/')) return;

  // Если АДМИН сейчас в режиме ответа — отправляем его ответ пользователю
  if (userId === ADMIN_ID && awaitingReply[ADMIN_ID]) {
    const targetUserId = awaitingReply[ADMIN_ID];
    delete awaitingReply[ADMIN_ID];

    try {
      await bot.sendMessage(targetUserId,
        `💬 *Ответ от команды ПРОРЫВ:*\n\n${text}`,
        { parse_mode: 'Markdown' }
      );
      bot.sendMessage(ADMIN_ID, '✅ Ответ отправлен.');
    } catch {
      bot.sendMessage(ADMIN_ID, '❌ Не удалось отправить — пользователь мог заблокировать бота.');
    }
    return;
  }

  // Обычное сообщение от пользователя
  const time = new Date().toLocaleString('ru', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Подтверждение пользователю
  bot.sendMessage(userId,
    `✅ Сообщение получено. Мы ответим если потребуется.\n\n_Спасибо за обратную связь!_`,
    { parse_mode: 'Markdown' }
  );

  // Отправляем админу с кнопкой "Ответить"
  await bot.sendMessage(ADMIN_ID,
    `📩 *Новая обратная связь*\n\n${text}\n\n_${time} · анонимно_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '💬 Ответить', callback_data: `reply_${userId}` }
        ]]
      }
    }
  );
});

// ── Нажатие кнопки "Ответить" ───────────────────────────
bot.on('callback_query', async (query) => {
  if (query.from.id !== ADMIN_ID) {
    bot.answerCallbackQuery(query.id, { text: 'Нет доступа.' });
    return;
  }

  if (query.data?.startsWith('reply_')) {
    const targetUserId = Number(query.data.replace('reply_', ''));
    awaitingReply[ADMIN_ID] = targetUserId;

    bot.answerCallbackQuery(query.id);
    bot.sendMessage(ADMIN_ID,
      `✏️ Напишите ответ следующим сообщением — он будет доставлен анонимно.`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ── Ошибки ──────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});
