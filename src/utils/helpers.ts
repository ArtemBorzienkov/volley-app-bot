import { Config, TgUser, TrainingMember } from './types';

export interface ITraining {
  members: TgUser[];
  reserve: TgUser[];
  msg: string;
  maxMembers: number;
}

export interface IKeyBoardOpt {
  text: string;
  callback_data: string;
}

export interface PostingData {
  chat_id: string;
  day: string;
  time: string;
  max: string;
  location: string;
  is_forum: boolean;
  publish_day: string;
  topic_id?: number;
}

export type ChatIdTraining = Record<string, ITraining>;

export interface IServer {
  bot: any;
  db: Record<string, ChatIdTraining>;
}

export enum CRUD {
  CREATE = 'CREATE',
  GET = 'GET',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum ConfigInstruction {
  CREATE = 'Створити графік тренувань',
  UPDATE = 'Оновити графік тренувань',
  DELETE = 'Видалити графік тренувань',
}

export enum TimeConfig {
  NONE = 'NONE',
  FROM = 'FROM',
  TO = 'TO',
}

export const configInstructions = [
  {
    title: ConfigInstruction.CREATE,
    value: CRUD.CREATE,
  },
  {
    title: ConfigInstruction.UPDATE,
    value: CRUD.UPDATE,
  },
  {
    title: ConfigInstruction.DELETE,
    value: CRUD.DELETE,
  },
];
export const TIME_FOR_POSTING_UTC = 8;
export const TRAINING_HOURS_1 = ['6:00', '6:30', '7:00', '7:30', '8:00', '8:30'];
export const TRAINING_HOURS_2 = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30'];
export const TRAINING_HOURS_3 = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];
export const TRAINING_HOURS_4 = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
export const TRAINING_HOURS_5 = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
export const TRAINING_HOURS_6 = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
export const TRAINING_HOURS = [TRAINING_HOURS_1, TRAINING_HOURS_2, TRAINING_HOURS_3, TRAINING_HOURS_4, TRAINING_HOURS_5, TRAINING_HOURS_6];
export const WEEK_DAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четверг', 'пятниця', 'суббота'];

export const isDev = () => process.env.NODE_ENV === 'dev';

export const getIsNotEmptyCfg = (cfg) => cfg.day && cfg.time;
export const getIsEmptyCfg = (cfg) => !cfg.day && !cfg.time;

export const getChatTopicId = (chatId: string, topicId = 0) => `${chatId}_${topicId}`;

export const getWeekDay = (weekDay: string, daysBefore: number) => {
  const weekLength = 7;
  const index = WEEK_DAYS.findIndex((el) => el === weekDay);
  const indexInArr = index - daysBefore;
  const isIndexInRange = indexInArr >= 0 && indexInArr < weekLength;
  return isIndexInRange ? WEEK_DAYS[index - daysBefore] : WEEK_DAYS[WEEK_DAYS.length + indexInArr];
};

export const getArrayFromTo = (from: number, to: number): string[] => {
  const arr = [];
  for (let newNumb = from; newNumb < to; newNumb++) {
    arr.push(String(newNumb));
  }

  return arr;
};

export const MAX_TRAINING_MEMBERS = [getArrayFromTo(0, 7), getArrayFromTo(7, 14), getArrayFromTo(14, 21), getArrayFromTo(21, 28)];

export const getMembersOptions = (id: string) =>
  MAX_TRAINING_MEMBERS.map((arr) =>
    arr.map((max) => ({
      text: max,
      callback_data: JSON.stringify({ id, max }),
    })),
  );

const getTextByValue = (value: number) => {
  if (value === 1) {
    return 'Буду';
  } else if (value === 0) {
    return 'Відміна реєстрації';
  } else {
    return `Зі мною +${value - 1}`;
  }
};

export const getHoursOptions = (id: string, array: string[], timeConf: TimeConfig) =>
  array.map((hour) => ({
    text: hour,
    callback_data: timeConf === TimeConfig.FROM ? JSON.stringify({ id, from: hour }) : JSON.stringify({ id, to: hour }),
  }));

export const getKeyBoardOption = (train_id: string, value: number): IKeyBoardOpt => ({
  text: getTextByValue(value),
  callback_data: JSON.stringify({ train_id, value }),
});

export const getInitTraining = (maxMembers: number): ITraining => ({
  members: [],
  reserve: [],
  msg: '',
  maxMembers,
});

const getParsedNumber = (numb: number): string => (numb < 10 ? `0${numb}` : String(numb));

export const getTrainingDate = (data: Config) => {
  const todayIndexWeek = new Date().getDay();
  const trainIndexWeek = WEEK_DAYS.findIndex((el) => el === data.day);
  const dayBeforeTrain = trainIndexWeek > todayIndexWeek ? trainIndexWeek - todayIndexWeek : 7 - todayIndexWeek + trainIndexWeek;
  const eventDate = new Date(new Date().setDate(new Date().getDate() + dayBeforeTrain));
  return `${getParsedNumber(eventDate.getDate())}.${getParsedNumber(eventDate.getMonth() + 1)}.${eventDate.getFullYear()}`;
};

export const getUserPrint = (user: TgUser) => {
  const userName = user.username ? ` @${user.username}` : '';
  return `${user.first_name} ${user.last_name || ''}${userName}${user.meta || ''}`;
};

export const getMembersMsg = (members: TrainingMember[] = [], max: number) => {
  const hasReserv = members.length > max;

  if (hasReserv) {
    const membs = [...members.slice(0, max)];
    const reserv = [...members.slice(max)];
    const endMsgPart = `Резерв: ${reserv.map((m, index) => `\n${index + 1}: ${m.name}`)}`;
    return `Записані: ${membs.map((m, index) => `\n${index + 1}: ${m.name}`)}\n${endMsgPart}`;
  }

  return `Записані: ${members.map((m, index) => `\n${index + 1}: ${m.name}`)}`;
};

export const getReplaceMembMsg = (removed: TrainingMember, date: string, added: TrainingMember[]) => {
  const adedMembMsg = added && added.length > 0 ? `\nзапрошуються на тренування:${added.map((m, index) => `\n${index + 1}: ${m.name}`)}` : '';
  return `${removed.name} відмінив(ла) реєстрацію на ${date}${adedMembMsg}`;
};
