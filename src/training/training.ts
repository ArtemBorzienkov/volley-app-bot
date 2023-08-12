import { API } from '../utils/api';
import { Config, Training } from '../utils/types';

export const createTraining = async (config: Config, eventDate: string) => {
  try {
    const payload: Training = {
      configId: config.id,
      coachId: String(config.coach_id),
      date: eventDate,
      msg: 0,
      maxMembers: config.max,
    };
    const training = await API.TRAINING.CREATE(payload);
    return training;
  } catch (e) {
    throw new Error('unable to create training');
  }
};

export const getTraining = async (id: string): Promise<Training> => {
  try {
    const training = await API.TRAINING.GET(id);
    return training;
  } catch (e) {
    throw new Error('unable to get training');
  }
};

export const updateTraining = async (data: Training) => {
  try {
    const training = await API.TRAINING.UPDATE(data);
    return training;
  } catch (e) {
    throw new Error('unable to update training');
  }
};
