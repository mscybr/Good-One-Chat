
# Chat System
This is a simple chatting system made for mobile apps using websockets.



## Installation

## Usage guide
- Connect to the websocket server using the url of the server. the url should follow this pattern:
   
   `ws://{{baseurl}}/mysocket/`

   Where base url is the base url of the server

- One you're connected you must send an `init` event with `user_id` as the first parameter where `user_id` is the user id of the current user
- after sending the `init` event you must listen for 3 events which are:
    
    1-`receive-message` which is the event that's fired after you receive a new message from someone while you're in the same chat with him
    
    2-`new-message` which is the event that's fired after you receive a new message from someone that you're not chatting with.

    3-`chats` which is an event that shows you the whole list of chats ( the event is fired after you send a `get-chats` event) 

- to get the full list of chats you send a `get-chats` event and would receive a `chats` event containing the list
- to enter chatting session with a particular user you send a `join-room` event with the target `user_id` as the first parameter
- to send a message you send a `send-message` event with the receiver `user_id` as the first parameter and the `message` as the second parameter, but you have to be in the same room with the receiver
- once the chatting session is finished and you wish to exit the chat with a particular person you must send a `leave-room` event with the `user_id` of the person you were chatting with 
## Examples

```javascript
   //connecting to the server( {{baseurl}} is your baseurl )
   var user_id = 1;
   
   var socket = io("ws://{{baseurl}}", {  path: '/mysocket' transports: ['websocket']});
      
   // sending the init event
   socket.emit('init', user_id );  

   // registering the 3 events that you must listen to
   socket.on('receive-message', (data) => {
      updateCurrentChat(data.message, data.from_user);
   });
   socket.on('new-message', (data) => {
      notifyUserWithaNewMessage(data.message, data.from_user);
   });
   socket.on('chats', (data) => {
      updateChatList(data);
   });

   // aquiring the chat list
   socket.emit('get-chats' );  

   // joining a chat room with someone
   var target_user_id = 2;
   socket.emit('join-room', target_user_id );  

   // sending a message to the target user
   var message = "hello world";
   socket.emit('join-room', target_user_id, message );  

   // leaving the chat room
   socket.emit('leave-room', target_user_id );  


```

