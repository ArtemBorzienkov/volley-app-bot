"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
const config_1 = require("./config");
const TelegramBot = require('node-telegram-bot-api');
const prodToken = '6039130844:AAHJNyjY70qSgBY9019hR0eyUrrjI_1apMc';
const devToken = '6125553246:AAGeWXvl38S9L_XU-X2UPMIQMRLarBJyndk';
const prodChatId = '-1001880573200';
const devChatId = '-902457580';
const server = {
    bot: null,
    db: {},
};
const postRegistrationMsg = (data) => {
    const eventDate = (0, helpers_1.getTrainingDate)(1);
    if (!server.db[data.chat_id]) {
        server.db[data.chat_id] = {};
    }
    server.db[data.chat_id][eventDate] =
        (0, helpers_1.getInitTraining)(Number(data.max));
    server.bot.sendMessage(devChatId, `Всім привіт! 👋\nВідкрито запис на тренування ✍️\nКоли? ${data.day} ${eventDate} 📆\nДе? ${data.location} 📍`, {
        reply_markup: {
            inline_keyboard: [
                [(0, helpers_1.getKeyBoardOption)(eventDate, 1)],
                [
                    (0, helpers_1.getKeyBoardOption)(eventDate, 2),
                    (0, helpers_1.getKeyBoardOption)(eventDate, 3),
                    (0, helpers_1.getKeyBoardOption)(eventDate, 4),
                ],
                [(0, helpers_1.getKeyBoardOption)(eventDate, 0)],
            ],
        },
    });
};
const runPostingWorker = () => {
    const dayNum = new Date().getDay();
    console.log(`start posting, today is ${helpers_1.WEEK_DAYS[dayNum + 1]}`);
    const arrPosting = [];
    config_1.config.forEach((item) => item.trains.forEach((el) => {
        if (el.day === helpers_1.WEEK_DAYS[dayNum + 1]) {
            arrPosting.push(Object.assign(Object.assign({}, el), { chat_id: item.chat_id }));
        }
    }));
    arrPosting.forEach((data) => postRegistrationMsg(data));
};
const getIntervalBeforeFirstPost = () => {
    const minsToMs = (mins) => mins * 60000;
    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    if (hours < 11) {
        return minsToMs(60 - mins);
    }
    const diff = hours + 1 - 11;
    const hoursUntilNext11 = 24 - diff;
    return minsToMs(hoursUntilNext11 * 60 - mins);
};
function init() {
    server.bot = new TelegramBot(devToken, {
        polling: true,
    });
    console.log('volley-app-bot version 1.0 started');
    console.log(`first post will be in ${getIntervalBeforeFirstPost() / 60000} mins`);
    setTimeout(() => {
        runPostingWorker();
        setInterval(() => runPostingWorker(), 60000 * 60 * 24);
    }, getIntervalBeforeFirstPost());
}
init();
const removeMembers = (chatId, date, user) => {
    if (!chatId ||
        !date ||
        !user ||
        !server.db[chatId] ||
        !server.db[chatId][date]) {
        return;
    }
    const training = server.db[chatId][date];
    if (training.members.length === 0 ||
        !training.members.some((m) => m.id === user.id)) {
        return;
    }
    training.members = [
        ...training.members.filter((m) => m.id !== user.id),
    ];
    server.bot.editMessageText((0, helpers_1.getMembersMsg)(training.members, training.maxMembers), {
        chat_id: chatId,
        message_id: training.msg,
    });
};
const registryNewMembers = (chatId, date, user, value) => {
    if (!chatId ||
        !date ||
        !user ||
        !server.db[chatId] ||
        !server.db[chatId][date]) {
        return;
    }
    const newMemb = [];
    for (let index = 0; value > index; index++) {
        if (index === 0) {
            newMemb[index] = user;
            continue;
        }
        newMemb[index] = Object.assign(Object.assign({}, user), { meta: `+${index}` });
    }
    const training = server.db[chatId][date];
    if (training.members) {
        if (value === 1 &&
            training.members.some((m) => m.id === user.id)) {
            console.log(`${(0, helpers_1.getUserPrint)(user)} is already registered`);
            return;
        }
        if (training.members.length >=
            training.maxMembers) {
            console.log('members list is already full');
            return;
        }
        training.members = [
            ...training.members,
            ...newMemb,
        ];
    }
    else {
        training.members = newMemb;
    }
    if (!training.msg) {
        server.bot
            .sendMessage(chatId, (0, helpers_1.getMembersMsg)(training.members, training.maxMembers))
            .then((data) => (training.msg = data.message_id));
    }
    else {
        server.bot.editMessageText((0, helpers_1.getMembersMsg)(training.members, training.maxMembers), {
            chat_id: chatId,
            message_id: training.msg,
        });
    }
};
server.bot.on('callback_query', (q) => {
    const chatId = q.message.chat.id;
    const { date, value } = JSON.parse(q.data);
    if (value === 0) {
        removeMembers(chatId, date, q.from);
    }
    else {
        registryNewMembers(chatId, date, q.from, value);
    }
    console.log(server.db[chatId][date].members.map(helpers_1.getUserPrint));
});
server.bot.on('message', (msg) => {
    console.log('🚀 ~ file: app.ts:76 ~ server.bot.on ~ msg:', msg);
});
//# sourceMappingURL=app.js.map