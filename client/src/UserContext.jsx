/* eslint-disable react/prop-types */
import { createContext, useEffect } from "react";
import { useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

export function UserContextProvider({children}) {
    const [username, setUsername] = useState(null);
    const [id, setId] = useState(null);

    useEffect(() => {
        axios.get("/profile").then(res => {
            setId(res.data.userId);
            setUsername(res.data.username);
        });
    }, []);

    return (
        <UserContext.Provider value={{username, setUsername, id, setId}}>
            {children}
        </UserContext.Provider>
    );
}