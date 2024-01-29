import { useRef, useContext, useEffect, useState } from "react"
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import {uniqBy} from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat() {
    /// HOOKS ----------------------------------------------------------
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setOfflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const {username, setUsername, id, setId} = useContext(UserContext);
    const [newMessageText, setNewMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const divUnderMessage = useRef();
    const bucket = "mern-chat";

    //// WEB SOCKETS ---------------------------------------------------
    // useEffect for reconnecting to ws
    useEffect(() => {
        setWs(null);
        connectToWs();
    }, [selectedUserId]); // To re-create listener function with latest "selectedUserId" (Because value of the state is still be the same when function is created)

    function connectToWs() {
        // Connect to WS
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        // Received message from WS
        ws.addEventListener('message', handleMessage); 
        // Disconnect from WS
        ws.addEventListener('close', () => {
          setTimeout(() => {
            console.log('Disconnected. Trying to reconnect.');
            setWs(null);
            connectToWs();
          }, 1000);
        });
      }

    // Handle receive message from WS (PEOPLE & SEND CHAT)
    function handleMessage(ev) {
        // Parse message
        const messageData = JSON.parse(ev.data);
        // If the message is for "notify online people"
        if ('online' in messageData) {
          showOnlinePeople(messageData.online);
        // If the message is for "chatting"
        } else if ('text' in messageData) {
          if (messageData.sender === selectedUserId) {
            // Set messages array state, Concat by new message
            setMessages(prev => ([...prev, {...messageData}]));
          }
        }
    }

    //// PEOPLE ---------------------------------------------------
    // Set online people
    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    // Get offline poeple from database (on onlinePeople change)
    useEffect(() => {
        // get all users, filter out self and online people
        axios.get("/people").then(res => {
            const offlinePeopleArr = res.data
                .filter(p => p._id !== id)
                .filter(p => !Object.keys(onlinePeople).includes(p._id));

            // arr -> obj
            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
        });
    }, [onlinePeople]);

    // Delete our user from all onlinePeople
    const onlinePeopleExclOurUser = {...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    //// SEND CHAT ---------------------------------------------------
     // Sending Message to WS
     function sendMessage(e, file = null) {
        if (e) e.preventDefault();
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }));

        if (file) { // If send file, get all messages of Our & selectedUser from api, then set to messages array.
            axios.get("/messages/" + selectedUserId).then(res => {
                setMessages(res.data);
            });
        } else { // If send text, set that text to messages array
            setNewMessageText("");
            setMessages((prev) => ([...prev, {
                text: newMessageText, 
                sender: id,
                recipient: selectedUserId,
                _id: Date.now(),
            }]));
        }
    }

    // Sending File to WS
    function sendFile(e) {
        const reader = new FileReader();
        reader.readAsDataURL(e.target.files[0]); // convert file from binary to base64 string (suitable to send)
        reader.onload = () => { // Send file via sendMessage function, with fileName and base64 data
            sendMessage(null, { 
                name: e.target.files[0].name,
                data: reader.result,
            });
        };
    }

    /// RETRIVE CHAT ---------------------------------------------------
    // Get all messages of selectedUser (on selectedUserId change)
    useEffect(() => {
        if (selectedUserId) {
            axios.get("/messages/" + selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    }, [selectedUserId]);

    // Uniq messages state
    const messageWithoutDupes = uniqBy(messages, "_id");

    /// LOGOUT ----------------------------------------------------------
    function logout() {
        // post to clear cookies, then set context and ws to null.
        axios.post("/logout").then(() => {
            setId(null);
            setUsername(null);
            setWs(null);
        });
    }

    /// UI --------------------------------------------------------------
    // Auto scroll when messages array changed
    useEffect(() => {
        const div = divUnderMessage.current;
        if (div) {
            div.scrollIntoView({behavior: "smooth"});
        }
    }, [messages]);

    return (
        <div className="flex h-screen">
            <div className="bg-white w-1/3 flex flex-col">
                <div className="flex-grow">
                    <Logo />
                    {Object.keys(onlinePeopleExclOurUser).map(userId => (
                        <Contact 
                            key = {userId}
                            userId = {userId}
                            online = {true}
                            username = {onlinePeopleExclOurUser[userId]}
                            onClick = {() => setSelectedUserId(userId)}
                            selected = {userId === selectedUserId}
                        />
                    ))}
                    {Object.keys(offlinePeople).map(userId => (
                        <Contact 
                            key = {userId}
                            userId = {userId}
                            online = {false}
                            username = {offlinePeople[userId].username}
                            onClick = {() => setSelectedUserId(userId)}
                            selected = {userId === selectedUserId}
                        />
                    ))}
                </div>
                <div className="p-4 text-left">
                    <span className="mr-2 text-sm text-gray-600">
                        Welcome <b>{username}</b>
                    </span>
                    <button 
                        className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm"
                        onClick={logout}
                    >
                        logout
                    </button>
                </div>
            </div>
            <div className="flex flex-col bg-blue-100 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-gray-400">&larr; Select a person from the sidebar</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                {messageWithoutDupes.map((message) => (
                                    <div key={message._id} className={(message.sender === id ? "text-right": "text-left")}>
                                        <div className={"text-left inline-block p-2 m-2 rounded-md text-sm " + (message.sender === id ? "bg-blue-500 text-white" : "bg-white text-gray-500")}>
                                            {message.text}
                                            {message.file && (
                                                <div className="flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                        <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
                                                    </svg>
                                                    <a 
                                                        href={`https://${bucket}.s3.amazonaws.com/${message.file}`}
                                                        className="underline"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {message.file}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))} 
                                <div ref={divUnderMessage}></div>
                            </div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input 
                            type="text" 
                            value={newMessageText}
                            onChange={e => setNewMessageText(e.target.value)}
                            placeholder="Type your message here" 
                            className="bg-white flex-grow border p-2 rounded-sm" 
                        />
                        <label type="button" className="bg-blue-200 p-2 text-gray-600 rounded-sm border border-gray-200 cursor-pointer">
                            <input type="file" className="hidden" onChange={sendFile} />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
                            </svg>
                        </label>
                        <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
