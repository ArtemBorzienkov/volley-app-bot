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
} from './helpers';
import { config } from './config';

const TelegramBot = require('node-telegram-bot-api');

const testChatId = '-902457580';

const server: IServer = {
  bot: null,
  db: {},
};

dotenv.config();

const postRegistrationMsg = (
  data: PostingData,
) => {
  const eventDate = getTrainingDate(1);
  if (!server.db[data.chat_id]) {
    server.db[data.chat_id] = {};
  }
  server.db[data.chat_id][eventDate] =
    getInitTraining(Number(data.max));
  server.bot.sendMessage(
    isDev() ? testChatId : data.chat_id,
    `Всім привіт! 👋\nВідкрито запис на тренування ✍️\nКоли? ${data.day} ${eventDate} 📆\nДе? ${data.location} 📍`,
    {
      reply_markup: {
        inline_keyboard: [
          [getKeyBoardOption(eventDate, 1)],
          [
            getKeyBoardOption(eventDate, 2),
            getKeyBoardOption(eventDate, 3),
            getKeyBoardOption(eventDate, 4),
          ],
          [getKeyBoardOption(eventDate, 0)],
        ],
      },
    },
  );
};

const runPostingWorker = () => {
  const dayNum = new Date().getDay();
  console.log(
    `start posting, today is ${WEEK_DAYS[dayNum]}`,
  );
  const arrPosting: PostingData[] = [];
  config.forEach((item) =>
    item.trains.forEach((el) => {
      if (el.day === WEEK_DAYS[dayNum + 1]) {
        arrPosting.push({
          ...el,
          chat_id: isDev()
            ? testChatId
            : item.chat_id,
        });
      }
    }),
  );

  arrPosting.forEach((data) =>
    postRegistrationMsg(data),
  );
};

const getIntervalBeforeFirstPost = () => {
  const minsToMs = (mins: number) => mins * 60000;
  const now = new Date();
  const hours = now.getUTCHours();
  const mins = now.getMinutes();
  if (hours < 8) {
    return minsToMs(60 - mins);
  }

  const diff = hours + 1 - 11;
  const hoursUntilNext11 = 24 - diff;
  return minsToMs(hoursUntilNext11 * 60 - mins);
};

function init() {
  server.bot = new TelegramBot(
    process.env.BOT_TOKEN,
    {
      polling: true,
    },
  );

  console.log(
    `volley-app-bot version 1.0 started in ${process.env.NODE_ENV} mode`,
  );

  console.log(
    `first post will be in ${
      getIntervalBeforeFirstPost() / 60000
    } mins`,
  );
  runPostingWorker();
  setInterval(
    () => runPostingWorker(),
    60000 * 60 * 24,
  );
  // setTimeout(() => {
  //   runPostingWorker();
  //   setInterval(
  //     () => runPostingWorker(),
  //     60000 * 60 * 24,
  //   );
  // }, getIntervalBeforeFirstPost());
}

init();

const removeMembers = (
  chatId: string,
  date: string,
  user: IUser,
) => {
  if (
    !chatId ||
    !date ||
    !user ||
    !server.db[chatId] ||
    !server.db[chatId][date]
  ) {
    return;
  }

  const training = server.db[chatId][date];
  if (
    training.members.length === 0 ||
    !training.members.some(
      (m) => m.id === user.id,
    )
  ) {
    return;
  }

  training.members = [
    ...training.members.filter(
      (m) => m.id !== user.id,
    ),
  ];

  server.bot.editMessageText(
    getMembersMsg(
      training.members,
      training.maxMembers,
    ),
    {
      chat_id: chatId,
      message_id: training.msg,
    },
  );
};

const registryNewMembers = (
  chatId: string,
  date: string,
  user: IUser,
  value: number,
) => {
  if (
    !chatId ||
    !date ||
    !user ||
    !server.db[chatId] ||
    !server.db[chatId][date]
  ) {
    return;
  }

  console.log(`add member: ${user}`);

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

  const training = server.db[chatId][date];

  if (training.members) {
    if (
      value === 1 &&
      training.members.some(
        (m) => m.id === user.id,
      )
    ) {
      console.log(
        `${getUserPrint(
          user,
        )} is already registered`,
      );
      return;
    }

    if (
      training.members.length >=
      training.maxMembers
    ) {
      console.log('members list is already full');
      return;
    }

    training.members = [
      ...training.members,
      ...newMemb,
    ];
  } else {
    training.members = newMemb;
  }

  if (!training.msg) {
    server.bot
      .sendMessage(
        chatId,
        getMembersMsg(
          training.members,
          training.maxMembers,
        ),
      )
      .then(
        (data) =>
          (training.msg = data.message_id),
      );
  } else {
    server.bot.editMessageText(
      getMembersMsg(
        training.members,
        training.maxMembers,
      ),
      {
        chat_id: chatId,
        message_id: training.msg,
      },
    );
  }
};

server.bot.on('callback_query', (q) => {
  const chatId = q.message.chat.id;
  const { date, value } = JSON.parse(q.data);
  if (value === 0) {
    removeMembers(chatId, date, q.from);
  } else {
    registryNewMembers(
      chatId,
      date,
      q.from,
      value,
    );
  }
  console.log(
    server.db[chatId][date].members.map(
      getUserPrint,
    ),
  );
});

server.bot.on('message', (msg) => {
  console.log(
    '🚀 ~ file: app.ts:76 ~ server.bot.on ~ msg:',
    msg,
  );
});
