import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

// ResigterAndLoginForm
export default function RegisterAndLoginForm() {
    // States and Context
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
    const [errorCode, setErrorCode] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const {setUsername:setLoggedInUsername, setId} = useContext(UserContext);

    async function handleSubmit(ev) {
        ev.preventDefault();
        // const url = isLoginOrRegister === "register" ? "register" : "login";
        try {
            const { data } = await axios.post(isLoginOrRegister, { username, password }); // Created user's Id : response from Regsiter endpoint
            setLoggedInUsername(username); // set context username
            setId(data.id); // set context id
            setErrorCode(null);
            setErrorMessage(null);
        } catch (error) {
            console.error("Error in register / login:", error);
            if (error.response) {
                if (error.response.status === 401) {
                    setErrorCode(401);
                    setErrorMessage("Incorrect username or password");
                } else if (error.response.status === 409) {
                    setErrorCode(409);
                    setErrorMessage("Username already exists");
                } else if (error.response.status === 404) {
                    setErrorCode(404);
                    setErrorMessage("User not found");
                }
            }
        }
    }
    
    
    return (
        <div className="bg-blue-50 h-screen flex items-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit} >
                <input value={username} 
                       onChange={ev => setUsername(ev.target.value)}
                       type="text"
                       placeholder="username"
                       className={"block w-full rounded-sm p-2 mb-2 border " + (errorCode && "border-red-500")}/>    
                {errorCode === 409 && (<p className="text-red-500 text-xs mb-2 ml-1">{errorMessage}</p>)}
                <input value={password}
                       onChange={ev => setPassword(ev.target.value)}
                       type="password"
                       placeholder="password"
                       className={"block w-full rounded-sm p-2 mb-2 border " + ([401, 404].includes(errorCode) && "border-red-500")}/> 
                {[401, 404].includes(errorCode) && (<p className="text-red-500 text-xs mb-2 ml-1">{errorMessage}</p>)}
                <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
                    {isLoginOrRegister === "register" ? "Register" : "Login"}
                </button>
                <div className="text-center mt-2">
                    {isLoginOrRegister === "register" && (
                        <div >
                            Already a member? 
                            <button className="ml-1" onClick={() => setIsLoginOrRegister("login")}>
                                Login here
                            </button>
                        </div>
                    )}
                    {isLoginOrRegister === "login" && (
                        <div>
                            Not a member?
                            <button className="ml-1" onClick={() => setIsLoginOrRegister("register")}>
                                Register here
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}