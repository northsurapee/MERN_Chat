import { useRef, useContext, useEffect, useState } from "react"
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import {uniqBy} from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setOfflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const {username, setUsername, id, setId} = useContext(UserContext);
    const [newMessageText, setNewMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const divUnderMessage = useRef();

    useEffect(() => {
        console.log("Reconnecting")
        connectToWs();
      }, [selectedUserId]); // To re-create listener function with latest "selectedUserId" (Because value of the state is still be the same when function is created)

    function connectToWs() {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', handleMessage);
        ws.addEventListener('close', () => {
          setTimeout(() => {
            console.log('Disconnected. Trying to reconnect.');
            connectToWs();
          }, 1000);
        });
      }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data);
        if ('online' in messageData) {
          showOnlinePeople(messageData.online);
        } else if ('text' in messageData) {
          if (messageData.sender === selectedUserId) {
            setMessages(prev => ([...prev, {...messageData}]));
          }
        }
    }

    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    function logout() {
        axios.post("/logout").then(() => {
            setId(null);
            setUsername(null);
            setWs(null);
        });
    }

    // Sending Message with WebSockets
    function sendMessage(e, file = null) {
        if (e) e.preventDefault();
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }));

        if (file) { 
            axios.get("/messages/" + selectedUserId).then(res => {
                setMessages(res.data);
            });
        } else { // If send text
            setNewMessageText("");
            setMessages((prev) => ([...prev, {
                text: newMessageText, 
                sender: id,
                recipient: selectedUserId,
                _id: Date.now(),
            }]));
        }
    }

    // Reading and Sending File with WebSockets
    function sendFile(e) {
        const reader = new FileReader();
        reader.readAsDataURL(e.target.files[0]); // resurn base 64 data
        reader.onload = () => {
            sendMessage(null, {
                name: e.target.files[0].name,
                data: reader.result,
            });
        };
    }

    // Auto scroll when messages array changed
    useEffect(() => {
        const div = divUnderMessage.current;
        if (div) {
            div.scrollIntoView({behavior: "smooth"});
        }
    }, [messages]);

    // Get offline poeple from database
    useEffect(() => {
        axios.get("/people").then(res => {
            const offlinePeopleArr = res.data
                .filter(p => p._id !== id)
                .filter(p => !Object.keys(onlinePeople).includes(p._id));

            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
            console.log(offlinePeople);
        });
    }, [onlinePeople]);

    useEffect(() => {
        if (selectedUserId) {
            axios.get("/messages/" + selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    }, [selectedUserId]);

    // Delete our user from all onlinePeople
    const onlinePeopleExclOurUser = {...onlinePeople};
    console.log(onlinePeopleExclOurUser);
    delete onlinePeopleExclOurUser[id];

    const messageWithoutDupes = uniqBy(messages, "_id");

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
                                                        href={axios.defaults.baseURL + "/uploads/" + message.file}
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
