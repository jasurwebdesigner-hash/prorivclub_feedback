require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.FEEDBACK_BOT_TOKEN;
const ADMIN_ID  = Number(process.env.FEEDBACK_ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
  console.error('❌ Укажите FEEDBACK_BOT_TOKEN и FEEDBACK_ADMIN_ID в .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: { timeout: 10, allowed_updates: ['message', 'callback_query'] }
  }
});

// Когда админ нажал "Ответить"
const awaitingReply = {};
// Защита от дублирования — запоминаем обработанные update_id
const processedUpdates = new Set();

console.log('🤖 Бот обратной связи запущен...');

bot.on('message', async (msg) => {
  // Защита от дублей
  if (processedUpdates.has(msg.message_id)) return;
  processedUpdates.add(msg.message_id);
  // Чистим старые ID чтобы не копилось
  if (processedUpdates.size > 1000) processedUpdates.clear();

  const userId = msg.chat.id;
  const text   = msg.text || '';

  // /start
  if (text === '/start') {
    bot.sendMessage(userId,
      `Добро пожаловать в бот анонимной обратной связи мужского клуба «ПРОРЫВ».\n\n` +
      `Здесь вы можете написать любое пожелание, идею, замечание или вопрос. Мы внимательно читаем каждое сообщение и стараемся ответить в кратчайшие сроки.\n\n` +
      `Все сообщения полностью анонимны. Однако если вы хотите, чтобы мы знали к кому обратиться — можете указать своё имя в сообщении.`
    );
    return;
  }

  // Игнорируем остальные команды
  if (text.startsWith('/')) return;

  // Если нет текста
  if (!text.trim()) return;

  // Если АДМИН в режиме ответа
  if (userId === ADMIN_ID && awaitingReply[ADMIN_ID]) {
    const targetUserId = awaitingReply[ADMIN_ID];
    delete awaitingReply[ADMIN_ID];
    try {
      await bot.sendMessage(targetUserId, `💬 Ответ от команды ПРОРЫВ:\n\n${text}`);
      bot.sendMessage(ADMIN_ID, '✅ Ответ отправлен.');
    } catch {
      bot.sendMessage(ADMIN_ID, '❌ Не удалось отправить — пользователь мог заблокировать бота.');
    }
    return;
  }

  // Сообщения от самого админа не пересылаем
  if (userId === ADMIN_ID) {
    console.log(`Сообщение от админа (${userId}), игнорируем`);
    return;
  }

  const time = new Date().toLocaleString('ru', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  console.log(`Новое сообщение от ${userId}, отправляем админу ${ADMIN_ID}`);

  // Одно подтверждение пользователю
  bot.sendMessage(userId, `✅ Сообщение получено. Мы прочитаем и ответим если потребуется.`);

  // Пересылаем админу
  try {
    await bot.sendMessage(ADMIN_ID,
      `📩 Новая обратная связь\n\n${text}\n\n${time} · анонимно`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: '💬 Ответить', callback_data: `reply_${userId}` }]]
        }
      }
    );
    console.log(`✅ Сообщение успешно отправлено админу ${ADMIN_ID}`);
  } catch (err) {
    console.error(`❌ Ошибка отправки админу ${ADMIN_ID}:`, err.message);
  }
});

bot.on('callback_query', async (query) => {
  if (query.from.id !== ADMIN_ID) {
    bot.answerCallbackQuery(query.id, { text: 'Нет доступа.' });
    return;
  }
  if (query.data?.startsWith('reply_')) {
    const targetUserId = Number(query.data.replace('reply_', ''));
    awaitingReply[ADMIN_ID] = targetUserId;
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(ADMIN_ID, `✏️ Напишите ответ следующим сообщением — он будет доставлен анонимно.`);
  }
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));
