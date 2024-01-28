const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv"); 
const User = require("./models/User")
const bcrypt = require("bcryptjs");
const ws = require("ws");
const Message = require("./models/Message");
const userModel = require("./models/User");

dotenv.config();
mongoose.connect(process.env.MONGO_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const mongoURL = "mongodb+srv://northsurapee:f2a5abcd@cluster0.3pe23ge.mongodb.net/?retryWrites=true&w=majority";

const app = express();
app.use(express.json())
app.use(cookieParser());
app.use(
    cors({
      credentials: true,
      origin: ["http://localhost:5173"],
    }),
  );

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData);
            });
        } else {
            reject("no token");
        }   
    });
}

app.get("/test", (req, res) => {
    res.json("test ok");
});

app.get("/messages/:userId", async (req, res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender:{$in: [userId, ourUserId]},
        recipient:{$in: [userId, ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
});

app.get("/people", async (req, res) => {
    const users = await User.find({}, {"_id":1, username: 1});
    res.json(users);
});

app.get("/profile", (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData);
        });
    } else {
        res.status(401).json("no token");
    }
});

app.post("/login", async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        // Check password
        const passOK = bcrypt.compareSync(password, foundUser.password);
        if (passOK) {
            jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).status(201).json({
                    id: foundUser._id,
                });
            });
        }
    }
});

app.post("/register", async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username: username, 
            password: hashedPassword,
        });
        jwt.sign({userId:createdUser._id, username}, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token).status(201).json({
                id: createdUser._id,
            });
        });
    } catch(err) {
        if (err) throw err;
        res.status(500).json("error");
    }
})

const server = app.listen(4040);

// Websocket server
const wss = new ws.WebSocketServer({server});


wss.on("connection", (connection, req) => {

    // Notify everyone about online people (when someone connect or disconnect)
    function notifyAboutOnlinePeople() {{
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({userId: c.userId, username: c.username}))
            }));
        });
    }}

    // Killing old connection
    connection.isAlive = true;
    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            connection.terminate();
            notifyAboutOnlinePeople();
            console.log("dead");
        }, 1000);
    }, 5000);

connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
});

    // read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCoolieString = cookies.split(";").find(str => str.startsWith("token="));
        if (tokenCoolieString) {
            const token = tokenCoolieString.split("=")[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }

    connection.on("message", async (message) => {
        // 'message' object received in a WS is in buffer
        const messageData = JSON.parse(message.toString());
        console.log(messageData)
        const {recipient, text} = messageData;
        if (recipient && text) {
            const messageDoc = await Message.create({
                sender:connection.userId,
                recipient,
                text,
            });
            [...wss.clients]
                .filter(c => c.userId === recipient)
                .forEach(c => c.send(JSON.stringify({
                    text, 
                    sender:connection.userId,
                    recipient,
                    _id:messageDoc._id,
                })));
        }
    });
    // Notify everyone about online people (when someone connects)
    notifyAboutOnlinePeople();
    
});