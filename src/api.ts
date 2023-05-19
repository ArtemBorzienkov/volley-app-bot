import fetch from 'node-fetch';

const default_url = 'http://127.0.0.1:3000';

export const API = {
  GET_CONFIG: async () => {
    try {
      const response = await fetch(default_url);
      const data = await response.json();

      console.log(data);
      return data;
    } catch (e) {
      console.log('error', e);
      return {};
    }
  },
  UPD_CONFIG: async (config) => {
    await fetch(default_url, {
      method: 'put',
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
