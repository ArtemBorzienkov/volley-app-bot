import * as dotenv from 'dotenv';
import {
  IServer,
  IUser,
  getInitTraining,
  getKeyBoardOption,
  getMembersMsg,
  getTrainingDate,
  getUserPrint,
  WEEK_DAYS,
  PostingData,
  isDev,
  TIME_FOR_POSTING_UTC,
  getReplaceMembMsg,
  getChatTopicId,
} from './helpers';
import { config } from './config';

const TelegramBot = require('node-telegram-bot-api');

const testChatId = '-1001928873227';

const server: IServer = {
  bot: null,
  db: {},
};

dotenv.config();

const postRegistrationMsg = (data: PostingData) => {
  const eventDate = getTrainingDate(data);
  if (!server.db[getChatTopicId(data.chat_id, data.topic_id)]) {
    server.db[getChatTopicId(data.chat_id, data.topic_id)] = {};
  }
  server.db[getChatTopicId(data.chat_id, data.topic_id)][eventDate] = getInitTraining(Number(data.max));
  server.bot.sendMessage(
    isDev() ? testChatId : data.chat_id,
    `Всім привіт! 👋\nВідкрито запис на тренування ✍️\nКоли? ${data.day} ${eventDate} ${data.time} 📆\nДе? ${data.location} 📍`,
    {
      reply_markup: {
        inline_keyboard: [
          [getKeyBoardOption(eventDate, 1)],
          [getKeyBoardOption(eventDate, 2), getKeyBoardOption(eventDate, 3), getKeyBoardOption(eventDate, 4)],
          [getKeyBoardOption(eventDate, 0)],
        ],
      },
      message_thread_id: data.is_forum && data.topic_id ? data.topic_id : null,
    },
  );
};

const runPostingWorker = () => {
  const dayNum = new Date().getDay();
  const todayWeekDay = WEEK_DAYS[dayNum];
  console.log(`start posting, today is ${todayWeekDay}`);
  const arrPosting: PostingData[] = [];
  config.forEach((item) =>
    item.trains.forEach((el: Partial<PostingData>) => {
      if (el.publish_day === todayWeekDay) {
        arrPosting.push({
          ...el,
          chat_id: isDev() ? testChatId : item.chat_id,
        } as PostingData);
      }
    }),
  );

  arrPosting.forEach((data) => postRegistrationMsg(data));
};

const getIntervalBeforeFirstPost = () => {
  const minsToMs = (mins: number) => mins * 60000;
  const now = new Date();
  const hours = now.getUTCHours();
  const mins = now.getMinutes();
  if (hours < TIME_FOR_POSTING_UTC) {
    return minsToMs(60 - mins);
  }

  const diff = hours + 1 - TIME_FOR_POSTING_UTC;
  const hoursUntilNext11 = 24 - diff;
  return minsToMs(hoursUntilNext11 * 60 - mins);
};

function init() {
  server.bot = new TelegramBot(process.env.BOT_TOKEN, {
    polling: true,
  });

  console.log(`volley-app-bot version 1.0 started in ${process.env.NODE_ENV} mode`);

  console.log(`first post will be in ${getIntervalBeforeFirstPost() / 60000} mins`);
  setTimeout(() => {
    runPostingWorker();
    setInterval(() => runPostingWorker(), 60000 * 60 * 24);
  }, getIntervalBeforeFirstPost());
}

init();

const removeMembers = (chatId: string, date: string, user: IUser, topicId?: number) => {
  if (!chatId || !date || !user || !server.db[getChatTopicId(chatId, topicId)] || !server.db[getChatTopicId(chatId, topicId)][date]) {
    return;
  }

  const training = server.db[getChatTopicId(chatId, topicId)][date];
  const isUserInMembersList = training.members && training.members.some((m) => m.id === user.id);
  const isUserInReservList = training.reserve && training.reserve.some((m) => m.id === user.id);

  if (isUserInReservList) {
    training.reserve = [...training.reserve.filter((m) => m.id !== user.id)];
  }

  if (isUserInMembersList) {
    const usersFromReserv = [];

    training.members = [...training.members.filter((m) => m.id !== user.id)];

    if (training.reserve) {
      const membsRemainPlacesNumb = training.maxMembers - training.members.length;

      for (let i = 0; i < membsRemainPlacesNumb; i++) {
        const addedMemb = training.reserve.shift();
        if (addedMemb) {
          usersFromReserv.push(addedMemb);
        }
      }

      training.members = [...training.members, ...usersFromReserv];
    }

    server.bot.sendMessage(chatId, getReplaceMembMsg(user, date, usersFromReserv), { message_thread_id: topicId ? topicId : null });
  }

  server.bot.editMessageText(getMembersMsg(training.members), {
    chat_id: chatId,
    message_id: training.msg,
  });
};

const registryNewMembers = (chatId: string, date: string, user: IUser, value: number, topicId?: number) => {
  if (!chatId || !date || !user || !server.db[getChatTopicId(chatId, topicId)] || !server.db[getChatTopicId(chatId, topicId)][date]) {
    return;
  }

  console.log('add member:', user);

  // TODO: Hardcode for Kostya user.id === 1115502449
  const group: any = config.find((item: any) => item.chat_id === chatId);
  const isUserCoach = group && group.coach_id === user.id;

  const newMemb: IUser[] = [];
  for (let index = 0; value > index; index++) {
    if (index === 0) {
      newMemb[index] = user;
      continue;
    }

    newMemb[index] = {
      ...user,
      meta: `+${index}`,
    };
  }

  const training = server.db[getChatTopicId(chatId, topicId)][date];

  if (training.members) {
    const membersNumb = training.members.length;
    const isUserAlreadyRegistered = training.members.some((m) => m.id === user.id);
    const isMembersListFull = membersNumb >= training.maxMembers;
    const hasEnoughPlaces = !isMembersListFull && membersNumb + value <= training.maxMembers;

    if (isUserAlreadyRegistered && !isUserCoach) {
      console.log(`${getUserPrint(user)} is already registered`);
      return;
    }

    if (hasEnoughPlaces) {
      console.log('members list is not full, user goes to members list');
      training.members = [...training.members.filter((m) => m.id !== user.id), ...newMemb];
    } else if (!isMembersListFull) {
      console.log('members list is partially full, some users go to members list and some to reserv');
      const reservUsers = [...newMemb];
      const memberUsers = [];
      const remainPlacesNumb = training.maxMembers - membersNumb;

      for (let i = 0; i < remainPlacesNumb; i++) {
        const removed = reservUsers.shift();
        memberUsers.push(removed);
      }

      training.members = [...training.members.filter((m) => m.id !== user.id), ...memberUsers];
      training.reserve = training.reserve ? [...training.reserve.filter((m) => m.id !== user.id), ...reservUsers] : reservUsers;
    } else {
      console.log('members list is already full, user goes to reserv list');
      training.reserve = training.reserve ? [...training.reserve.filter((m) => m.id !== user.id), ...newMemb] : newMemb;
    }
  } else {
    training.members = newMemb;
  }

  if (!training.msg) {
    server.bot
      .sendMessage(chatId, getMembersMsg(training.members, training.reserve), { message_thread_id: topicId ? topicId : null })
      .then((data) => (training.msg = data.message_id));
  } else {
    server.bot.editMessageText(getMembersMsg(training.members, training.reserve), {
      chat_id: chatId,
      message_id: training.msg,
    });
  }
};

server.bot.on('callback_query', (q) => {
  const chatId = q.message.chat.id;
  const topicId = q.message.message_thread_id || 0;
  const { date, value } = JSON.parse(q.data);
  if (value === 0) {
    removeMembers(chatId, date, q.from, topicId);
  } else {
    registryNewMembers(chatId, date, q.from, value, topicId);
  }
  console.log(server.db[getChatTopicId(chatId, topicId)][date].members.map(getUserPrint));
});

server.bot.on('message', (msg) => {
  console.log('🚀 ~ file: app.ts:76 ~ server.bot.on ~ msg:', msg);
});
