export interface Config {
  id?: string;
  chat_id: string;
  chat_title: string;
  coach_id: number;
  day: string;
  time: string;
  max: number;
  location: string;
  isForum: boolean;
  publish_day: string;
  topic_id: number;
}

export interface User {
  id?: number;
  firstName: string;
  lastName: string;
  userName?: string;
  email?: string;
  isPremium: boolean;
}

export interface Training {
  id?: number;
  coachId: string;
  configId: string;
  date: string;
  msg?: number;
  maxMembers?: number;
}

export interface TrainingMember {
  id?: number;
  userId: number;
  trainingId: number;
  name: string;
  createdAt: number;
  isInvited: boolean;
}

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  meta?: string;
}
