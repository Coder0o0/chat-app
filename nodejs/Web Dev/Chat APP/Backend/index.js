const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const ws = require('ws');
const User = require('./Models/User');
const cookieParser = require('cookie-parser');
const Message = require('./Models/Message');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs=require('fs');

dotenv.config();

mongoose.connect(process.env.MONGO_URL,
    console.log('connection established')
);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}))

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
      const token = req.cookies?.token;
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          resolve(userData);
        });
      } else {
        reject('no token');
      }
    });
  
  }

  app.get('/messages/:userId', async (req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender:{$in:[userId,ourUserId]},
      recipient:{$in:[userId,ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
  });
  
app.get('/test', (req, res) => {
    res.json("test ok");
})
console.log("started");

//to know the logged in user profile
app.get('/profile', (req, res) => {
    const token = req.cookies?.token;
    // console.log("hi")
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData);
        });
    } else {
        res.status(401).json('no token');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
                res.cookie('token', token, { sameSite: 'none', secure: true }).json({
                    id: foundUser._id,
                });
            });
        }
    }
});

app.post('/logout', (req,res) => {
    res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
  });

app.get('/people', async (req,res) => {
    const users = await User.find({}, {'_id':1,username:1});
    res.json(users);
  });

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username: username,
            password: hashedPassword,
        });
        jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
                id: createdUser._id,
            });
        });
    } catch (err) {
        if (err) throw err;
        res.status(500).json('error');
    }
});
//mongodb+srv://hasanmohammadsaad:ptwZKLepoWFQsbVM@cluster0.fhnoojk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
//hasanmohammadsaad
//ptwZKLepoWFQsbVM
const server = app.listen(4040)

const wss = new ws.WebSocketServer({ server });
wss.on('connection', (connection, req) => {

    function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
          client.send(JSON.stringify({
            online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
          }));
        });
      }
    
      connection.isAlive = true;
    
      connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
          connection.isAlive = false;
          clearInterval(connection.timer);
          connection.terminate();
          notifyAboutOnlinePeople();
        //   console.log('offline');
        }, 1000);
      }, 5000);
    
      connection.on('pong', () => {
        clearTimeout(connection.deathTimer);
      });

    // console.log("starting")

    // read username and id form the cookie for this connection
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
        if (tokenCookieString) {
            const token = tokenCookieString.split('=')[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const { userId, username } = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }

    connection.on('message', async (message) => {
      const messageData = JSON.parse(message.toString());
      const {recipient, text, file} = messageData;
      let filename = null;
      if (file) {
        console.log('size', file.data.length);
        const parts = file.name.split('.');
        const ext = parts[parts.length - 1];
        filename = Date.now() + '.'+ext;
        const path = __dirname + '/uploads/' + filename;
        const bufferData = new Buffer.from(file.data.split(',')[1], 'base64');
        fs.writeFile(path, bufferData, () => {
          console.log('file saved:'+path);
        });
      }
      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender:connection.userId,
          recipient,
          text,
          file: file ? filename : null,
        });
        console.log('created message');
        [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender:connection.userId,
            recipient,
            file: file ? filename : null,
            _id:messageDoc._id,
          })));
      }
    });
  

    // console.log([...wss.clients].map(c=>c.username));
    [...wss.clients].forEach(client=>{
        // console.log("i am a man");
        client.send(JSON.stringify({
            online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
          }));
    })

    notifyAboutOnlinePeople();

});


// https://www.youtube.com/watch?v=mYy-d6BtqmU
//https://github.com/dejwid/mern-chat/blob/master/client/src/Avatar.jsx