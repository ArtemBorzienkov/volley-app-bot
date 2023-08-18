import {
  CRUD,
  TRAINING_HOURS,
  TimeConfig,
  WEEK_DAYS,
  getHoursOptions,
  getIsEmptyCfg,
  getIsNotEmptyCfg,
  getKeyBoardOption,
  getMembersMsg,
  getMembersOptions,
  getReplaceMembMsg,
  getTrainingDate,
  getWeekDay,
  isDev,
} from '../utils/helpers';
import { handleUser } from '../user';
import { API } from '../utils/api';
import { Config, Training } from '../utils/types';
import { configHandler } from '../config';
import { createTraining, getTraining, updateTraining } from '../training';
import { addNewMember, getMembers, removeMembers } from '../member';

const uniqid = require('uniqid');

const TelegramBot = require('node-telegram-bot-api');

const testChatId = '-1001928873227';

class Bot {
  private _bot: any;
  private _minsTillPost: number;
  private _timeForPostingUtc = 8;

  init(token) {
    this._bot = new TelegramBot(token, {
      polling: true,
      added_to_attachment_menu: true,
    });

    this.registerHandlers();
    this.startTimer();
  }

  async postRegistrationMsg(data: Config) {
    const eventDate = getTrainingDate(data);
    const training = await createTraining(data, eventDate);

    this._bot.sendMessage(
      isDev() ? testChatId : data.chat_id,
      `👋 Всім привіт! \n✍️ Відкрито запис на тренування\n📆 Коли? ${data.day} ${eventDate} ${data.time}\n📍 Де? ${data.location}\n👥 Кількість учасників: ${data.max}`,
      {
        reply_markup: {
          inline_keyboard: [
            [getKeyBoardOption(training.id, 1)],
            [getKeyBoardOption(training.id, 2), getKeyBoardOption(training.id, 3), getKeyBoardOption(training.id, 4)],
            [getKeyBoardOption(training.id, 0)],
          ],
        },
        message_thread_id: data.isForum && data.topic_id ? data.topic_id : null,
      },
    );
  }

  async runPostingWorker() {
    const config = await configHandler.fetchAll();
    const dayNum = new Date().getDay();
    const todayWeekDay = WEEK_DAYS[dayNum];
    console.log(`start posting, today is ${todayWeekDay}`);
    const arrPosting = config.filter((cfg) => cfg.publish_day === todayWeekDay).map((cfg) => ({ ...cfg, chat_id: isDev() ? testChatId : cfg.chat_id }));
    arrPosting.forEach((data) => this.postRegistrationMsg(data));
  }

  registerHandlers() {
    this._bot.onText(/\/start$/, (msg) => {
      const { from, chat } = msg;
      handleUser({
        id: String(from.id),
        firstName: from.first_name,
        lastName: from.last_name || '',
        userName: from.username || '',
        email: '',
        isPremium: from.is_premium || false,
      });

      if (chat.type !== 'private') {
        return;
      }

      this._bot.sendMessage(
        chat.id,
        `Вітаю ${chat.first_name}!\nДля того щоб підключити бота спочатку додайте його до своєї групи і надайте права адміна.\nПісля цього натисніть /create для створення графіку тренувань`,
      );
    });

    this._bot.onText(/\/create$/, async (msg) => {
      const { from, chat } = msg;

      if (chat.type !== 'private') {
        return;
      }
      const configs = await API.CONFIG.GET_BY_COACH_ID(String(from.id));
      if (configs.filter(getIsEmptyCfg).length === 0) {
        this._bot.sendMessage(chat.id, 'Нажаль доступних груп для створення графіку тренувань не знайдено');
        return;
      }

      this._bot.sendMessage(chat.id, `Виберіть групу для створення графіку тренувань`, {
        reply_markup: {
          inline_keyboard: configs.filter(getIsEmptyCfg).map((cfg) => [
            {
              text: `"${cfg.chat_title}"`,
              callback_data: JSON.stringify({ id: cfg.chat_id, title: cfg.chat_title }),
            },
          ]),
        },
      });
    });

    this._bot.onText(/\/delete$/, async (msg) => {
      const { from, chat } = msg;

      if (chat.type !== 'private') {
        return;
      }
      const configs = await API.CONFIG.GET_BY_COACH_ID(String(from.id));
      if (configs.filter(getIsNotEmptyCfg).length === 0) {
        this._bot.sendMessage(chat.id, 'Нажаль доступних груп для видалення графіку тренувань не знайдено');
        return;
      }

      this._bot.sendMessage(chat.id, `Виберіть групу для видалення графіку тренувань`, {
        reply_markup: {
          inline_keyboard: configs.filter(getIsNotEmptyCfg).map((cfg) => [
            {
              text: `"${cfg.chat_title}" ${cfg.location} ${cfg.day} ${cfg.time}`,
              callback_data: JSON.stringify({ id: cfg.id, instruction: CRUD.DELETE }),
            },
          ]),
        },
      });
    });

    this._bot.on('message', async (msg) => {
      const { new_chat_member, left_chat_participant, chat, from, text } = msg;

      // join to a new chat
      if (new_chat_member && new_chat_member.id === Number(process.env.BOT_ID)) {
        console.log(`bot joined to a new chat: ${chat.title}`);
        API.CONFIG.CREATE({
          id: uniqid(),
          chat_id: String(chat.id),
          chat_title: chat.title,
          coach_id: String(from.id),
          day: '',
          time: '',
          max: 0,
          location: '',
          isForum: chat.is_forum,
          publish_day: '',
          topic_id: 0,
        });
        return;
      }

      // remove from a new chat
      if (left_chat_participant && left_chat_participant.id === Number(process.env.BOT_ID)) {
        console.log(`bot removed from chat: ${chat.title}`);
        configHandler.deleteConfig(chat.id, true);
        return;
      }

      if (chat.type !== 'private') {
        return;
      }

      // check for set up location
      const notCompledConfig = configHandler.getNotCompletedConfig(String(from.id));
      if (notCompledConfig) {
        const createdConfig = configHandler.buildConfig(notCompledConfig.id, { location: text });
        await configHandler.saveConfig(createdConfig.id);
        this._bot.sendMessage(
          chat.id,
          `Тренування створено:\n📆 Коли? ${createdConfig.day}, ${createdConfig.time}\n📍 Де? ${createdConfig.location}\n👥 Кількість учасників: ${createdConfig.max}`,
        );
      }
    });

    this._bot.on('callback_query', async (q) => {
      const { from, message } = q;
      const chatId = message.chat.id;
      const topicId = message.message_thread_id || 0;
      const data = JSON.parse(q.data);

      if (data.instruction === CRUD.DELETE) {
        configHandler.deleteConfig(data.id, false);
        this._bot.sendMessage(chatId, 'Тренування видалено');
        return;
      }

      if (data.train_id) {
        if (data.value === 0) {
          const training = await getTraining(data.train_id);
          const oldMembs = await getMembers(data.train_id);
          const newMembs = await removeMembers(q.from, oldMembs, data.train_id);

          this._bot.editMessageText(getMembersMsg(newMembs, training.maxMembers), {
            chat_id: chatId,
            message_id: training.msg,
          });

          const lenOfOldMembs = oldMembs.length;
          const hasReserv = lenOfOldMembs > training.maxMembers;
          if (hasReserv) {
            const rmUser = oldMembs.find((m) => m.userId === String(from.id));
            const indexOfRmUser = oldMembs.indexOf(rmUser);
            const rmMembsCount = lenOfOldMembs - newMembs.length;
            const membsFromReserv = [...newMembs].splice(indexOfRmUser, rmMembsCount);
            this._bot.sendMessage(chatId, getReplaceMembMsg(rmUser, training.date, membsFromReserv), { message_thread_id: topicId ? topicId : null });
          }
        } else {
          const training = await getTraining(data.train_id);
          const oldMembs = await getMembers(data.train_id);
          const newMembs = await addNewMember(q.from, training, oldMembs, data.value);

          if (!training.msg) {
            this._bot.sendMessage(chatId, getMembersMsg(newMembs, training.maxMembers), { message_thread_id: topicId ? topicId : null }).then((resp) => {
              updateTraining({ ...training, msg: resp.message_id } as Training);
            });
          } else {
            this._bot.editMessageText(getMembersMsg(newMembs, training.maxMembers), {
              chat_id: chatId,
              message_id: training.msg,
            });
          }
        }
      }

      if (data.id) {
        if (data.max) {
          configHandler.buildConfig(data.id, { max: Number(data.max), isFinished: false });
          this._bot.sendMessage(chatId, `Впишіть місце де будуть проходити тренування`);
          return;
        }

        if (data.to) {
          const createdConfig = configHandler.buildConfig(data.id, { time: data.to }, TimeConfig.TO);
          this._bot.sendMessage(chatId, `Виберіть максимальну кількість учасників`, {
            reply_markup: {
              inline_keyboard: getMembersOptions(createdConfig.id),
            },
          });

          return;
        }

        if (data.from) {
          const createdConfig = configHandler.buildConfig(data.id, { time: data.from }, TimeConfig.FROM);
          this._bot.sendMessage(chatId, `Виберіть годину закінчення тренування`, {
            reply_markup: {
              inline_keyboard: TRAINING_HOURS.map((arr) => getHoursOptions(createdConfig.id, arr, TimeConfig.TO)),
            },
          });

          return;
        }

        if (data.day) {
          const createdConfig = configHandler.buildConfig(data.id, { day: data.day, publish_day: getWeekDay(data.day, 1) });
          this._bot.sendMessage(chatId, `Виберіть годину початку тренування`, {
            reply_markup: {
              inline_keyboard: TRAINING_HOURS.map((arr) => getHoursOptions(createdConfig.id, arr, TimeConfig.FROM)),
            },
          });

          return;
        }

        const createdConfig = configHandler.buildConfig('', { chat_id: data.id, chat_title: data.title, coach_id: String(q.from.id) });
        this._bot.sendMessage(chatId, `Виберіть день тренування`, {
          reply_markup: {
            inline_keyboard: WEEK_DAYS.map((day) => [
              {
                text: day,
                callback_data: JSON.stringify({ id: createdConfig.id, day }),
              },
            ]),
          },
        });
      }
    });
  }

  startTimer() {
    const minsToMs = (mins: number) => mins * 60000;
    const hoursToMins = (num) => num * 60;

    const now = new Date();
    const hours = now.getUTCHours();
    const mins = now.getMinutes();

    let diff = 0;
    if (hours < this._timeForPostingUtc) {
      diff = this._timeForPostingUtc - 1 - hours;
      this._minsTillPost = hoursToMins(diff) - mins;
    } else {
      diff = hours + 1 - this._timeForPostingUtc;
      this._minsTillPost = hoursToMins(24 - diff) - mins;
    }

    setInterval(() => {
      this._minsTillPost -= 1;
      console.log(`Minutes left till next post: ${this._minsTillPost}`);
    }, 60000);

    setTimeout(() => {
      this.runPostingWorker();
      this._minsTillPost = 60 * 24;
      setInterval(() => this.runPostingWorker(), 60000 * 60 * 24);
    }, minsToMs(this._minsTillPost));
  }
}

export const bot = new Bot();
