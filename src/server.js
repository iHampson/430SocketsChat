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
    // updates the count of active users
    users[data.name] = true;

    socket.broadcast.to('room1').emit('msg',{
      name:'server',
      msg: data.name + ' has joined the room.'
    });
    socket.emit('msg', {name:'server',msg:'You have joined the room'});
    console.log(users);
  });

};

var onMsg = function(socket) {
  socket.on('msgToServer',function(data){
    console.log(data);
    console.log(data.msg[0]);
    if(data.msg[0] === '/'){
      var command = data.msg.split(" ");
      console.log(command);
      var message = "";
      var err = false;

      switch(command[0]){
        case '/r':
        case '/R':
        case '/roll':
        case '/Roll':
          message = "You rolled " + command[1] + " " + command[2] + "-sided dice.";
          for(var i = 0; i< parseInt(command[1]); i++){
            var result = (1 + Math.floor(Math.random()*parseInt(command[2])));
            message += result + " ";
          }
          break;
        case '/n':
        case '/N':
        case '/name':
        case '/Name':
            var newName = command [1];
            var oldName = socket.name;
            message = oldName + " changes their name to " + newName + ".";
            socket.name = newName;
          break;
        case '/m':
        case '/M':
        case '/me':
        case '/Me':
          message += socket.name;
          for(var i =1;i<command.length;i++){
            message += command[i];
          }
          break;
        default:
          message = "That is an invalid command";
          err = true;
      }
      if(err){
        socket.emit('msg', {name: 'server', msg: message});
      }else{
        console.log(message);
        io.sockets.in('room1').emit('msg',{
          name:socket.name,
          msg:message
        });
      }


    }else{
      io.sockets.in('room1').emit('msg',{
        name:socket.name,
        msg:socket.name + ":" +data.msg
      });
    }
  });
};

var onDisconnect = function(socket) {
  socket.on("disconnect", function(data){
    console.log("disconnected\n",socket.name);
    delete users[socket.name];
  });
};

io.sockets.on("connection", function(socket) {

 onJoined(socket);
 onMsg(socket);
 onDisconnect(socket);

});

console.log("Websocket server started.");
