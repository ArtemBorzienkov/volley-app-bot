import { TgUser, Training, TrainingMember } from '../utils/types';
import { API } from '../utils/api';
import { getUserPrint } from '../utils/helpers';
import { handleUser } from '../user';

export const addNewMember = async (user: TgUser, training: Training, oldMembs: TrainingMember[], value: number): Promise<TrainingMember[]> => {
  console.log('add new member');
  const isUserCoach = training.coachId === String(user.id);
  const isAlreadyRegistered = oldMembs.some((m) => m.userId === user.id);
  if (!isUserCoach && isAlreadyRegistered) {
    return oldMembs;
  }

  await handleUser({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name || '',
    userName: user.username || '',
    email: '',
    isPremium: user.is_premium || false,
  });

  const members = [];
  const createdAt = Math.round(new Date().getTime() / 1000);

  for (let i = 0; i < value; i++) {
    const isFirstMemb = i === 0;
    const usr: TrainingMember = {
      userId: user.id,
      trainingId: training.id,
      name: getUserPrint({ ...user, meta: isFirstMemb ? '' : `+${i}` }),
      createdAt,
      isInvited: !isFirstMemb,
    };
    members.push(usr);
  }

  const membs = await API.MEMBERS.CREATE(members);
  return membs;
};

export const removeMembers = async (user: TgUser, oldMembs: TrainingMember[], trainingId: number): Promise<TrainingMember[]> => {
  const isRegistered = oldMembs.some((m) => m.userId === user.id);
  if (!isRegistered) {
    return oldMembs;
  }

  const membs = await API.MEMBERS.DELETE(user.id, trainingId);
  return membs;
};

export const getMembers = async (trainingId: number): Promise<TrainingMember[]> => {
  const membs = await API.MEMBERS.GET(trainingId);
  return membs;
};
