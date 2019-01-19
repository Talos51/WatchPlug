/*
 * WatchPlug
 * @Author : Talos @ Twitter.com/Talos51
 * @Version 2.2
 * FREE TO USE, BUT DON'T DELETE THIS HEADER. THANKS !
 * http://private-ts.tk
 * 
 * Special Thanks:
 * > Krasimir Tsonev for his "Javascript Command Parser" ( @ http://krasimirtsonev.com/ )
 * > PlugAPI for this incredible API
 */

 /*
  *  TODO LIST :
  * 
  */ 
PlugAPI = require('plugapi');
fs = require('fs');
http = require('http');
https = require('https');

/**
 * CUSTOM PARAMETERS, CHANGE TO FIT YOUR CONFIGURATION
 **/
_VERSION = "2.2"; // VERSION //
_USERFILE = "/var/www/plugdj/nbusers.txt"; // FILE TO GET CURRENT NUMBER OF USER IN ROOM //
_WORDSFILE = "words.txt"; // FILE WITH BANNED WORDS, EACH SEPARATED by ; //
_MSGFILE = "messages.txt"; // FILE WITH MESSAGES TO SEND, EACH SEPARATED by ;//
_CMDLINK = "http://yoursite.com/bot_commands.html"; // LINK TO COMMANDS //
_RULESLINK = "http://yoursite.com/bot_rules.html"; // LINK TO ROOM RULES //
_SOUNDCLOUDAPI = "SOUNDCLOUD_APIKEY"; // SOUNDCLOUD API KEY /!\ MANDATORY /!\ //
_YOUTUBEKEY = "YOUTUBE_API_KEY"; // YOUTUBE API KEY /!\ MANDATORY /!\  //
_THEME = "EDM, POP, ROCK, Misc"; // THEME(s) ALLOWED IN ROOM //


////////////////////////////////////////// *** MAIN *** ///////////////////////////////////////////////////////////////
try{
	runBot();
}
catch(excp){
	console.log("Error:", excp);
}
////////////////////////////////////////// *** BOT *** ///////////////////////////////////////////////////////////////

function runBot(){
	if(process.argv[2] == undefined || process.argv[3] == undefined || process.argv[4] == undefined){
		throw "Invalid paramater(s)...";
		return;
	}
	else
	{
		var logger = PlugAPI.CreateLogger("Bot");
		var _ROOM = process.argv[2];
		var bot = new PlugAPI({"email": process.argv[3], "password": process.argv[4]});
	}
	
	if(bot != undefined && _ROOM != undefined && logger != undefined){
		
		bot.multiLine = true;
		bot.multiLineLimit = 5;
		bot.deleteAllChat = true; // to delete higher rank chat messages 
		
		// init
		var timerMessage, messagesV=true, skipMessages=true, autoW=true, historic=false;
		var autoWelcome=true, autoJ=false, autoSkip=true;
		var autoWatch=false, logging = false, firstCo = true;
		var songMaxDuration = 10;
		var messagesDuration = 30;
		var cooldownCmd = 2000;
		var lastCmd = dateUptime = Date.now();
		//
		var re, tMessages, badWords;
		logger.success("[INIT] VARS OK");

		// connect
		logger.info('[INIT]', 'Trying to connect to ' + _ROOM);
		bot.connect(_ROOM);
		
		// listeners
		var reconnect = function() { firstCo = false; bot.connect(_ROOM); };
		
		bot.on('roomJoin', function(jRoom) {
			logger.success("[INIT] JOINED " + jRoom);
			if(firstCo){
				bonjour(jRoom);
				firstCo = false;
			}
		});
		bot.on('close', reconnect);
		bot.on('error', reconnect);
		
		bot.on('advance', woot);
		bot.on('advance', autoJoin);
		bot.on('advance', skip);
		bot.on('advance', history);
		
		bot.on('djUpdate', woot);
		
		bot.on('userJoin', autoWel);
		
		bot.on('userJoin', getNbUser);
		bot.on('userLeave', getNbUser);
		
		bot.on('roomVoteSkip', skipMessage);
		bot.on('modSkip', skipMessage);
		
		bot.on('modMute', muteMessage);
		bot.on('boothLocked', lockedMessage);
		bot.on('djListLocked', lockedMessage);
		
		bot.on('plugMaintenance', maintenanceMode);
		
		bot.on('chat',function (data) {
			if (data.from !== undefined && data.from !== null) {
				prompt(data);
			}
		});
		logger.success("[INIT] LISTENERS ALL OK");
		
		timerMessage = setInterval(sendMessage,messagesDuration*60000);
		logger.success("[INIT] MESSAGES OK");
		
		logger.success("[INIT] INIT OK");
	}

	// DEBUG ONLY !!
	
	function objectProperties(object, objectName, spacer) {
		if(spacer === undefined){
			spacer = "\t";
		}
		if(objectName != ""){
			text = "Object " + objectName + "{\n";
		}
		for(var propertyName in object) {
			if(Object.prototype.toString.call( object[propertyName] ) === '[object Object]' ) {
				text = text + spacer +"[" + propertyName + "] {\n";
				objectProperties(object[propertyName],"",spacer + "\t");
			}
			else{
				text = text + spacer +"[" + propertyName + "] => " + object[propertyName] +"\n";
			}
		}
		if(objectName == "")
			text = text + spacer +"}\n";
		else
			text = text + "}";
		
		//fs.appendFile('debug.txt', text);
		console.log(text);
	}
	// DEBUG ONLY !!
	
	var CommandParser = (function() {
		var parse = function(str, lookForQuotes) {
			var args = [];
			var readingPart = false;
			var part = '';
			for(var i=0; i<str.length; i++) {
				if(str.charAt(i) === ';') {
					break;
				}
				else if((str.charAt(i) === ' ' || str.charAt(i) === ',') && !readingPart) {
					args.push(part);
					part = '';
				} else {
					if(str.charAt(i) === '\"' && lookForQuotes) {
						readingPart = !readingPart;
					} else {
						part += str.charAt(i);
					}
				}
			}
			args.push(part);
			return args;
		}
		return {
			parse: parse
		}
	})();
	
	function dateFormat (date, fstr, utc) {
		utc = utc ? 'getUTC' : 'get';
		return fstr.replace (/%[YmdHMS]/g, function (m) {
			switch (m) {
				case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
				case '%m': m = 1 + date[utc + 'Month'] (); break;
				case '%d': m = date[utc + 'Date'] (); break;
				case '%H': m = date[utc + 'Hours'] (); break;
				case '%M': m = date[utc + 'Minutes'] (); break;
				case '%S': m = date[utc + 'Seconds'] (); break;
				default: return m.slice (1); // unknown code, remove %
			}
			// add leading zero if required
			return ('0' + m).slice (-2);
		});
	}

	function prompt(data){
		// Don't allow @mention to the bot - prevent loopback
		data.message = data.message.replace('@' + bot.getUser().username, '');		
		if(autoWatch){
			var msg = data.message;
			var regexFan = /my[\w ]+fan|fan$|become[\w ]+my[\w ]+fan|fan[\S ]+back|fan[s]?/i;	var regexFan2 = /don't ask for fans[! ]?|asking for fans is forbidden[! ]?/i;
			var regexLink = /http:\/\/|www\.|\.[a-z]{2,3}/i;
			if(!bot.havePermission(data.uid,PlugAPI.ROOM_ROLE.RESIDENTDJ)){
				if(regexFan.test(msg) && !regexFan2.test(msg)){ // Fans
					bot.sendChat("@" + data.from + " don't ask for fans !");
					deleteMessage(data.raw.cid);
					return;
				}
				else if(regexLink.test(msg)){ // Links
					bot.sendChat("@" + data.from + " don't post links!");
					deleteMessage(data.raw.cid);
					return;
				}
				else if(isMatching(msg)){ // swears
					bot.sendChat("@" + data.from + " don't post swear words!");
					deleteMessage(data.raw.cid);
					return;
				}
			}
		}
		if(data.message.charAt(0) == "!"){
			var t=data.message.length;
			var n=data.message.substring(1,t);
			var m = CommandParser.parse(n, true);
			if((Date.now() - lastCmd ) < cooldownCmd ) { deleteMessage(data.raw.cid); return; } // cooldown between two commands
			//logger.info('[CMD]','New Command ' + m[0] + ' from ' + data.from);
			switch(m[0]){
				case "adblock":
					adblock(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "autojoin":
					enableAutoJoin(data);
					deleteMessage(data.raw.cid);
					break;
				case "autowoot":
					autoWoot(data);
					deleteMessage(data.raw.cid);
					break;
				case "ban":
					ban(data,m[1],true,m[2],m[3]);
					deleteMessage(data.raw.cid);
					break;	
				case "bonjour":
					bonjour();
					deleteMessage(data.raw.cid);
					break;
				case "cat":
					cat(data);
					deleteMessage(data.raw.cid);
					break;
				case "cd":
					cd(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "clear":
					lockAndClearBooth(data,true);
					deleteMessage(data.raw.cid);
					break;
				case "clearchat":
					clearChat(data);
					deleteMessage(data.raw.cid);
					break;
				case "cmds":
					cmds(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "csi":
					csi(data);
					deleteMessage(data.raw.cid);
					break;
				case "deli":
					deli(data);
					deleteMessage(data.raw.cid);
					break;
				case "deltext":
					deltext(data,m[1], true);
					deleteMessage(data.raw.cid);
					break;
				case "dj":
					makeDJ(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "emoji":
					emoji(data);
					deleteMessage(data.raw.cid);
					break;
				case "food":
					food(data, m[1], true);
					deleteMessage(data.raw.cid);
					break;
				case "getavatar":
					getAvatars(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "grab":
					grabSong(data);
					deleteMessage(data.raw.cid);
					break;
				case "guest":
					guest(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "help":
					help(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "history":
					enableHistory(data);
					deleteMessage(data.raw.cid);
					break;
				case "host":
					host(data);
					deleteMessage(data.raw.cid);
					break;
				case "info":
					infoUser(data,m[1], true);
					deleteMessage(data.raw.cid);
					break;
				case "join":
					joinBooth(data);
					deleteMessage(data.raw.cid);
					break;
				case "leave":
					leaveBooth(data);
					deleteMessage(data.raw.cid);
					break;
				case "link":
					linkSong(data);
					deleteMessage(data.raw.cid);
					break;
				case "lock":
					lockAndClearBooth(data);
					deleteMessage(data.raw.cid);
					break;
				case "love":
					love(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "meh":
					meh(data);
					deleteMessage(data.raw.cid);
					break;
				case "meow":
					meow(data);
					deleteMessage(data.raw.cid);
					break;
				case "messages":
					enableMessages(data);
					deleteMessage(data.raw.cid);
					break;
				case "messagesduration":
					setMessagesDuration(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "msg":
					sendMessage();
					deleteMessage(data.raw.cid);
					break;
				case "mute":
					mute(data,m[1],true,m[2]);
					deleteMessage(data.raw.cid);
					break;
				case "owner":
					owner(data);
					deleteMessage(data.raw.cid);
					break;
				case "pic":
					picSong(data);
					deleteMessage(data.raw.cid);
					break;
				case "ping":
					ping(data);
					deleteMessage(data.raw.cid);
					break;
				case "playlist":
					playlist(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "population":
					population(data);
					deleteMessage(data.raw.cid);
					break;
				case "reloadmessages":
					reloadMessages(data);
					deleteMessage(data.raw.cid);
					break;
				case "reloadwords":
					reloadWords(data);
					deleteMessage(data.raw.cid);
					break;
				case "roll":
					roll(data,m[1]);
					deleteMessage(data.raw.cid);
					break;	
				case "rules":
					rules(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "say":
					say(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "setavatar":
					setAvatar(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "setduration":
					setMaxDuration(data,m[1]);
					deleteMessage(data.raw.cid);
					break;
				case "setrole":
					setrole(data,m[1],true,m[2]);
					deleteMessage(data.raw.cid);
					break;
				case "skip":
					skip(data);
					deleteMessage(data.raw.cid);
					break;
				case "skipduration":
					enableSkipDuration(data);
					deleteMessage(data.raw.cid);
					break;
				case "skipmessages":
					enableSkipMessages(data);
					deleteMessage(data.raw.cid);
					break;
				case "song":
					songInfo(data);
					deleteMessage(data.raw.cid);
					break;
				case "theme":
					theme(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "unban":
					unban(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;
				case "unmute":
					unmute(data,m[1],true);
					deleteMessage(data.raw.cid);
					break;	
				case "uptime":
					uptime(data);
					deleteMessage(data.raw.cid);
					break;
				case "waitlist":
					userToWaitList(data,m[1],true,m[2]);
					deleteMessage(data.raw.cid);
					break;
				case "watch":
					enableAutoWatch(data);
					deleteMessage(data.raw.cid);
					break;
				case "welcome":
					enableAutoWelcome(data);
					deleteMessage(data.raw.cid);
					break;
				case "woot":
					woot(data);
					deleteMessage(data.raw.cid);
					break;
				default:
					bot.sendChat("@" + data.from + " :x: Unrecognized command: " + data.message, 10);
					deleteMessage(data.raw.cid);
					break;
			}
			// Update cooldown date
			lastCmd = Date.now();
		}
	}
	
	function getNbUser(data){
		if (data !== null) {
			var guests = bot.getRoomMeta().guests;
			var users = bot.getUsers();
			
			fs.writeFile(_USERFILE, users.length + guests, function (err) {
				if (err) logger.error('[PHP]', err);
			});
		}
	}
	
	function maintenanceMode(){
		if(bot != null && bot != undefined){
			logger.info('[SYSTEM]', "Plug is going into maintenance mode, disconnecting bot for 1.5 hour...");
			bot.close();
			var timeObj = setTimeout(new function(){
				logger.info('[SYSTEM]', "Plug is going out of maintenance mode, reconnecting...");
				firstCo = false;
				bot.connect(_ROOM);
			}, 5400000);	// hour delay to reconnect
		}
	}
		
	function nameToId(user){
		return returnUser(user, true).id;
	}
	
	function returnUser(user, isName) {
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			return undefined;
		}
		
		if(isName) {
			if(user.substring(user.length-1,user.length)==" "){
				user = user.substring(0,user.lastIndexOf(" "))
			}
			users = bot.getUsers();
			var t = users.length;
			for(var n = 0; n<t; n++){
				if(users[n].toString().toLowerCase() == user.toLowerCase()){
					return users[n];
				}
			}
		}
		else {
			return bot.getUser(user);
		}
	}
	
	function deleteMessage(id){
		if(id != undefined){
			bot.moderateDeleteChat(id);
		}
	}
	
	function cd(data,duration){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(duration == undefined){
				bot.sendChat("/me Current cooldown is "  + (cooldownCmd/1000) + ' seconds');
				return; // be sure to exit command
			}
			else if(!isNaN(duration) && parseInt(duration) == duration){
				if(duration < 0){
					duration = 1;
				}
				cooldownCmd = duration * 1000;
				bot.sendChat("/me " + data.from + ' set command cooldown of ' + duration + ' seconds');
				logger.info('[SETTINGS]', data.from + ' set command cooldown of ' + duration + ' seconds');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}

	function bonjour(room) {
		if(room == undefined || room == null)
			room = bot.getRoomMeta().name;
			
		bot.sendChat("/me :wave: Hi " + room + " I'm WatchPlug  v" + _VERSION + ", be nice and spend some good time");
		bot.sendChat("/me If you need help type !cmds");
	}
	
	function cmds(data,user, isName){
		var r;
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = undefined;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		if( r == undefined){
			bot.sendChat(":link:See " + _CMDLINK + " for commands!");
		}
		else{		
			bot.sendChat("@" + r.username + " see " + _CMDLINK + " for commands!");
		}
	}
	
	function rules(data,user,isName){
		var r;
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = undefined;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		
		if( r == undefined){
			bot.sendChat(":link:See " + _RULESLINK + " for rules!");
		}
		else{		
			bot.sendChat("@" + r.username + " see :link: " + _RULESLINK + " for rules!");
		}
		
	}
	
	function enableMessages(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(messagesV){
				messagesV = false;
				clearInterval(timerMessage);
				bot.sendChat("/me [" + data.from + "] Messages will no longer occur");
				logger.info('[SETTINGS]', data.from + ' set Messages OFF');
			}
			else if(!messagesV){
				messagesV = true;
				timerMessage = setInterval(message,messagesDuration*60000);
				bot.sendChat("/me [" + data.from + "] Messages will now occur every " + messagesDuration + " minutes");
				logger.info('[SETTINGS]', data.from + ' set Messages ON every ' + messagesDuration + ' minutes');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function setMessagesDuration(data,minutes){
		if(bot.havePermission(data.from.id,PlugAPI.ROOM_ROLE.MANAGER)){
			if(!isNaN(minutes) && parseInt(minutes) == minutes){
				var msg = "";
				if(minutes < 0){
					minutes = 10;
				}
				if(minutes > 1)
					messagesDuration = minutes;
				else{
					messagesDuration = 1;
					msg = " (1 minute is the minimum value !) ";
				}
			}
			if(minutes == undefined){
				messagesDuration = 10;
				msg = " (10 minutes is the default value !) ";
			}
			messages=setInterval(function(){
				if(messagesV){
					sendMessage();
				}
			},messagesDuration*60000);
			bot.sendChat("/me " + data.from + " has now set " + messagesDuration + msg + " minutes between two messages.");
			logger.info('[SETTINGS]', data.from + ' has now set ' + messagesDuration + msg + ' minutes between two messages');
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function getContentToFile(path, callback){
		var child = fs.readFile(path, 'utf8', function (err, data) {
			if (err) {
				console.log(err);
			}
			callback(data);
		})
	}
	
	function reloadWords(data){	
		var user;
		var id = (data.from === undefined ? data.id : data.from.id );
		user = (( data.from || data.username ) || bot.getSelf().username ) || "Bot";
		
		if(bot.havePermission(id, PlugAPI.ROOM_ROLE.MANAGER)){
			// badWords
			getContentToFile(_WORDSFILE, function(file){
				badWords = file.split(';');
				re = new RegExp(badWords.join("|"), "i");
				logger.info('[SETTINGS]', user + ' has reloaded the banned words');
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function reloadMessages(data){
		var user;
		var id = (data.from === undefined ? data.id : data.from.id );
		user = (( data.from || data.username ) || bot.getSelf().username ) || "Bot";
		
		if(bot.havePermission(id, PlugAPI.ROOM_ROLE.MANAGER)){
			// tMessages
			getContentToFile(_MSGFILE, function(file){
				tMessages = file.split(';');
				logger.info('[SETTINGS]', user + ' has reloaded the messages');
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function sendMessage(){
		if(tMessages == undefined || tMessages.length == 0)
		{
			reloadMessages(bot.getSelf());
		}
		
		if(tMessages != undefined && tMessages.length > 0) {
			var i=Math.floor(Math.random()*tMessages.length);
			logger.info('[MSG]',  'auto message send');
			bot.sendChat(tMessages[i]);
		}
	}
	
	function autoWoot(data) {
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.COHOST)){
			if(!autoW){
				autoW = true;
				bot.sendChat("/me [" + data.from + "] AutoWoot is now ON");
				logger.info('[SETTINGS]', data.from + ' set AutoWoot ON');
				woot();
			}
			else if(autoW) {
				autoW = false;
				bot.sendChat("/me [" + data.from + "] AutoWoot is now OFF");
				logger.info('[SETTINGS]', data.from + ' set AutoWoot OFF');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (COHOST)");
		}
	}
	
	function woot(data) {
		var w = function(){
			var song = bot.getMedia();
			bot.woot(function(){
				if(logging)
					logger.info('[WOOT]', 'wooted song ' + song.author + ' - ' + song.title);
			});
		};
		
		if(data != undefined && data != null && data.from != undefined && data.from.id != undefined){
			if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
				w();
			}
			else{
				bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
			}
		}
		else if(autoW) {
			w();
		}
	}
	
	function meh(data){		
		if(data != undefined && data != null && data.from != undefined && data.from.id != undefined){
			if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
				var song = bot.getMedia();
				bot.meh(function(){
					if(logging)
						logger.info('[MEH]', 'mehed song ' + song.author + ' - ' + song.title);
				});
			}
			else{
				bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
			}
		}
	}
	
	function grabSong(data){
		if(data != undefined && data != null && data.from != undefined && data.from.id != undefined){
			if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
				var song = bot.getMedia();
				var playlist = bot.getActivePlaylist();
				
				if (playlist === null){
					//if there's "Grab Playlist" already, activate it
					var myPlaylists = bot.getPlaylists();
					for (var p = 0; p < myPlaylists.length; p++){
						if(myPlaylists[p].name === "Grab Playlist"){
							bot.activatePlaylist(myPlaylists[p].id);
							if(logging)
								logger.info('[PLAYLIST]', 'Activate playlist ' + myPlaylists[p].name + '(' + myPlaylists[p].id + ')');
							break;
						}
					}// else create and activate it
					bot.createPlaylist("Grab Playlist", function(err, playl){
						bot.activatePlaylist(playl[0].id);
						if(logging)
							logger.info('[PLAYLIST]', 'Activate playlist ' + playl[0].name + '(' + playl[0].id + ')');
					});
				}
				
				bot.grab(function(){
					//bot.sendChat("Nice song! I picked it! :white_check_mark:");
					if(logging)
						logger.info('[GRAB]', 'Picked song ' + song.author + ' - ' + song.title);
				});
			}
			else{
				bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
			}
		}
	}
	
	function enableAutoJoin(data) {
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.COHOST)){
			if(!autoJ) {
				autoJ=true;
				bot.sendChat("/me [" + data.from + "] AutoJoin is now ON");
				logger.info('[SETTINGS]', data.from + ' set AutoJoin is now ON');
			}
			else if(autoJ) {
				autoJ=false;
				bot.leaveBooth(function(){
					bot.sendChat(":mute: I'm leaving the booth! :mute:");
				});
				bot.sendChat("/me [" + data.from + "] AutoJoin is now OFF");
				logger.info('[SETTINGS]', data.from + ' set AutoJoin is now OFF');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (COHOST)");
		}
	}
	
	function autoJoin(data) {
		if (data.lastPlay.media !== null) {
			// Don't do things inside here on initial connect
			if(autoJ) {
				bot.joinBooth(function(){
					bot.sendChat(":speaker: I'm joining the booth! :speaker:");
				});
			}
		}
	}
	
	function joinBooth(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			bot.joinBooth(function(){
				bot.sendChat(":speaker: I'm joining the booth! :speaker:");
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function leaveBooth(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			bot.leaveBooth(function(){
				bot.sendChat(":mute: I'm leaving the booth! :mute:");
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function songInfo(data) {
		var media = bot.getMedia();
		if(media == undefined){
			bot.sendChat("/me no current media. Play something !");
		}
		else {
			var form = "";
			if(media.format == 2) {
				form += ":cloud:";
			}
			else if(media.format == 1) {
				form += ":small_red_triangle:";
			}
			else {
				form += ":musical_note:";
			}
			bot.sendChat("[@" + data.from + "] " + form + " " + media.author + " - " + media.title);
		}
	}
	
	function picSong(data){
		var media = bot.getMedia();
		if(media == undefined){ bot.sendChat("/me " + "[" + data.from + "] no current media. Play something !"); }
		else{
			bot.sendChat("[" + data.from + "] :pushpin: - Get the artwork: " + media.image);
		}
	}
	
	function linkSong(data){
		var media = bot.getMedia();
		if(media == undefined){ 
			bot.sendChat("/me " + "[" + data.from + "] no current media. Play something !"); 
		}
		else{
			switch(media.format){
				case 1:
					bot.sendChat("[" + data.from + "] :link: - Get the song on Youtube :small_red_triangle: https://youtu.be/" + media.cid);
					break;
				case 2:
					http.get('http://api.soundcloud.com/tracks/' + media.cid + '?consumer_key=' + _SOUNDCLOUDAPI, function(response) {
						var body = '';
						response.on('data', function(d) {
							body += d;
						});
						response.on('end', function() {
							var parsed = JSON.parse(body);
							bot.sendChat("[" + data.from + "] :link: - Get the song on Soundclound :cloud: " + parsed.permalink_url); 
						});
					});
					break;
				default:
					break;
			}
		}
	}
	
	function enableHistory(data) {
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(!historic){
				historic = true;
				bot.sendChat("/me [" + data.from + "] History is now ON");
				logger.info('[SETTINGS]', data.from + ' set History ON');
			}
			else if(historic) {
				historic = false;
				bot.sendChat("/me [" + data.from + "] History is now OFF");
				logger.info('[SETTINGS]', data.from + ' set History OFF');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function history(data) {
		if(historic && data.lastPlay.media !== undefined && data.lastPlay.dj !== undefined){
			var song = data.lastPlay.media;
			var msg = "";
			msg = "- " + data.lastPlay.dj.username + " just played ";
			if(song.format == 2) {
				msg += ":cloud: ";
			}
			else if(song.format == 1) {
				msg += ":small_red_triangle: ";
			}
			else {
				msg += ":musical_note: ";
			}
			bot.sendChat(msg + song.title + " by " + song.author 
			+ "  --> :+1:: " + data.lastPlay.score.positive + ", :-1:: " + data.lastPlay.score.negative + ", :ok_hand:: " + data.lastPlay.score.grabs 
			+ " for " + data.lastPlay.score.listeners + " :boy: " + (data.lastPlay.score.listeners > 1 ? "listeners" : "listener") );
		}
	}
	
	function enableAutoWelcome(data) {
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(!autoWelcome){
				autoWelcome = true;
				bot.sendChat("/me [" + data.from + "] Auto welcome is now ON");
				logger.info('[SETTINGS]', data.from + ' set AutoWelcome ON');
			}
			else if(autoWelcome) {
				autoWelcome = false;
				bot.sendChat("/me [" + data.from + "] Auto welcome is now OFF");
				logger.info('[SETTINGS]', data.from + ' set AutoWelcome OFF');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function autoWel(data) {
		if(autoWelcome && data != null && data != undefined) {
			var user = data.from || data.username;
			var room = bot.getRoomMeta();
			if(user !== bot.getSelf().username && !bot.havePermission(data.id, PlugAPI.ROOM_ROLE.BOUNCER) && user !== undefined) // don't poke bot himself and staff members and guests
				bot.sendChat(":wave: Hi @" + user + " nice to see you here in " + room.name + " :exclamation:");
		}
	}
	
	function makeDJ(data,user,isName){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				var r = returnUser(user,true);
			}
			else {
				var r = returnUser(user);
			}
			if(r == undefined){
				logger.error('[USER]', 'MakeDJ: User not found');
				return;
			}
			else {
				var mess = function (user,msg, from) { bot.sendChat("/me " + user + " has been " + msg + " to DJ booth/wait list by " + from); };
				
				if(bot.getWaitListPosition(r.id) < 0 ){
					bot.moderateAddDJ(r.id, mess(r.username,"added", data.from));
					logger.info('[MANAGE]', data.from + ' added ' + r.username + ' to DJ booth/wait list');
				}
				else {
					bot.moderateRemoveDJ(r.id, mess(r.username,"removed",data.from));
					logger.info('[MANAGE]', data.from + ' removed ' + r.username + ' to DJ booth/wait list');
				}
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function userToWaitList(data,user,isName,position){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			if(!(!isNaN(position) && parseInt(position) == position) || (position < 1 || position > 50) || position == undefined){
				position = 50;
			}
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				var r = returnUser(user,true);
			}
			else {
				var r = returnUser(user);
			}
			if(r == undefined){
				logger.error('[USER]', 'MakeDJ: User not found');
				return;
			}
		
			bot.moderateMoveDJ(r.id,position);
			bot.sendChat("/me " + data.from + " moved " + r.username + " to the position " + position + " in the wait list");
			logger.info('[MANAGE]', data.from + ' moved ' + r.username + ' to the position ' + position + ' in the wait list');
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function setMaxDuration(data,minutes) {
		if(bot.havePermission(data.from.id,PlugAPI.ROOM_ROLE.MANAGER)){
			if(minutes == undefined){
				minutes = 10;
			}
			if(!isNaN(minutes) && parseInt(minutes) == minutes){
				if(minutes < 0){
					minutes = 10;
				}
				songMaxDuration = minutes;
				bot.sendChat("/me " + data.from + " has now set max duration of songs to: " + minutes + " minutes.");
				logger.info('[SETTINGS]', data.from + ' set max duration of songs to: ' + minutes + ' minutes');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function enableSkipDuration(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(!autoSkip){
				autoSkip = true;
				bot.sendChat("/me [" + data.from + "] Auto-Skip by length is now ON");
				logger.info('[SETTINGS]', data.from + ' set Auto-Skip by length ON');
			}
			else if(autoSkip) {
				autoSkip = false;
				bot.sendChat("/me [" + data.from + "] Auto-Skip by length is now OFF");
				logger.info('[SETTINGS]', data.from + ' set Auto-Skip by length OFF');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function skip(data){
		if (data != undefined && data.lastPlay != undefined && data.lastPlay.media !== null) {
			// Don't do things inside here on initial connect
			var song = bot.getMedia();
			var dj = bot.getDJ();
			// autoskip (length)
			if(autoSkip){
				if(song != undefined && song !== null) {
					if(song.duration > songMaxDuration*60 && dj.role < 1){
						bot.moderateForceSkip(function(){
							bot.sendChat("/me " + dj.username + " has been skipped for MAX DURATION");
							logger.info('[MANAGE]', dj.username + ' has been skipped for MAX DURATION' );
						});
					}
				}
			}
			// autoskip unavailable songs
			if (song !== undefined && song.format === 1){
				https.get('https://www.googleapis.com/youtube/v3/videos?id=' + song.cid + '&key=' + _YOUTUBEKEY + '&part=status', function(response) {
					var body = '';
					response.on('data', function(d) {
						body += d;
					});
					response.on('end', function() {
						var parsed = JSON.parse(body);
						if (parsed === undefined || parsed.items === undefined || parsed.items[0] === undefined || ( parsed.items[0].status.uploadStatus === 'deleted' || parsed.items[0].status.uploadStatus === 'failed' || parsed.items[0].status.uploadStatus === 'rejected') ){
							bot.moderateForceSkip(function(){
								if(dj.username !== bot.getSelf().username){
									bot.sendChat("/me " + dj.username + " has been skipped for UNAVAILABLE SONG: " + song.title + " on Youtube");
									logger.info('[MANAGE]', dj.username + ' has been skipped for UNAVAILABLE SONG: ' + song.title);
								}
								else{
									bot.sendChat("/me Oups... It seems that " + song.title + " is unavailable on Youtube, I'm skipping right now");
									logger.info('[MANAGE]', dj.username + ' has been skipped for UNAVAILABLE SONG: ' + song.title);
								}
							});
						}
					});
				});
			}
			else if( song !== undefined && song.format === 2){
				http.get('http://api.soundcloud.com/tracks/' + song.cid + '?consumer_key=' + _SOUNDCLOUDAPI, function(response) {
					if(response.statusCode === 404){ // unavailable songs returns 404
						bot.moderateForceSkip(function(){
							if(dj.username !== bot.getSelf().username){
								bot.sendChat("/me " + dj.username + " has been skipped for UNAVAILABLE SONG: " + song.title + " on Soundcloud");
								logger.info('[MANAGE]', dj.username + ' has been skipped for UNAVAILABLE SONG: ' + song.title);
							}
							else{
								bot.sendChat("/me Oups... It seems that " + song.title + " is unavailable on Soundcloud, I'm skipping right now");
								logger.info('[MANAGE]', dj.username + ' has been skipped for UNAVAILABLE SONG: ' + song.title);
							}
						});
					}
				});
			}
		}
		// user skip
		else if(data != undefined && data.from != undefined && data.from.id != undefined){
			if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
				var song = bot.getMedia();
				var dj = bot.getDJ();
				if(song !== undefined && song !== null) {
					var res = bot.moderateForceSkip(function(){
						if(dj.username !== bot.getSelf().username){
							bot.sendChat("/me " + dj.username + " has been skipped by " + data.from);
							logger.info('[MANAGE]', dj.username + ' has been skipped by ' + data.from );
						}
						else{
							bot.sendChat(":point_right: I'm skipping right now !");
							logger.info('[MANAGE]', "Bot self skip");
						}
					});
				}
			}
			else{
				bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
			}
		}
	}
	
	function enableSkipMessages(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			if(skipMessages){
				skipMessages=false;
				bot.sendChat("/me " + data.from + " has set SkipMessage OFF")
				logger.info('[SETTINGS]', data.from + ' set SkipMessage OFF');
			}
			else if(!skipMessages){
				skipMessages=true;
				bot.sendChat("/me " + data.from + " has set SkipMessage ON")
				logger.info('[SETTINGS]', data.from + ' set SkipMessage ON');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function skipMessage(data){
		if(skipMessages){
			var msg;
			bot.getHistory(function(history){
				var song = history[1].media;
				// When room votes to skip
				if(data.m == undefined && data.mi == undefined){
					msg = 'The room has voted to skip: \"' + song.author + ' - ' + song.title + "\" sorry...:pensive:";
				
					bot.sendChat(msg);
					logger.info('[MANAGE]',  msg);
				}
				// Other skip events
			});
		}
	}
	
	function muteMessage(data){
		var user = data.username || data.from;
		if(user != undefined && user != null)
			bot.sendChat(user + " is mute :speak_no_evil:... GET REKT:exclamation:");
	}
	
	function lockedMessage(data){
		if(data != undefined && data != null){
			var msg;
			
			switch(true){
				case (data.clear && !data.locked):
					msg = "booth cleaned!";
					break;
				case (data.locked && !data.clear):
					msg = "booth locked :lock:!";
					break;
				case (data.locked && data.clear):
					msg = "booth cleaned!";
					break;
				default:
					msg = "booth unlocked :unlock:!";
					break;
			}
			
			bot.sendChat("/me " + msg);
		}
	}
	
	function ban(data,user,isName,duration,reason){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			var r;
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				r = returnUser(user,true);
			}
			else {
				r = returnUser(user);
			}
			if(r == undefined){
				logger.error('[USER]', 'ban : user not found');
				return;
			}
			if(duration == undefined){
				duration = "h";
			}
			if(reason == undefined){
				reason = 5;
			}
			switch(reason){
				case"spam":
					reason = 1;
					break;
				case"abuse":
					reason = 2;
					break;
				case"video":
					reason = 3;
					break;
				case"inappropriate":
					reason = 4;
					break;
				case"negative":
					reason = 5;
					break;
				default:
					reason = 1;
					break;
			}
			
			var d;
			switch(duration){
				case"hour":
					d = "h";
					break;
				case"day":
					d = "d";
					break;
				case"perma":
					d = "f";
					break;
				default:
					d = "h";
					break;
			}
			
			if((d == "d" || d == "f") && !bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){ return; } // prevent bouncer from perma and forever ban
			
			bot.moderateBanUser(r.id, reason, d, function(){
				//bot.sendChat("/me " + r.username + "has been banned by " + data.from + " Yeah :smiling_imp:");
				logger.info('[MANAGE]', r.username + ' has been banned by ' + data.from);
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function unban(data,user,isName){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			var r;
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				r = returnUser(user,true);
			}
			else {
				r = returnUser(user);
			}
			if(r == undefined){
				logger.error('[USER]', 'unban : user not found');
				return;
			}
			
			bot.moderateUnbanUser(r.id, function(){
				bot.sendChat("/me " + r.username + "has been unbanned by " + data.from + " :innocent:");
				logger.info('[MANAGE]', r.username + ' has been unbanned by ' + data.from );
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function mute(data,user,isName,duration){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			var r;
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				r = returnUser(user,true);
			}
			else {
				r = returnUser(user);
			}
			if(r == undefined){
				logger.error('[USER]', 'mute : user not found');
				return;
			}
			if(duration == undefined){
				duration = PlugAPI.MUTE.SHORT;
			}
			
			var d;
			switch(true){
				case (duration === "short" || duration === "S" || duration === "s" || duration === 15):
					d = PlugAPI.MUTE.SHORT;
					break;
				case (duration === "medium" || duration === "M" || duration === "m" || duration === 30):
					d = PlugAPI.MUTE.MEDIUM;
					break;
				case (duration === "long" || duration === "L" || duration === "l" || duration === 45):
					d = PlugAPI.MUTE.LONG;
					break;
				default:
					d = PlugAPI.MUTE.SHORT;
					break;
			}
			bot.moderateMuteUser(r.id, 5, d, function(){
				logger.info('[MANAGE]', r.username + ' has been muted by ' + data.from);
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function unmute(data,user,isName){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			var r;
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				r = returnUser(user,true);
			}
			else {
				r = returnUser(user);
			}
			if(r == undefined){
				logger.error('[USER]', 'unmute : user not found');
				return;
			}
			bot.moderateUnmuteUser(r.id, function(){
				bot.sendChat("/me " + r.username + " is no longer muted :yum:");
				logger.info('[MANAGE]', r.username + ' has been unmuted by ' + data.from );
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function setrole(data,user,isName,role){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			var r;
			if(isName == undefined) {
				isName = false;
			}
			if(isName) {
				r = returnUser(user,true);
			}
			else {
				r = returnUser(user);
			}
			if(role == undefined){
				role = "none";
			}
			if(r == undefined){
				logger.error('[USER]', 'setrole : user not found');
				return;
			}
			var d;
			if(role == undefined){
				d = PlugAPI.ROOM_ROLE.NONE;
				role = "none";
			}
			switch(role){
				case"none":
				d = PlugAPI.ROOM_ROLE.NONE;
				break;
				case"dj":
				d = PlugAPI.ROOM_ROLE.RESIDENTDJ;
				break;
				case"bouncer":
				d = PlugAPI.ROOM_ROLE.BOUNCER;
				break;
				case"manager":
				d = PlugAPI.ROOM_ROLE.MANAGER;
				break;
				case"cohost":
				d = PlugAPI.ROOM_ROLE.COHOST;
				break;
				case"host":
				bot.sendChat("Sorry @" + data.from + " but i can't set " + r.username + " host... not on first date :rose:");
				return;
				default:
				d = PlugAPI.ROOM_ROLE.NONE;
				role = "none";
				break;
			}
			
			if((d > 1 && !bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)) || (d > 2 && !bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.COHOST)) ||(d > 3 && !bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.HOST))){
				return; // prevent bouncers to set a role > DJ;  MANAGER to set a role > BOUNCER; CO-HOST to set a role > MANAGER 
			}
			
			bot.moderateSetRole(r.id, d, function(){
				bot.sendChat("/me " + data.from + " has set " + r.username + " to " + role);
				logger.info('[MANAGE]', data.from + ' has set ' + r.username + ' to ' + role);
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function enableAutoWatch(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			if(!autoWatch){
				autoWatch = true;
				
				reloadWords(bot.getSelf());
				
				bot.sendChat("/me [" + data.from + "] Auto Watch is now ON");
				logger.info('[SETTINGS]', data.from + ' set Auto Watch ON');
			}
			else if(autoWatch) {
				autoWatch = false;
				bot.sendChat("/me [" + data.from + "] Auto Watch is now OFF");
				logger.info('[SETTINGS]', data.from + ' set Auto Watch OFF');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function clearChat(data){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			deleteMessage(data.raw.cid);
			var hist = bot.getChatHistory();
			var dataL = hist.length;
			for (var key = 0; key < dataL; key++)
			{
					deleteMessage(hist[key].raw.cid);
			} 
			bot.sendChat("/me " + data.from + " cleared the chat!");
			logger.info('[MANAGE]', data.from + ' cleared the chat');
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function deltext(data,user,isName){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			var r;
			if(isName == undefined) {
				isName = false
			}
			if(user == undefined){
				r = data.from;
			}
			else{
				if(isName)
				{
					r = returnUser(user, true);
				}
				else {
					r = returnUser(user);
				}
			}
		
			if(r == undefined){
				logger.error('[USER]', 'deltext : user not found');
				return;
			}
			var hist = bot.getChatHistory();
			var dataL = hist.length;
			for (var key = 0; key < dataL; key++)
			{
				if(hist[key].raw.un == r.username)
					deleteMessage(hist[key].raw.cid);
			}
			
			if( r.username == data.from){
				bot.sendChat("/me " + data.from + " cleared its own chat messages :page_facing_up: !");
				logger.info('[MANAGE]', data.from + ' cleared its own chat messages');
			}
			else{		
				bot.sendChat("/me " + data.from + " cleared the chat from " + r.username + " messages:page_facing_up: !");
				logger.info('[MANAGE]', data.from + ' cleared the chat from ' + r.username + ' messages');
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
		
	function infoUser(data,user,isName) {
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.BOUNCER)){
			if(isName == undefined) {
				isName = false;
			}
			if(user == undefined){
				var r = bot.getSelf();
			}else if(isName) {
				var r = returnUser(user, true);
			}
			else {
				var r = returnUser(user);
			}
			if( r == undefined){
				logger.error('[USER]', 'infoUser: user not found');
				bot.sendChat("/me User \"" + user + "\" not found...", 60);
				return;
			}
			var joined = dateFormat (new Date(r.joined), "%Y-%m-%d", true);
			var exp = r.xp > 0 ? " - EXP: " + r.xp : "";
			var level = r.level || 0;
			var slug = r.slug || r.username.toLowerCase();
			var epoints = r.pp ? ' - :large_blue_circle: ' + r.pp + ' plug points' : "";
			
			message = r.username + ' - Level ' + level + ' - {Joined: ' + joined + exp + epoints + ' }';
			if (level > 4) {
				message += ' - Profile :link: https://plug.dj/@/' + slug;
			}
			bot.sendChat(message);
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (BOUNCER)");
		}
	}
	
	function lockAndClearBooth(data,isClear){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(isClear == undefined){
				isClear = false;
			}
			
			var booth = bot.getBoothMeta();
			var lockStatus = booth.isLocked;
			
			
			if(!isClear)
			lockStatus = !lockStatus; // invert booth status only on lock/unlock case
			
			bot.moderateLockWaitList(lockStatus,isClear,function(){
				logger.info('[MANAGE]', data.from + ((isClear) ? ' used clear function' : (lockStatus) ? ' used lock function' : (!lockStatus) ? ' used unlock function' : ' ')); 
			});	
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function population(data){
		var room = bot.getRoomMeta();
		var users = bot.getUsers();
		var guests = room.guests;
		bot.sendChat("/me [" + data.from + "] We're currently " + (users.length || "alone" ) + " in " + room.name + " including " + (guests > 1 ? guests + " guests " : guests + " guest") + " :exclamation:");
	}
	
	function csi(data){
		bot.sendChat('/me dons sunglasses.... http://media1.giphy.com/media/v9rfTQBNqdsSA/giphy.gif');
		setTimeout(function () {
			bot.sendChat(':sunglasses: YEAAAAAHHHHHHHHHHHHHHHHHHHHHHH')
		}, 1500);
	}
	
	function cat(data){
		http.get('http://catfacts-api.appspot.com/api/facts', function(response) {
			var body = '';
			response.on('data', function(d) {
				body += d;
			});
			response.on('end', function() {
				var parsed = JSON.parse(body);
				bot.sendChat(parsed.facts[0]); 
			});
		});
	}
	
	function meow(data){
		http.get('http://thecatapi.com/api/images/get?api_key=MTkxOTQ&format=src&type=gif', function(response) {
			var body = JSON.stringify(response.headers);
			var parsed = JSON.parse(body);
			
			if(response.statusCode == 302)
				bot.sendChat("/me [" + data.from + "] Meow! " + parsed.location);
		});
	}
	
	function food(data,user,isName){
		var r;
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = data.from;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		var foods = ["a slice of :pizza:", "a big :hamburger: with :fries:", "a :cookie:", "some :spaghetti:", "a :rice_ball:", "a :doughnut:", "a :ramen:", "a :stew:", "an :egg:", 
		"a slice of :cake:", "a :curry:", "an :oden:", "a :dango:", "a :rice_cracker:", "a beautiful :bento:", "an :icecream:", "an :ice_cream:", "some :sushi:", "a :poultry_leg:",
		"a :meat_on_bone:", "a :fried_shrimp", "a :custard:", "some :rice:"];
		var randomNumber = Math.floor((Math.random() * foods.length) + 1);
		

		if( r == undefined){
			bot.sendChat("User not found? Ok I keep " + foods[randomNumber] + " for myself! :yum:");
			return;
		}
		if( r.username == data.from){
			bot.sendChat("Ahah you're not sharer " + data.from + ", ok here's for you " + foods[randomNumber]);
			return;
		}
		else{		
			bot.sendChat("@" + r.username + ", " + data.from + " gives you " + foods[randomNumber] + ". Don't forget to thanks him!");
		}
	}
	
	function deli(data) {
		var users = bot.getUsers();
		var randomNumber = Math.floor((Math.random() * users.length) + 1);
		bot.sendChat(":bell: Now serving customer #" + randomNumber + " - hey there, @" + users[(randomNumber - 1)].username + "!");
	}
	
	function help(data,user,isName){
		var staff = bot.getStaff();
		var r;
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = undefined;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		if( r == undefined){
			if(staff.length == 0)
				bot.sendChat('Need help? No mods around? Contact a Brand Ambassador in http://plug.dj/support');
			else
				bot.sendChat('Need help? Mention @staff');
		}
		else{
			if(staff.length == 0)
				bot.sendChat('Need help @' + r.username + ' ? No mods around? Contact a Brand Ambassador in http://plug.dj/support');
			else
				bot.sendChat('Need help @' + r.username + ' ? Mention @staff');
		}
	}
	
	function emoji(data){
		bot.sendChat('Emoji List :link: http://www.emoji-cheat-sheet.com');
	}
	
	function roll(data,max){
		if(!isNaN(max) && parseInt(max) == max){
			if(max < 0){
				var maxValue = 6;
			}
			else{
				var maxValue = max;
			}
		}
		if(max == undefined || max == null){
			var maxValue = 6;
		}
		if (maxValue > 0 && maxValue < 99999) {
			var roll = Math.floor((Math.random() * maxValue) + 1); 
			bot.sendChat('@' + data.from + ', you rolled a :game_die: ' + roll + ' of ' + maxValue + ' !');
		}
	}
	
	function owner(data){
		bot.sendChat("Talos owns this bot, for any information request here please :pencil2: https://twitter.com/Talos51");
	}
	
	function say(data, message){
		bot.sendChat("/me " + message);
	}
	
	function ping(data){
		bot.sendChat("/me [" + data.from + "] Pong!");
	}
	
	function theme(data,user,isName){
		var room = bot.getRoomMeta();
		var r;
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = undefined;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		
		if( r == undefined){
			bot.sendChat("[" + data.from + "] In " + room.name + " allowed themes are : " + _THEME + ". You can play your song if it's a good one community will vote and decide, but no troll or blacklisted songs !" );
			return;
		}
		else{		
			bot.sendChat("[" + data.from + "] @" + r.username + " in " + room.name + " allowed themes are : " + _THEME + ". You can play your song if it's a good one community will vote and decide, but no troll or blacklisted songs !" );
		}
	}
	
	function host(data){
		var room = bot.getRoomMeta();
		var host = bot.getHost();
		
		if(host == null)
			bot.sendChat("[" + data.from + "] The current host of " + room.name + " is " + room.hostName);
		else
			bot.sendChat("[" + data.from + "] The current host of " + room.name + " is " + host.username + "and he's online, say hello to him! :raising_hand:");  
	}
	
	function adblock(data,user,isName){
		var r;
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = undefined;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		
		if( r == undefined){
			bot.sendChat("[" + data.from + "] Hey @" + r.username + ", annoyed by ads? Get Adblock today ! https://adblockplus.org/");
			return;
		}
		else{		
			bot.sendChat("[" + data.from + "] Annoyed by ads? Get Adblock today ! https://adblockplus.org/");
		}
	}
	
	function love(data,user,isName){
		if(isName == undefined) {
			isName = false;
		}
		if(user == undefined){
			r = data.from;
		}
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		if( r == undefined){
			bot.sendChat("User not found? You can love me instead @" + data.from + " :kissing_closed_eyes:");
			return;
		}
		if( r.username == data.from){
			bot.sendChat("Some narcissistic disorder @" + data.from + "?");
			return;
		}
		else{		
			bot.sendChat(":heart: Hey @" + r.username + ", " + data.from + " sends you his love with a bunch of :rose:  :heart:");
		}
	}
	
	function getAvatars(data,nbMax){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			bot.getAvatars(function(err, avatars){
				var listAvatars = "";
				if(nbMax != undefined){
					if(!isNaN(nbMax) && parseInt(nbMax) == nbMax){
						if(nbMax > avatars.length) {
							nbMax = avatars.length; // prevent user from retrieve a number of avatar > available 
						}
						avatars = avatars.slice(0,nbMax);
					}
				}
				for(var i = 0; i < avatars.length; i++){
					listAvatars += avatars[i].id + ",";
				}
				listAvatars = listAvatars.substring(0,listAvatars.length - 1); // trunc last comma
				bot.sendChat("Available avatars (" + avatars.length + ") : " + listAvatars);
			});
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	function setAvatar(data,avatar){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			var e = function(){
				bot.setAvatar(avatar,function(err, res){
				if(err == null){
					bot.sendChat("/me [" + data.from + "] Avatar set to " + avatar);
					logger.info('[AVATAR]','Avatar set to ' + avatar + ' by ' + data.from);
				}
				else
				{
					bot.sendChat("/me [" + data.from + "] Error while setting avatar to " + avatar);
					logger.error('[AVATAR]','Error while setting avatar to ' + avatar + ' by ' + data.from);
				}
				});
			};
			
			if(avatar == undefined){
				bot.getAvatars(function(err, avatars){
					avatar = avatars[0].id; // get first available avatar
					logger.info('[AVATAR]','default avatar set to ' + avatar);
					e();
				});
			}
			
			e();
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
		
	function guest(data,user,isName){
		var room = bot.getRoomMeta();
		var r;
		
		if(isName == undefined) {
			isName = false;
		}
		
		else{
			if(isName)
			{
				r = returnUser(user, true);
			}
			else {
				r = returnUser(user);
			}
		}
		
		var guest = room.guests;
		var msg = "There " + ((guest <= 0) ? "is no guest" : (guest == 1) ? "is " + guest + " guest" : "are " + guest + " guests");
		
		if( r == undefined){
			bot.sendChat("[" + data.from + "] " + msg);
			return;
		}
		else{
			bot.sendChat("[" + data.from + "] Hey @" + r.username + " Learn more about the new guest system here :link: http://blog.plug.dj/2015/06/hello-stranger-welcome-to-plug-dj/");
			bot.sendChat(" *** " + msg);
		}
	}
	
	function uptime(data){
		// Set the unit values in milliseconds.
		var msecPerMinute = 1000 * 60;
		var msecPerHour = msecPerMinute * 60;
		var msecPerDay = msecPerHour * 24;
				
		// Get the difference in milliseconds.
		var interval = Date.now() - dateUptime;
		
		// Calculate how many days the interval contains. Subtract that
		// many days from the interval to determine the remainder.
		var days = Math.floor(interval / msecPerDay );
		interval = interval - (days * msecPerDay );
		
		// Calculate the hours, minutes, and seconds.
		var hours = Math.floor(interval / msecPerHour );
		interval = interval - (hours * msecPerHour );
		
		var minutes = Math.floor(interval / msecPerMinute );
		interval = interval - (minutes * msecPerMinute );
		
		var seconds = Math.floor(interval / 1000 );
		
		// Display the result.
		bot.sendChat("[" + data.from + "] Watchplug uptime: " + days + " days, " + hours + " hours, " + minutes + " minutes, " + seconds + " seconds.");
	}
	
	function playlist(data, pID){
		if(bot.havePermission(data.from.id, PlugAPI.ROOM_ROLE.MANAGER)){
			if(pID == undefined){ // no pID, display available playlists
				bot.getPlaylists(function(playlists){
					if(playlists != undefined && playlists.length > 0){
						var msg = "";
						var playlist;
						for(var i = 0; i < playlists.length; i++){
							playlist = playlists[i];
							// [xxxx] - My active play... {A} (18 songs)
							var playlistName = (playlist.name.length > 25 ? playlist.name.substring(0,24) + "..." : playlist.name); // trunc too long playlist names
							msg += "[" + playlist.id + "] - " + playlistName + (playlist.active ? " {A}" : "") + " (" + playlist.count + " songs), ";
						}
						
						msg = msg.substring(0,msg.length - 2); // trunc last comma and space
						bot.sendChat("Available playlist(s): " + msg);
					}
					else{
						bot.sendChat("[" + data.from + "] Error. No available playlist");
						logger.error('[PLAYLIST]','Error. No available playlist by ' + data.from);
					}
				});
			}
			else if(!isNaN(pID) && parseInt(pID) == pID){ // pID, try to activate playlist pID
				bot.activatePlaylist(parseInt(pID), function(err, res){
					if(err == null){
						bot.getPlaylist(res[0].activated, function(playlist){
							if(playlist != null && playlist != undefined){
								bot.sendChat("/me [" + data.from + "] Set playlist " + playlist.name);
								logger.info('[PLAYLIST]','PLAYLIST set to ' + playlist.name + ' by ' + data.from);
							}
						});
					}
					else{
						bot.sendChat("/me [" + data.from + "] Error while setting playlist id " + pID + " " + err.message);
						logger.error('[PLAYLIST]', data.from + ' - ' + err.message);
					}
				});
			}
		}
		else{
			bot.sendChat("[" + data.from + "] - Insufficient permission (MANAGER)");
		}
	}
	
	/** END OF FILE **/
}
