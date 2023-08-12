import fetch from 'node-fetch';
import { TrainingMember, User, Config, Training } from './types';

export const API = {
  CONFIG: {
    CREATE: async (data: Config) => {
      await fetch(`${process.env.API_URL}/config`, {
        method: 'post',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    GET_ALL: async (): Promise<Config[]> => {
      const config = await fetch(`${process.env.API_URL}/config`, {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
      });
      return config.json();
    },
    GET_BY_COACH_ID: async (id: string): Promise<Config[]> => {
      const config = await fetch(`${process.env.API_URL}/config?id=${id}`, {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
      });
      return config.json();
    },
    UPDATE: () => {
      /* TODO */
    },
    DELETE_BY_ID: async (id: string) => {
      await fetch(`${process.env.API_URL}/config?id=${id}`, {
        method: 'delete',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    DELETE_BY_CHAT_ID: async (id: string) => {
      await fetch(`${process.env.API_URL}/config?chat_id=${id}`, {
        method: 'delete',
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
  TRAINING: {
    CREATE: async (data: Training) => {
      const training = await fetch(`${process.env.API_URL}/training`, {
        method: 'post',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      return training.json();
    },
    GET: async (id: string) => {
      const training = await fetch(`${process.env.API_URL}/training?id=${id}`, {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
      });
      return training.json();
    },
    UPDATE: async (data: Training) => {
      const training = await fetch(`${process.env.API_URL}/training`, {
        method: 'put',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      return training.json();
    },
  },
  MEMBERS: {
    CREATE: async (member: TrainingMember[]) => {
      const memb = await fetch(`${process.env.API_URL}/member`, {
        method: 'post',
        body: JSON.stringify(member),
        headers: { 'Content-Type': 'application/json' },
      });
      return memb.json();
    },
    GET: async (id: number) => {
      const memb = await fetch(`${process.env.API_URL}/member?training_id=${id}`, {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
      });
      return memb.json();
    },
    DELETE: async (userId: number, trainingId: number) => {
      const memb = await fetch(`${process.env.API_URL}/member?user_id=${userId}&training_id=${trainingId}`, {
        method: 'delete',
        headers: { 'Content-Type': 'application/json' },
      });
      return memb.json();
    },
  },
  USER: {
    CREATE: async (data: User) => {
      await fetch(`${process.env.API_URL}/user`, {
        method: 'post',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    GET: async () => {
      await fetch(`${process.env.API_URL}/user`, {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    UPDATE: async (data: User) => {
      await fetch(`${process.env.API_URL}/user`, {
        method: 'put',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    DELETE: async (id: string) => {
      await fetch(`${process.env.API_URL}/user?id=${id}`, {
        method: 'delete',
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
};
