import fetch from 'node-fetch';

export const API = {
  GET_CONFIG: async () => {
    try {
      const response = await fetch(process.env.API_URL);
      const data = await response.json();
      return data;
    } catch (e) {
      console.log('error', e);
      return {};
    }
  },
  UPD_CONFIG: async (config) => {
    await fetch(process.env.API_URL, {
      method: 'put',
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
