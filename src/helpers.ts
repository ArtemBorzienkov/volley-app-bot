export interface ITraining {
  members: IUser[];
  reserve: IUser[];
  msg: string;
  maxMembers: number;
}

export interface IUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  meta?: string;
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

export const WEEK_DAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четверг', 'пятниця', 'суббота'];

export const TIME_FOR_POSTING_UTC = 8;

export const isDev = () => process.env.NODE_ENV === 'dev';

export const getChatTopicId = (chatId: string, topicId = 0) => `${chatId}_${topicId}`;

const getTextByValue = (value: number) => {
  if (value === 1) {
    return 'Буду';
  } else if (value === 0) {
    return 'Відміна реєстрації';
  } else {
    return `Зі мною +${value - 1}`;
  }
};

export const getKeyBoardOption = (date: string, value: number): IKeyBoardOpt => ({
  text: getTextByValue(value),
  callback_data: JSON.stringify({ date, value }),
});

export const getInitTraining = (maxMembers: number): ITraining => ({
  members: [],
  reserve: [],
  msg: '',
  maxMembers,
});

const getParsedNumber = (numb: number): string => (numb < 10 ? `0${numb}` : String(numb));

export const getTrainingDate = (data: PostingData) => {
  const todayIndexWeek = new Date().getDay();
  const trainIndexWeek = WEEK_DAYS.findIndex((el) => el === data.day);
  const dayBeforeTrain = trainIndexWeek > todayIndexWeek ? trainIndexWeek - todayIndexWeek : 7 - todayIndexWeek + trainIndexWeek;
  const eventDate = new Date(new Date().setDate(new Date().getDate() + dayBeforeTrain));
  return `${getParsedNumber(eventDate.getDate())}.${getParsedNumber(eventDate.getMonth() + 1)}.${eventDate.getFullYear()}`;
};

export const getUserPrint = (user: IUser) => {
  const userName = user.username ? `@${user.username}` : '';
  return `${user.first_name} ${user.last_name || ''} ${userName} ${user.meta || ''}`;
};

export const getMembersMsg = (members: IUser[] = [], reserv: IUser[] = []) => {
  const endMsgPart = `Резерв: ${reserv.map((m, index) => `\n${index + 1}: ${getUserPrint(m)}`)}`;
  return `Записані: ${members.map((m, index) => `\n${index + 1}: ${getUserPrint(m)}`)}\n${endMsgPart}`;
};

export const getReplaceMembMsg = (removed: IUser, date: string, added: IUser[]) => {
  const adedMembMsg = added && added.length > 0 ? `\nзапрошуються на тренування:${added.map((m, index) => `\n${index + 1}: ${getUserPrint(m)}`)}` : '';
  return `${getUserPrint(removed)} відмінив(ла) реєстрацію на ${date}${adedMembMsg}`;
};
