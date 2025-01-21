import fetch from 'node-fetch';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
// var express = require('express');
// var bodyParser = require('body-parser');
// var fetch = require('nodefetch');
import json from 'body-parser'
import _http from 'http'
import {Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { time } from 'console';
const USER_ASSETS_URL = "http://162.254.35.98/api/users/";
// const UPDATING_MESSAGES_LIST_URL = "http://127.0.0.1:8000/api/chat/update_chat";
const UPDATING_MESSAGES_LIST_URL = "http://162.254.35.98/api/chat/update_chat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// const { json } = require('body-parser');
var app = express();
var http = _http.Server(app);
let io = new Server(http,  {
  cors: {
    origin: '*',
  }
});
let connected_users = {};
let connected_users_ids = {};
let user_chats = {};
let messages = {};
let user_assets = {};
let max_messages_per_request = 50;
// let rooms = {
//   "room1":1,
//   "room2":1,
// };

// var mongoose = require('mongoose');


app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

// var Message = mongoose.model('Message',{
//   name : String,
//   message : String
// })

// var dbUrl = 'mongodb://amkurian:amkurian1@ds257981.mlab.com:57981/simple-chat'

// app.get('/messages', (req, res) => {
//   Message.find({},(err, messages)=> {
//     res.send(messages);
//   })
// })


// io.on("message", async(data)=>{
//     var message = new Message(data);
//     var savedMessage = await message.save()
// });
const datapath = __dirname+"/total_data.json";

const dt = read(datapath);
if(dt){
  connected_users = dt.connected_users
  connected_users_ids = dt.connected_users_ids
  user_chats = dt.user_chats
  messages = dt.messages
  user_assets = dt.user_assets
}




io.on('connection', (socket) =>{
  let initialized = false;
  socket.on('init', (user_id)=>{
    if(initialized == false){
      initialized = true;
      fetch_user_assets(user_id);
      if((user_id in user_chats) == false) user_chats[user_id] = {};
      console.log('a user is connected: ', user_id);
      connected_users[socket.id] = user_id;
      connected_users_ids[user_id] = {
        socket_id:socket.id,
        connected_rooms:{}
      };
      write();

      // socket.on('test', (arg1=null, arg2=null)=>{
      //   console.log(arg1, arg2);
      // })

      socket.on('join-room', (to_user) => {
        let room_name = get_room_name(user_id, to_user);
        socket.join(room_name);
        connected_users_ids[user_id].connected_rooms[room_name] = true;
        write();
      });
      socket.on('leave-room', (to_user) => {
        let room_name = get_room_name(user_id, to_user);
        socket.leave(room_name);
        delete connected_users_ids[user_id].connected_rooms[room_name];
        write();
      });

      socket.on("disconnect", ()=>{
        delete connected_users_ids[connected_users[socket.id].user_id];
        delete connected_users[socket.id];
        write();
      });

      socket.on('get-chats', async() =>{
        let chts = await get_user_chats(user_id);
        socket.emit('chats', JSON.stringify( chts ));
        for (const key in user_chats[user_id]) {
          if (Object.hasOwnProperty.call(user_chats[user_id], key)) {
            const element = user_chats[user_id][key];
            user_chats[user_id][key]["new_messages"] = {};
          }
        }
        write();
      });

      socket.on('get-messages', (with_user, from_message_id=0) =>{
        let room_name = get_room_name(user_id, with_user);
        socket.emit('messages', JSON.stringify(get_messages(from_message_id, room_name)));
      });
      socket.on('send-message', ( to_user, message) => {
          let room_name = get_room_name(user_id, to_user)
          store_message(user_id, to_user, message);
          if((user_id in user_chats) == false) user_chats[user_id] = {};
          if((to_user in user_chats) == false) user_chats[to_user] = {};
          if((to_user in user_chats[user_id]) == false) user_chats[user_id][to_user] = {new_messages:[], latest_message:""};
          if((user_id in user_chats[to_user]) == false) user_chats[to_user][user_id] = {new_messages:[], latest_message:""};

          // check if the reciever is connected
          if( to_user in connected_users_ids ){

            // check to see if the user is connected to the room
            if( room_name in connected_users_ids[to_user].connected_rooms ){
              io.to(room_name).emit('receive-message', {
                message: message,
                from_user: user_id,
              });
            }else{
              io.to(connected_users_ids[to_user].socket_id).emit('new-message', {
                message: message,
                from_user: user_id,
              });
              
              user_chats[user_id][to_user].latest_message = message;
              user_chats[user_id][to_user].new_messages.unshift(message);
            }
          }else{
            // send via firebase
          }
          write();

      });

    }

   })
});

// mongoose.connect(dbUrl ,{useMongoClient : false} ,(err) => {
//   console.log('mongodb connected',err);
// })

var server = http.listen(3000, () => {
  console.log('server is running on port', server.address().port);
});


function write(){
  let dt = {};
  dt.connected_users = connected_users
  dt.connected_users_ids = connected_users_ids 
  dt.user_chats = user_chats
  dt.messages = messages 
  dt.user_assets = user_assets 
  write_to_file(dt, datapath)
}
function write_to_file(array, path) {
    fs.writeFileSync(path, JSON.stringify(array));
}

function read(path) {
  try {
    const fileContent = fs.readFileSync(path);
    const array = JSON.parse(fileContent);
    return array;
  } catch (error) {
    console.log(error);
    return false;
  }
  
}


function get_room_name( first, second){
  let smaller = first > second ? second : first;
  let larger = first > second ? first : second;
  return `${smaller}_${larger}`;
}


async function store_message(from_user, to_user, message){
  let room_name = get_room_name(from_user, to_user)
  if(messages[room_name]) {
    messages[room_name].unshift({
      "from_user": from_user,
      "message": message,
      "time" : Math.round(Date.now() / 1000)
    });
  }else{
    messages[room_name] = [{
      "from_user": from_user,
      "message": message,
      "time" : Math.round(Date.now() / 1000)
    }];
  }
     const rawResponse = await fetch(UPDATING_MESSAGES_LIST_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({from: from_user, to: to_user, latest_message: message})
    });
    const content = await rawResponse.json();
    console.log(content);
    write();
    return content;
}

function get_messages(_from, room_name){
  let msgs = [];
  let from = _from > -1 ? _from : 0;
  if(messages[room_name]){
    let arr = messages[room_name].slice(from, from + max_messages_per_request);
    let returned_array = {};
    arr.forEach((element,i) => {
      returned_array[Number(i)+Number(from)] = element;
    });
    msgs = returned_array;
  };
  return msgs;
}

async function fetch_user_assets(user_id){

  if( user_assets[user_id] == null ){
    let ft = await fetch(USER_ASSETS_URL+user_id);
    let json = await ft.json();
    if(JSON.stringify(json) != "{}") user_assets[user_id] = json
  }
}

async function get_user_assets(usr_id){
  let assets = {};
  await fetch_user_assets(usr_id);
  if(user_assets[usr_id] != null){
     assets = user_assets[usr_id];
  }
  return assets;
}

async function get_user_chats(user_id){
  let _user_chats = user_chats[user_id];
  let chats = {};
  let keys = [];
  // for (const key in _user_chats)
  //   if (_user_chats.hasOwnProperty(key))
  //     keys.push(key);
  // for await ( let cht_key of keys ){
  //    const element = _user_chats[cht_key];
  //    let usr_info = await get_user_assets(cht_key);
  //     chats[cht_key] = {
  //       "user_info" :  usr_info,
  //       ...element
  //     }

  // }
  for (const key in _user_chats) {
    if (Object.hasOwnProperty.call(_user_chats, key)) {
      const element = _user_chats[key];
      let usr_info = await get_user_assets(key);
      chats[key] = {
        "user_info" :  usr_info,
        ...element
      }
    }
  }
  return chats
}
