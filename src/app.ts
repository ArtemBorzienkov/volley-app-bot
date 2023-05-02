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
} from './helpers';
import { config } from './config';

const TelegramBot = require('node-telegram-bot-api');

const prodToken =
  '6039130844:AAHJNyjY70qSgBY9019hR0eyUrrjI_1apMc';
const devToken =
  '6125553246:AAGeWXvl38S9L_XU-X2UPMIQMRLarBJyndk';
const prodChatId = '-1001880573200';
const devChatId = '-902457580';

const server: IServer = {
  bot: null,
  db: {},
};

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
    prodChatId,
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
    `start posting, today is ${
      WEEK_DAYS[dayNum + 1]
    }`,
  );
  const arrPosting: PostingData[] = [];
  config.forEach((item) =>
    item.trains.forEach((el) => {
      if (el.day === WEEK_DAYS[dayNum + 1]) {
        arrPosting.push({
          ...el,
          chat_id: item.chat_id,
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
  server.bot = new TelegramBot(prodToken, {
    polling: true,
  });

  console.log(
    'volley-app-bot version 1.0 started',
  );

  console.log(
    `first post will be in ${
      getIntervalBeforeFirstPost() / 60000
    } mins`,
  );
  runPostingWorker();
  setTimeout(() => {
    runPostingWorker();
    setInterval(
      () => runPostingWorker(),
      60000 * 60 * 24,
    );
  }, getIntervalBeforeFirstPost());
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
//   const dayNumb = new Date().getDay();

//   if (msg.text.startsWith('-')) {
//     if (dayNumb === 1 || dayNumb === 2) {
//       if (
//         !server.db.thuesday.some(
//           (user) => user.id === msg.from.id,
//         )
//       ) {
//         return;
//       }

//       console.log(
//         `removing user: ${msg.from.first_name}`,
//       );
//       server.isRegistration = true;
//       server.db.thuesday =
//         server.db.thuesday.filter(
//           (user) => user.id !== msg.from.id,
//         );
//       server.bot.sendMessage(
//         server.groupChatId,
//         `@${
//           msg.from.first_name
//         } вас видалив, залишилось місць: ${
//           8 - server.db.thuesday.length
//         }`,
//       );
//       if (server.db.thuesday.length >= 8) {
//         server.isRegistration = false;
//         server.bot.sendMessage(
//           server.groupChatId,
//           `Дякую всім, всі місця заброньовані!`,
//         );
//       }
//     }

//     if (dayNumb === 3 || dayNumb === 4) {
//       if (
//         !server.db.thursday.some(
//           (user) => user.id === msg.from.id,
//         )
//       ) {
//         return;
//       }

//       console.log(
//         `removing user: ${msg.from.first_name}`,
//       );
//       server.isRegistration = true;
//       server.db.thursday =
//         server.db.thursday.filter(
//           (user) => user.id !== msg.from.id,
//         );
//       server.bot.sendMessage(
//         server.groupChatId,
//         `@${
//           msg.from.first_name
//         } вас видалив, залишилось місць: ${
//           8 - server.db.thursday.length
//         }`,
//       );
//       if (server.db.thursday.length >= 8) {
//         server.isRegistration = false;
//         server.bot.sendMessage(
//           server.groupChatId,
//           `Дякую всім, всі місця заброньовані!`,
//         );
//       }
//     }

//     if (dayNumb === 5 || dayNumb === 6) {
//       if (
//         !server.db.saturday.some(
//           (user) => user.id === msg.from.id,
//         )
//       ) {
//         return;
//       }

//       console.log(
//         `removing user: ${msg.from.first_name}`,
//       );
//       server.isRegistration = true;
//       server.db.saturday =
//         server.db.saturday.filter(
//           (user) => user.id !== msg.from.id,
//         );
//       server.bot.sendMessage(
//         server.groupChatId,
//         `@${
//           msg.from.first_name
//         } вас видалив, залишилось місць: ${
//           8 - server.db.saturday.length
//         }`,
//       );
//       if (server.db.saturday.length >= 8) {
//         server.isRegistration = false;
//         server.bot.sendMessage(
//           server.groupChatId,
//           `Дякую всім, всі місця заброньовані!`,
//         );
//       }
//     }
//   }

//   if (
//     msg.text.startsWith('+') &&
//     server.isRegistration
//   ) {
//     const members = [msg.from];
//     if (msg.text.length > 1) {
//       msg.text
//         .split('')
//         .forEach((item, index) => {
//           if (index === 0 || item !== '+') {
//             return;
//           }

//           members.push({
//             ...msg.from,
//             first_name: `Гість ${index}`,
//             last_name: `від ${msg.from.first_name}`,
//           });
//         });
//     }

//     if (dayNumb === 1 || dayNumb === 2) {
//       console.log(
//         `adding user: ${msg.from.first_name}`,
//       );
//       server.db.thuesday.push(...members);
//       server.bot.sendMessage(
//         server.groupChatId,
//         `@${msg.from.first_name} вас записав ${
//           members.length > 1
//             ? 'і напарника(цю)'
//             : ''
//         }, залишилось місць: ${
//           8 - server.db.thuesday.length
//         }`,
//       );
//       if (server.db.thuesday.length >= 8) {
//         server.isRegistration = false;
//         server.bot.sendMessage(
//           server.groupChatId,
//           `Дякую всім, всі місця заброньовані!`,
//         );
//       }
//     }

//     if (dayNumb === 3 || dayNumb === 4) {
//       console.log(
//         `adding user: ${msg.from.first_name}`,
//       );
//       server.db.thursday.push(...members);
//       server.bot.sendMessage(
//         server.groupChatId,
//         `@${msg.from.first_name} вас записав ${
//           members.length > 1
//             ? 'і напарника(цю)'
//             : ''
//         }, залишилось місць: ${
//           8 - server.db.thursday.length
//         }`,
//       );
//       if (server.db.thursday.length >= 8) {
//         server.isRegistration = false;
//         server.bot.sendMessage(
//           server.groupChatId,
//           `Дякую всім, всі місця заброньовані!`,
//         );
//       }
//     }

//     if (dayNumb === 5 || dayNumb === 6) {
//       console.log(
//         `adding user: ${msg.from.first_name}`,
//       );
//       server.db.saturday.push(...members);
//       server.bot.sendMessage(
//         server.groupChatId,
//         `@${msg.from.first_name} вас записав ${
//           members.length > 1
//             ? 'і напарника(цю)'
//             : ''
//         }, залишилось місць: ${
//           8 - server.db.saturday.length
//         }`,
//       );
//       if (server.db.saturday.length >= 8) {
//         server.isRegistration = false;
//         server.bot.sendMessage(
//           server.groupChatId,
//           `Дякую всім, всі місця заброньовані!`,
//         );
//       }
//     }
//   }
// });
