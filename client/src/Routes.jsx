import { useContext } from "react";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import { UserContext } from "./UserContext"
import Chat from "./Chat";

// Routes for navigate user to "Chat" if token exist (from context), otherwise "RegisterAndLoginForm"
export default function Routes() {
    // When loggedin or registerd, Cookies is set and context change.
    // So Routes will navigate to Chat!
    const {username} = useContext(UserContext);

    if (username) {
        return <Chat />
    }

    return (
        <RegisterAndLoginForm />
    );
}