import axios from "axios"
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  axios.defaults.withCredentials = false;

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  )
}

export default App
