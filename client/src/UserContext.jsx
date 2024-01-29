/* eslint-disable react/prop-types */
import { createContext, useEffect } from "react";
import { useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

// useContext x useState provide loggedin username and id over the app.
export function UserContextProvider({children}) {
    const [username, setUsername] = useState(null);
    const [id, setId] = useState(null);

    // When first open the app, Check if there are token to set username & Id
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