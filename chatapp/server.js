const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const fs = require('fs');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const USERS_FILE = path.join(__dirname, 'users.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Serve public files
app.use(express.static(path.join(__dirname, 'public')));

// Load users
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE);
  return JSON.parse(data);
}

function saveUser(username) {
  const users = getUsers();
  users.push(username);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function removeUser(username) {
  if (!fs.existsSync(USERS_FILE)) return;
  const users = getUsers();
  const filtered = users.filter(u => u !== username);
  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2));
}

// Load/save messages
function getMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) return [];
  const data = fs.readFileSync(MESSAGES_FILE);
  return JSON.parse(data);
}

function saveMessage(msgObj) {
  const messages = getMessages();
  messages.push(msgObj);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

// Socket logic
io.on('connection', socket => {
  console.log('🟢 New socket connected');

  let username = null;

  // Send previous messages on connection
  socket.emit('chat history', getMessages());

  socket.on('set username', (requestedName) => {
    const users = getUsers();
    if (users.find(u => u.toLowerCase() === requestedName.trim().toLowerCase())) {
      socket.emit('username error', 'Username already taken.');
    } else {
      username = requestedName.trim();
      saveUser(username);
      socket.emit('username accepted', username);
      console.log(`✅ Username set: ${username}`);
    }
  });

  socket.on('chat message', msg => {
    if (username) {
      const messageObj = {
        username,
        message: msg,
        timestamp: new Date().toISOString()
      };
      saveMessage(messageObj);
      io.emit('chat message', messageObj);
    }
  });

  socket.on('logout', () => {
    if (username) {
      console.log(`🚪 User logged out: ${username}`);
      removeUser(username);
      username = null;
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Disconnected: ${username || 'unknown user'}`);
    // Do not remove user on disconnect to allow reload persistence
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat server running at http://localhost:${PORT}`);
});
