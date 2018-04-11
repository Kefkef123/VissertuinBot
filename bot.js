const Discord = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs      = require('fs');

let settings = {};


if(fs.existsSync('settings.json')) {
  settings = JSON.parse(fs.readFileSync('settings.json'));
}
else {
  console.error('Settings file has not been created or is inaccesible. Exiting....');
  return;
}

// if database has no rows, seed with some data
const insertData = function () {
  db.get("SELECT COUNT(*) as count FROM punten", function(err, row) {
    if(row['count'] === 0) {
      db.run("INSERT INTO punten (userID, punten) VALUES ('119042542766391297', 0)");
    }
  });
};

const createTables = function () {
  db.run("CREATE TABLE IF NOT EXISTS punten (userID TEXT, punten INT)", insertData);
};

const db = new sqlite3.Database('punten.sqlite3', createTables);

const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  // disalow bots from issuing commands
  if(msg.author.bot) {
    return;
  }



  if(msg.channel.type !== 'dm') {

    if(msg.content === settings.commandPrefix + 'ranglijst') {
      db.all("SELECT * FROM punten ORDER BY punten DESC", function(err, rows) {
        console.log(rows);

        let embed = new Discord.RichEmbed();

        for(i = 0;i < rows.length;i++) {
          embed.addField(`${i + 1}. ${client.users.get(rows[i]['userID']).username}`,  `${rows[i]['punten']} ${rows[i]['punten'] == 1 || rows[i]['punten'] == -1 ? 'punt' : 'punten'}`)
        }



        msg.channel.send(embed);
        return;
      });

      return;
    }

    if(msg.content === settings.commandPrefix + 'punten') {
      db.get("SELECT COUNT(*) as count FROM punten WHERE userID = ?", [msg.author.id], function(err, row) {
        if(row['count'] === 0) {
          db.run("INSERT INTO punten (userID, punten) VALUES (?, 0)", [msg.author.id]);
          msg.reply(`Je hebt 0 punten`);
        }
        else {
          db.get("SELECT * FROM punten WHERE userID = ?", [msg.author.id], function(err, row) {
            msg.reply(`Je hebt ${row['punten']} ${row['punten'] == 1 || row['punten'] == -1 ? 'punt' : 'punten'}`)
          });
        }
      });

      return;
    }


    if(msg.author.id != settings.simon) {
      return;
    }


    let arguments = msg.content.split(' ');

    if(arguments[0] === settings.commandPrefix + 'punten') {
      let query = '';

      if(arguments[1] === '+'){
        query = 'UPDATE punten SET punten = punten + ? WHERE userID = ?';
      }
      else if(arguments[1] === '-') {
        query = 'UPDATE punten SET punten = punten - ? WHERE userID = ?';
      }
      else {
          msg.channel.send('Vul een + of - in na het commando, gevolgd door het aantal punten en daarna de mention').then(message => message.delete(10000)).catch(console.error);
          return;
      }

      let regex = /^\d{1,2}$/;

      if(arguments[2].match(regex) == null) {
        msg.channel.send('Vul een + of - in na het commando, gevolgd door het aantal punten en daarna de mention').then(message => message.delete(10000)).catch(console.error);
        return;
      }

      let mentions = msg.mentions.users.array();

      for(i = 0;i < mentions.length;i++) {
        let user = mentions[i];

        db.get("SELECT COUNT(*) as count FROM punten WHERE userID = ?", [user.id], function(err, row) {
          if(row['count'] === 0) {
            db.run("INSERT INTO punten (userID, punten) VALUES (?, 0)", [user.id]);
          }
        });

        db.run(query, [arguments[2], user.id]);

        msg.channel.send(`${arguments[2]} ${arguments[2] < 2 ? 'punt' : 'punten'} ${arguments[1] === '+' ? 'uitgedeeld aan' : 'afgepakt van'} ${user.tag}`).then(message => message.delete(30000)).catch(console.error);
      }
    }

  }
});


client.login(settings.token);
