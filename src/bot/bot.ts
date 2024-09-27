import { WEEK_DAYS, getKeyBoardOption, getTrainingDate, isDev } from '../utils/helpers';
import { Config } from '../utils/types';
import { configHandler } from '../config';
import { createTraining } from '../training';
import { onCallBackHandler, onCreateEventHandler, onCreateHandler, onDeleteHandler, onMsgHandler, onStartHandler } from './handlers';

const uniqid = require('uniqid');

const TelegramBot = require('node-telegram-bot-api');

const testChatId = '-1001928873227';
type sendMsgFn = (id: string, text: string, options?: any) => Promise<any>;

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

  sendMsg(id, text, options?) {
    return this._bot.sendMessage(id, text, options);
  }

  editMsg(text, options) {
    return this._bot.editMessageText(text, options);
  }

  async postRegistrationMsg(data: Config) {
    const eventDate = Boolean(data.repeatable) ? `${data.day} ${getTrainingDate(data)}` : data.day;
    const training = await createTraining(data, eventDate);
    const eventType = Boolean(data.repeatable) ? '\n💪 Формат: тренування' : '';

    this._bot.sendMessage(
      isDev() ? testChatId : data.chat_id,
      `✍️ Відкрито запис${eventType}\n📆 Коли? ${eventDate} на ${data.time}\n📍 Де? ${data.location}\n👥 Кількість учасників: ${data.max}`,
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
    const arrPosting = config.filter((cfg) => cfg.publish_day === todayWeekDay).map((cfg) => ({ ...cfg, chat_id: isDev() ? '-4537783508' : cfg.chat_id }));
    arrPosting.forEach((data) => {
      if (data.repeatable && data.active) {
        this.postRegistrationMsg(data);
      }
    });
  }

  registerHandlers() {
    this._bot.onText(/\/start$/, onStartHandler);
    this._bot.onText(/\/create$/, onCreateHandler);
    this._bot.onText(/\/event/, onCreateEventHandler);
    this._bot.onText(/\/delete$/, onDeleteHandler);
    this._bot.on('message', onMsgHandler);
    this._bot.on('callback_query', onCallBackHandler);
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
