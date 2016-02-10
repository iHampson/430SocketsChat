var http = require('http');
var fs = require('fs');
var socketio = require('socket.io');

var port = process.env.PORT || process.env.NODE_PORT || 3000;

// Read the client html file into memory
// __dirname in node is the current directory
// in this case the same folder as the server js file
var index = fs.readFileSync(__dirname + '/../client/client.html');

function onRequest(request, response){
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write(index);
  response.end();
}

var app = http.createServer(onRequest).listen(port);

console.log("Listening on 127.0.0.1:" + port);

//pass in the http server into socketio and grab the websocket server as io
var io = socketio(app);
//object to hold all of our connected users
var users = { };

// Delegate functions
var onJoined = function(socket) {
  socket.on("join", function(data){

    var joinMsg = {
      name:'server',
      msg: 'There are ' + Object.keys(users).length + ' users online.'
    };

    socket.emit('msg', joinMsg);
    socket.name = data.name;

    socket.join('room1');
    // Adds active users socket to users object
    users[data.name] = socket;

    socket.broadcast.to('room1').emit('msg',{
      name:'server',
      msg: data.name + ' has joined the room.'
    });
    socket.emit('msg', {name:'server',msg:'You have joined the room'});
    console.log(`${data.name} has joined the room.`);
  });

};

var onMsg = function(socket) {
  socket.on('msgToServer',function(data){
    if(data.msg[0] === '/'){
      var command = data.msg.split(" ");
      var dateTime = new Date();
      var message = "";
      var self = false;
      var other = false;

      switch(command[0]){
        case '/r':
        case '/R':
        case '/roll':
        case '/Roll':
          message = `You rolled ${command[1]} ${command[2]}-sided dice.`;
          for(var i = 0; i< parseInt(command[1]); i++){
            var result = (1 + Math.floor(Math.random()*parseInt(command[2])));
            message += result + " ";
          }
          break;
        case '/d':
        case '/D':
        case '/date':
        case '/Date':
          self = true;
          message += `The date and the time are
          ${dateTime.toLocaleString()}`;
          break;
        case '/n':
        case '/N':
        case '/name':
        case '/Name':
            var newName = command [1];
            var oldName = socket.name;
            delete users[oldName];
            message =`${oldName} changes their name to ${newName}`;
            socket.name = newName;
          break;
        case '/m':
        case '/M':
        case '/me':
        case '/Me':
          message += socket.name;
          for(var j =1;j<command.length;j++){
            message += `${command[j]} `;
          }
          break;
        case '/u':
        case '/U':
        case '/user':
        case '/User':
          self = true;
          for(var key in users){
            message += `${users[key]} `;
          }
          break;
        case '/w':
        case '/W':
        case '/whisper':
        case '/whisper':
          for(var k =2;k<command.length;k++){
            message += `${command[k]} `;
          }
          other = true;
          break;
        default:
          self = true;
          message = "That is an invalid command";
      }
      if(self){
        socket.emit('msg', {name: 'server', msg: message});
      }else if(other){
          users[command[1]].emit('msg', {name:socket.name , msg: `${socket.name}: ${message}`});
          socket.emit('msg', {name:socket.name , msg: `${socket.name} to ${command[1]}: ${message}`});
      }else{
        io.sockets.in('room1').emit('msg',{
          name:socket.name,
          msg:message
        });
      }


    }else{
      io.sockets.in('room1').emit('msg',{
        name:socket.name,
        msg:`${socket.name}: ${data.msg}`
      });
    }
  });
};

var onDisconnect = function(socket) {
  socket.on("disconnect", function(data){
    delete users[socket.name];
  });
};

io.sockets.on("connection", function(socket) {

 onJoined(socket);
 onMsg(socket);
 onDisconnect(socket);

});

console.log("Websocket server started.");
