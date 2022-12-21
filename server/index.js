const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser());
app.use(authRoutes);
const http = require('http').createServer(app);
const socketio = require('socket.io');
const io = socketio(http);
const { addUser, getUser, removeUser } = require('./helper');
const PORT = process.env.PORT || 5000
const mongoose = require("mongoose");
const mongoDB = 'mongodb+srv://chatroom:chatroom@chatroom.pf9kflc.mongodb.net/chat-database?retryWrites=true&w=majority';
const Room = require('./models/Room');
const Message = require('./models/Message');
mongoose.set('strictQuery', true);

mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Mongo Connected!") 
}).catch(err => {
  console.log(err);
})

io.on('connection', (socket) => {
  console.log(socket.id);
  //FETCH ROOM
  Room.find().then(result => {
    socket.emit('output-rooms', result);
  })
  //CREATE ROOM
  socket.on('create-room', name => {
    // console.log("The room name received is ",name)
    const room = new Room({name});
    room.save().then(result => {
      io.emit('room-created', result);
    })
  })
  //JOINING ROOM
  socket.on('join', ({name,room_id, user_id}) => {
    const {error, user} = addUser({
      socket_id:socket.id,
      name,
      room_id,
      user_id
    })
    socket.join(room_id);
    if(error){
      console.log('join error', error);
    }else{
      console.log('join user', user);
    }
  })
  //SENDING MESSAGE
  socket.on('sendMessage', (message, room_id, callback) => {
    const user = getUser(socket.id);
    console.log(user);
    const msgToStore = {
      name: user.name,
      user_id : user.user_id,
      room_id,
      text: message
    }
    console.log('message', msgToStore)
    const msg = new Message(msgToStore);
    msg.save().then(result => {
      io.to(room_id).emit('message', result);
      callback()
    })
  })
  socket.on('get-messages-history', room_id => {
    Message.find({ room_id }).then(result => {
        socket.emit('output-messages', result)
    })
})
  //LEAVING ROOM
  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
  })
});

http.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});