import { TimeConfig, getIsNotEmptyCfg } from '../utils/helpers';
import { API } from '../utils/api';
import { Config } from '../utils/types';

const uniqid = require('uniqid');

type ConfigCreation = Config & { isFinished: boolean };

const DEFAULT_CONFIG: ConfigCreation = {
  id: '',
  chat_id: '',
  chat_title: '',
  coach_id: '',
  day: '',
  time: '',
  max: 0,
  location: '',
  isForum: false,
  publish_day: '',
  topic_id: 0,
  active: true,
  repeatable: true,
  isFinished: true,
};

class ConfigClass {
  private _configCreationData: Map<string, ConfigCreation> = new Map();

  getNotCompletedConfig(coachId: string) {
    let config: ConfigCreation | null;
    this._configCreationData.forEach((el) => {
      if (el.coach_id === coachId && !el.isFinished) {
        config = el;
      }
    });

    return config;
  }

  async fetchAll() {
    const configs = await API.CONFIG.GET_ALL();
    if (!configs.length) {
      return [];
    }
    return (configs || []).filter(getIsNotEmptyCfg);
  }

  changeConfigTime(id: string, params: Partial<Config>, timeConf: TimeConfig) {
    let time = '';
    if (id && this._configCreationData.has(id)) {
      time = this._configCreationData.get(id).time;
    }

    return timeConf === TimeConfig.FROM ? params.time : `${time} - ${params.time} `;
  }

  buildConfig(id: string, params: Partial<ConfigCreation>, timeConf = TimeConfig.NONE) {
    let newConfig: ConfigCreation;
    let time = id && this._configCreationData.has(id) ? this._configCreationData.get(id).time : '';
    if (timeConf !== TimeConfig.NONE) {
      time = this.changeConfigTime(id, params, timeConf);
    }

    if (id && this._configCreationData.has(id)) {
      const existedConf = this._configCreationData.get(id);
      newConfig = { ...existedConf, ...params, time };
      this._configCreationData.set(id, newConfig);
      return newConfig;
    }

    const newId = uniqid();
    newConfig = { ...DEFAULT_CONFIG, id: newId, ...params, time };
    this._configCreationData.set(newId, newConfig);
    return newConfig;
  }

  async saveConfig(id: string) {
    try {
      const conf = this._configCreationData.get(id);
      delete conf.isFinished;
      await API.CONFIG.CREATE(conf);
      this._configCreationData.delete(id);
    } catch (e) {
      console.log('error creating config:', e);
      throw new Error('unable to create config');
    }
  }

  async deleteConfig(id: string, isChatId: boolean) {
    try {
      if (isChatId) {
        await API.CONFIG.DELETE_BY_CHAT_ID(id);
      } else {
        await API.CONFIG.DELETE_BY_ID(id);
      }
    } catch (e) {
      console.log('error deleting config:', e);
      throw new Error('unable to delete config');
    }
  }
}

export const configHandler = new ConfigClass();
