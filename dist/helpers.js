"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMembersMsg = exports.getUserPrint = exports.getTrainingDate = exports.getInitTraining = exports.getKeyBoardOption = exports.WEEK_DAYS = void 0;
exports.WEEK_DAYS = [
    'неділя',
    'понеділок',
    'вівторок',
    'середа',
    'четверг',
    'пятниця',
    'суббота',
];
const getTextByValue = (value) => {
    if (value === 1) {
        return 'Буду';
    }
    else if (value === 0) {
        return 'Відміна реєстрації';
    }
    else {
        return `Зі мною +${value - 1}`;
    }
};
const getKeyBoardOption = (date, value) => ({
    text: getTextByValue(value),
    callback_data: JSON.stringify({ date, value }),
});
exports.getKeyBoardOption = getKeyBoardOption;
const getInitTraining = (maxMembers) => ({
    members: [],
    reserve: [],
    msg: '',
    maxMembers,
});
exports.getInitTraining = getInitTraining;
const getTrainingDate = (daysInFuture) => {
    const tomorow = new Date(new Date().setDate(new Date().getDate() + daysInFuture));
    return `${tomorow.getDate()}.${tomorow.getMonth()}.${tomorow.getFullYear()}`;
};
exports.getTrainingDate = getTrainingDate;
const getUserPrint = (user) => {
    const userName = user.username
        ? `@${user.username}`
        : '';
    return `${user.first_name} ${user.last_name} ${userName} ${user.meta || ''}`;
};
exports.getUserPrint = getUserPrint;
const getMembersMsg = (members, max) => `Записані: ${members.map((m, index) => `\n${index + 1}: ${(0, exports.getUserPrint)(m)}`)}\nЗалишилось місць: ${max - members.length}`;
exports.getMembersMsg = getMembersMsg;
//# sourceMappingURL=helpers.js.map