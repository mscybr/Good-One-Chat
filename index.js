var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,  {
  cors: {
    origin: '*',
  }
});
let connected_users = {};
let connected_users_ids = {};
let user_chats = {};
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




io.on('connection', (socket) =>{
  let initialized = false;
  socket.on('init', (user_id)=>{ 
    if(initialized == false){
      initialized = true;
      if((user_id in user_chats) == false) user_chats[user_id] = {};
      console.log('a user is connected: ', user_id);
      connected_users[socket.id] = user_id;
      connected_users_ids[user_id] = {
        socket_id:socket.id,
        connected_rooms:{}
      };

      // socket.on('test', (arg1=null, arg2=null)=>{
      //   console.log(arg1, arg2);
      // })

      socket.on('join-room', ( to_user) => {
        let room_name = get_room_name(user_id, to_user);
        socket.join(room_name);
        connected_users_ids[user_id].connected_rooms[room_name] = true;
      });
      socket.on('leave-room', (to_user) => {
        let room_name = get_room_name(user_id, to_user);
        socket.leave(room_name);
        delete connected_users_ids[user_id].connected_rooms[room_name];
      });

      socket.on("disconnect", ()=>{
        delete connected_users_ids[connected_users[socket.id].user_id];
        delete connected_users[socket.id];
      });

      socket.on('get-chats', () =>{
        socket.emit('chats', JSON.stringify(user_chats[user_id]));
        for (const key in user_chats[user_id]) {
          if (Object.hasOwnProperty.call(user_chats[user_id], key)) {
            const element = user_chats[user_id][key];
            user_chats[user_id][key]["new_messages"] = {};
          }
        }
      });
      socket.on('send-message', ( to_user, message) => {
          let room_name = get_room_name(user_id, to_user)
          if((user_id in user_chats) == false) user_chats[user_id] = {};
          if((to_user in user_chats) == false) user_chats[to_user] = {};
          if((to_user in user_chats[user_id]) == false) user_chats[user_id][to_user] = {new_messages:[]};
          if((user_id in user_chats[to_user]) == false) user_chats[to_user][user_id] = {new_messages:[]};

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
              user_chats[user_id][to_user].new_messages.push(message);
            }
          }else{
            // send via firebase
          }

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

function get_room_name( first, second){
  let smaller = first > second ? second : first;
  let larger = first > second ? first : second;
  return `${smaller}_${larger}`;
}
