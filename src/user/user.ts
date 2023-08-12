import { API } from '../utils/api';
import { User } from '../utils/types';

export const handleUser = async (data: User) => {
  try {
    const user = await API.USER.CREATE(data);
    return user;
  } catch (e) {
    throw new Error('unable to create user');
  }
};
