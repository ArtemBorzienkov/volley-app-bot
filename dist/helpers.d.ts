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
}
export type ChatIdTraining = Record<string, ITraining>;
export interface IServer {
    bot: any;
    db: Record<string, ChatIdTraining>;
}
export declare const WEEK_DAYS: string[];
export declare const getKeyBoardOption: (date: string, value: number) => IKeyBoardOpt;
export declare const getInitTraining: (maxMembers: number) => ITraining;
export declare const getTrainingDate: (daysInFuture: number) => string;
export declare const getUserPrint: (user: IUser) => string;
export declare const getMembersMsg: (members: IUser[], max: number) => string;
