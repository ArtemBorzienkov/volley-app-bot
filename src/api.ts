import fetch from 'node-fetch';

const default_url = 'http://167.71.34.194:3000';

export const API = {
  GET_CONFIG: async () => {
    try {
      const response = await fetch(default_url);
      const data = await response.json();
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
