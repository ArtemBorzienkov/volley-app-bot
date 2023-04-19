const TelegramBot = require('node-telegram-bot-api');

const token = '6039130844:AAHJNyjY70qSgBY9019hR0eyUrrjI_1apMc';

const server = {
  bot: null,
  groupChatId: '-1001880573200',
  isRegistration: false,
  db: {
    thuesday: [],
    thursday: [],
    saturday: [],
  }
}

const postRegistrationMsg = () => {
  server.isRegistration = true
  server.bot.sendMessage(server.groupChatId, 'Всім привіт! Хто завтра буде на тренуванні з 19:00-21:00? Cтавимо +/-');
}

const clearData = () => {
  server.isRegistration = false
  server.db = {
    thuesday: [],
    thursday: [],
    saturday: [],
  }
}

function init() {
  server.bot = new TelegramBot(token, {polling: true});
  console.log('volley-app-bot version 1.0 started')
  postRegistrationMsg();
  setInterval(() => {
    const dayNumb = new Date().getDay()
    const isDayOfWeekWithPosting = dayNumb === 1 || dayNumb === 3 || dayNumb === 5
    const isLastDayOfWeek = dayNumb === 7
    console.log(`today is week day number: ${dayNumb}${isDayOfWeekWithPosting ? ', today will be posting of registation' : 'it is chill day'}`)
    if (isDayOfWeekWithPosting) {
      postRegistrationMsg()
    }

    if (isLastDayOfWeek) {
      clearData()
    }
  }, 60000 * 60 * 24)
}

init()

server.bot.on('message', (msg) => {
  const dayNumb = new Date().getDay()

  if (msg.text.startsWith('-')) {
    if (dayNumb === 1 || dayNumb === 2) {
      if (!server.db.thuesday.some(user => user.id === msg.from.id)) {
        return
      }

      console.log(`removing user: ${msg.from.first_name}`)
      server.isRegistration = true
      server.db.thuesday = server.db.thuesday.filter(user => user.id !== msg.from.id)
      server.bot.sendMessage(server.groupChatId, `@${msg.from.first_name} вас видалив, залишилось місць: ${8 - server.db.thuesday.length}`);
      if (server.db.thuesday.length >= 8) {
        server.isRegistration = false
        server.bot.sendMessage(server.groupChatId, `Дякую всім, всі місця заброньовані!`);
      }
    }

    if (dayNumb === 3 || dayNumb === 4) {
      if (!server.db.thursday.some(user => user.id === msg.from.id)) {
        return
      }

      console.log(`removing user: ${msg.from.first_name}`)
      server.isRegistration = true
      server.db.thursday = server.db.thursday.filter(user => user.id !== msg.from.id)
      server.bot.sendMessage(server.groupChatId, `@${msg.from.first_name} вас видалив, залишилось місць: ${8 - server.db.thursday.length}`);
      if (server.db.thursday.length >= 8) {
        server.isRegistration = false
        server.bot.sendMessage(server.groupChatId, `Дякую всім, всі місця заброньовані!`);
      }
    }

    if (dayNumb === 5 || dayNumb === 6) {
      if (!server.db.saturday.some(user => user.id === msg.from.id)) {
        return
      }

      console.log(`removing user: ${msg.from.first_name}`)
      server.isRegistration = true
      server.db.saturday = server.db.saturday.filter(user => user.id !== msg.from.id)
      server.bot.sendMessage(server.groupChatId, `@${msg.from.first_name} вас видалив, залишилось місць: ${8 - server.db.saturday.length}`);
      if (server.db.saturday.length >= 8) {
        server.isRegistration = false
        server.bot.sendMessage(server.groupChatId, `Дякую всім, всі місця заброньовані!`);
      }
    }
  }

  if (msg.text.startsWith('+') && server.isRegistration) {
    let members = [msg.from]
    if (msg.text.length > 1) {
      msg.text.split('').forEach((item, index) => {
        if (index === 0 || item !== '+') {
          return
        }

        members.push({
          ...msg.from, 
          first_name: `Гість ${index}`, 
          last_name: `від ${msg.from.first_name}`
        })
      })
    }

    if (dayNumb === 1 || dayNumb === 2) {
      console.log(`adding user: ${msg.from.first_name}`)
      server.db.thuesday.push(...members)
      server.bot.sendMessage(server.groupChatId, `@${msg.from.first_name} вас записав ${members.length > 1 ? 'і напарника(цю)' : ''}, залишилось місць: ${8 - server.db.thuesday.length}`);
      if (server.db.thuesday.length >= 8) {
        server.isRegistration = false
        server.bot.sendMessage(server.groupChatId, `Дякую всім, всі місця заброньовані!`);
      }
    }

    if (dayNumb === 3 || dayNumb === 4) {
      console.log(`adding user: ${msg.from.first_name}`)
      server.db.thursday.push(...members)
      server.bot.sendMessage(server.groupChatId, `@${msg.from.first_name} вас записав ${members.length > 1 ? 'і напарника(цю)' : ''}, залишилось місць: ${8 - server.db.thursday.length}`);
      if (server.db.thursday.length >= 8) {
        server.isRegistration = false
        server.bot.sendMessage(server.groupChatId, `Дякую всім, всі місця заброньовані!`);
      }
    }

    if (dayNumb === 5 || dayNumb === 6) {
      console.log(`adding user: ${msg.from.first_name}`)
      server.db.saturday.push(...members)
      server.bot.sendMessage(server.groupChatId, `@${msg.from.first_name} вас записав ${members.length > 1 ? 'і напарника(цю)' : ''}, залишилось місць: ${8 - server.db.saturday.length}`);
      if (server.db.saturday.length >= 8) {
        server.isRegistration = false
        server.bot.sendMessage(server.groupChatId, `Дякую всім, всі місця заброньовані!`);
      }
    }
  }
})
