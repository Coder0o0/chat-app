import { useState, useContext } from "react";
// import { UserContext } from "./UserContext";
import axios from "axios";
import "./CSS/reg.css";
import { UserContext } from "./UserContexts.jsx";

export default function RegisterAndLoginForm() {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');
    // async function register(ev) {
    //     ev.preventDefault();
    //     await axios.post('/register', { username, password });
    // }

    async function handleSubmit(ev) {
        ev.preventDefault();
        const url = isLoginOrRegister === 'register' ? 'register' : 'login';
        const { data } = await axios.post(url, { username, password });
        setLoggedInUsername(username);
        setId(data.id);
    }

    return (
        <div className="RegBlock">
            <form className="form" onSubmit={handleSubmit}>
                <input value={username}
                    onChange={ev => setUsername(ev.target.value)}
                    type="text" placeholder="username" className="inputcss" />
                <input value={password}
                    onChange={ev => setPassword(ev.target.value)}
                    type="password" placeholder="password" className="inputcss" />
                <button className="inputcss regbut">
                    {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
                </button>
            </form>
            <div className="login">
                {isLoginOrRegister === 'register' && (
                    <div>
                        Already a member?
                        <button className="login-button" onClick={() => setIsLoginOrRegister('login')}>
                            Login here
                        </button>
                    </div>
                )}
                {isLoginOrRegister === 'login' && (
                    <div>
                        Dont have an account?
                        <button className="login-button" onClick={() => setIsLoginOrRegister('register')}>
                            Register
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

{/* <div className="bg-blue-50 h-screen flex items-center">
    <form className="w-64 mx-auto">
        <input type="text" placeholder="username" className="block w-full rounded-sm p-2 mb-2 border" />
        <input type="text" placeholder="password" className="block w-full rounded-sm p-2 mb-2 border" />
        <button className="bg-blue-500 text-white block w-full rounded-sm p-2 ">Register</button>
    </form>
</div> */}