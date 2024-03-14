import { useContext } from "react";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import { UserContext } from "./UserContexts";
import Chat from "./Chat.jsx";


export default function Routes() {

    const { username, id } = useContext(UserContext);

    if (username) {
        return <Chat />
        // console.log(username)

    }


    return (
        <RegisterAndLoginForm />
    );
}