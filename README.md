# WatchPlug

PvS Community PlugDJ Bot

  - Author: Talos
  - Contact: Twitter @Talos51
  - Website: https://www.private-ts.tk



WatchPlug needs to be run through a nodejs-able server to run 24/7. This is the purpose of plugbot.sh, to run your PlugDJ bot as a daemon.

> Attention, it requires severals nodejs packages such as forever and of course plugAPI.

### Version
2.2

### Tech


### Installation

WatchPlug requires [Node.js](https://nodejs.org/) to run.

You need Forever installed globally:

```sh
$ npm install -g forever
```

You need PlugAPI installed globally (or locally to run multiple bots):

```sh
$ npm install -g plugapi --production
```

```sh
$ git clone [https://github.com/Talos51/WatchPlug.git] WatchPlug
$ cd WatchPlug
$ cp plugbot.sh /etc/init.d/plugbot
```

Edit bot.js to reflect your installation:

```
$ nano bot.js

_USERFILE = "/var/www/plugdj/nbusers.txt"; // FILE TO GET CURRENT NUMBER OF USER IN ROOM //
_WORDSFILE = "words.txt"; // FILE WITH BANNED WORDS, EACH SEPARATED by ; //
_MSGFILE = "messages.txt"; // FILE WITH MESSAGES TO SEND, EACH SEPARATED by ;//
_CMDLINK = "yoursite.com/bot_commands.html"; // LINK TO COMMANDS //
_RULESLINK = "yoursite.com/bot_rules.html"; // LINK TO ROOM RULES //
_SOUNDCLOUDAPI = "SOUNDCLOUD_APIKEY"; // SOUNDCLOUD API KEY /!\ MANDATORY /!\ //
_YOUTUBEKEY = "YOUTUBE_API_KEY"; // YOUTUBE API KEY /!\ MANDATORY /!\  //
```

Start WatchPlug

```
$ service plugbot start
```

#
### Development

Want to contribute? Great!

### Todos

 - Write Tests
 - Rethink Github Save
 - Add Code Comments
 - Add Night Mode

License
----

MIT
