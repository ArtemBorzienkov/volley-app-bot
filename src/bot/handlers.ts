import { API } from '../utils/api';
import { handleUser } from '../user';
import { Config, TgCallBackQ, TgMessage, TgUser, Training } from '../utils/types';
import { bot } from './bot';
import {
  CRUD,
  TRAINING_HOURS,
  TimeConfig,
  WEEK_DAYS,
  getHoursOptions,
  getIsEmptyCfg,
  getIsNotEmptyCfg,
  getMembersMsg,
  getMembersOptions,
  getReplaceMembMsg,
  getWeekDay,
} from '../utils/helpers';
import { configHandler } from '../config';
import { getTraining, updateTraining } from '../training';
import { addNewMember, getMembers, removeMembers } from '../member';

const uniqid = require('uniqid');

export const onStartHandler = (msg: TgMessage) => {
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

  bot.sendMsg(
    chat.id,
    `Вітаю ${chat.first_name}!\nДля того щоб підключити бота спочатку додайте його до своєї групи і надайте права адміна.\nПісля цього натисніть /create для створення графіку тренувань`,
  );
};

export const onCreateHandler = async (msg: TgMessage) => {
  const { from, chat } = msg;

  if (chat.type !== 'private') {
    return;
  }

  const configs = await API.CONFIG.GET_BY_COACH_ID(String(from.id));
  if (configs.filter(getIsEmptyCfg).length === 0) {
    bot.sendMsg(chat.id, 'Нажаль доступних груп для створення графіку тренувань не знайдено');
    return;
  }

  bot.sendMsg(chat.id, `Виберіть групу для створення графіку тренувань`, {
    reply_markup: {
      inline_keyboard: configs.filter(getIsEmptyCfg).map((cfg) => [
        {
          text: `"${cfg.chat_title}"`,
          callback_data: JSON.stringify({ id: cfg.chat_id, title: cfg.chat_title }),
        },
      ]),
    },
  });
};

export const onDeleteHandler = async (msg: TgMessage) => {
  const { from, chat } = msg;

  if (chat.type !== 'private') {
    return;
  }

  const configs = await API.CONFIG.GET_BY_COACH_ID(String(from.id));
  if (configs.filter(getIsNotEmptyCfg).length === 0) {
    bot.sendMsg(chat.id, 'Нажаль доступних груп для видалення графіку тренувань не знайдено');
    return;
  }

  bot.sendMsg(chat.id, `Виберіть групу для видалення графіку тренувань`, {
    reply_markup: {
      inline_keyboard: configs.filter(getIsNotEmptyCfg).map((cfg) => [
        {
          text: `"${cfg.chat_title}" ${cfg.location} ${cfg.day} ${cfg.time}`,
          callback_data: JSON.stringify({ id: cfg.id, instruction: CRUD.DELETE }),
        },
      ]),
    },
  });
};

export const onCreateEventHandler = async (msg: TgMessage) => {
  const { from, chat, text } = msg;

  if (chat.type === 'private') {
    return;
  }

  let day;
  let time;
  let location = '';
  let max = 18;
  const arr = text.split(' ');
  arr.forEach((el, index) => {
    if (el === 'на') {
      const weekDay = arr[index + 1];
      const date = arr[index + 2] !== 'о' ? arr[index + 2] : '';
      day = `${weekDay} ${date}`;
    }
    if (el === 'о') {
      time = arr[index + 1];
    }
    if (el === 'в') {
      location = arr[index + 1];
    }
    if (el === 'для') {
      max = Number(arr[index + 1]);
    }
  });
  if (!day || !time) {
    bot.sendMsg(
      chat.id,
      `Подія має містити дату, час, місце і кількість учасників\nВ форматі "на <дата> о <час> в <місце> для <кількість>"\nнаприклад:\n/event на 01.10 о 18:30 в Школа18 для 18`,
    );
    return;
  }

  const dayNum = new Date().getDay();
  const todayWeekDay = WEEK_DAYS[dayNum];

  const configId = uniqid();
  const cfg: Config = {
    id: configId,
    chat_id: String(chat.id),
    chat_title: chat.title,
    coach_id: String(from.id),
    day,
    time,
    max,
    location,
    isForum: !!chat.is_forum,
    publish_day: todayWeekDay,
    topic_id: 0,
    active: true,
    repeatable: false,
  };

  API.CONFIG.CREATE(cfg).then((res) => bot.postRegistrationMsg(res));
};

export const onMsgHandler = async (msg: TgMessage) => {
  const { new_chat_member, left_chat_participant, chat, from, text } = msg;

  // join to a new chat
  if (new_chat_member && new_chat_member.id === Number(process.env.BOT_ID)) {
    console.log(`bot joined to a new chat: ${chat.title}`);
    API.GROUP.CREATE({
      chat_id: String(chat.id),
      chat_title: chat.title,
      coach_id: String(from.id),
      isForum: !!chat.is_forum,
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
    bot.sendMsg(
      chat.id,
      `Тренування створено:\n📆 Коли? ${createdConfig.day}, ${createdConfig.time}\n📍 Де? ${createdConfig.location}\n👥 Кількість учасників: ${createdConfig.max}`,
    );
  }
};

export const onCallBackHandler = async (q: TgCallBackQ) => {
  const { from, message } = q;
  const chatId = message.chat.id;
  const topicId = message.message_thread_id || 0;
  const data = JSON.parse(q.data);

  if (data.instruction === CRUD.DELETE) {
    configHandler.deleteConfig(data.id, false);
    bot.sendMsg(chatId, 'Тренування видалено');
    return;
  }

  if (data.train_id) {
    if (data.value === 0) {
      const training = await getTraining(data.train_id);
      const oldMembs = await getMembers(data.train_id);
      const newMembs = await removeMembers(q.from, oldMembs, data.train_id);

      bot.editMsg(getMembersMsg(newMembs, training.maxMembers), {
        chat_id: chatId,
        message_id: training.msg,
      });

      const lenOfOldMembs = oldMembs.length;
      const hasReserv = lenOfOldMembs > training.maxMembers;
      const rmUser = oldMembs.find((m) => m.userId === String(from.id));
      let membsFromReserv = [];
      if (hasReserv) {
        const rmMembsCount = lenOfOldMembs - newMembs.length;
        membsFromReserv = [...newMembs].splice(training.maxMembers, rmMembsCount);
      }
      if (rmUser && rmUser.name) {
        bot.sendMsg(chatId, getReplaceMembMsg(rmUser, training.date, membsFromReserv), { message_thread_id: topicId ? topicId : null });
      }
    } else {
      const training = await getTraining(data.train_id);
      const oldMembs = await getMembers(data.train_id);
      const newMembs = await addNewMember(q.from, training, oldMembs, data.value);

      if (!training.msg) {
        bot.sendMsg(chatId, getMembersMsg(newMembs, training.maxMembers), { message_thread_id: topicId ? topicId : null }).then((resp) => {
          updateTraining({ ...training, msg: resp.message_id } as Training);
        });
      } else {
        bot.editMsg(getMembersMsg(newMembs, training.maxMembers), {
          chat_id: chatId,
          message_id: training.msg,
        });
      }
    }
  }

  if (data.id) {
    if (data.max) {
      configHandler.buildConfig(data.id, { max: Number(data.max), isFinished: false });
      bot.sendMsg(chatId, `Впишіть місце де будуть проходити тренування`);
      return;
    }

    if (data.to) {
      const createdConfig = configHandler.buildConfig(data.id, { time: data.to }, TimeConfig.TO);
      bot.sendMsg(chatId, `Виберіть максимальну кількість учасників`, {
        reply_markup: {
          inline_keyboard: getMembersOptions(createdConfig.id),
        },
      });

      return;
    }

    if (data.from) {
      const createdConfig = configHandler.buildConfig(data.id, { time: data.from }, TimeConfig.FROM);
      bot.sendMsg(chatId, `Виберіть годину закінчення тренування`, {
        reply_markup: {
          inline_keyboard: TRAINING_HOURS.map((arr) => getHoursOptions(createdConfig.id, arr, TimeConfig.TO)),
        },
      });

      return;
    }

    if (data.day) {
      const createdConfig = configHandler.buildConfig(data.id, { day: data.day, publish_day: getWeekDay(data.day, 1) });
      bot.sendMsg(chatId, `Виберіть годину початку тренування`, {
        reply_markup: {
          inline_keyboard: TRAINING_HOURS.map((arr) => getHoursOptions(createdConfig.id, arr, TimeConfig.FROM)),
        },
      });

      return;
    }

    const createdConfig = configHandler.buildConfig('', { chat_id: data.id, chat_title: data.title, coach_id: String(q.from.id) });
    bot.sendMsg(chatId, `Виберіть день тренування`, {
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
};
