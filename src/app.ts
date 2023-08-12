import * as dotenv from 'dotenv';
import { bot } from './bot/bot';

dotenv.config();

async function init() {
  console.log(`volley-app-bot version 2.0 started in ${process.env.NODE_ENV} mode`);
  bot.init(process.env.BOT_TOKEN);
}

init();
