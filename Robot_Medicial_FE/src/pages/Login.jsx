import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "@/assets/styles/login.css";

export default function Login() {
    const navigate = useNavigate();
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [showPass, setShowPass] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        if (user === "admin" && pass === "123456") {
            localStorage.setItem("token", "fake_token");
            navigate("/home");
        } else {
            alert("Sai tài khoản hoặc mật khẩu!");
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <form className="login-form" onSubmit={handleLogin}>
                    <h2>Đăng nhập hệ thống</h2>

                    <input
                        type="text"
                        placeholder="Tài khoản"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                    />

                    <div className="password-wrapper">
                        <input
                            type={showPass ? "text" : "password"}
                            placeholder="Mật khẩu"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                        />
                        <span
                            className="toggle-password"
                            onClick={() => setShowPass(!showPass)}
                        >
                            {showPass ? "👁️" : "🙈"}
                        </span>
                    </div>

                    <button type="submit">Đăng nhập</button>

                    <p
                        className="forgot-password"
                        onClick={() => navigate("/forgot-password")}
                    >
                        Quên mật khẩu?
                    </p>
                </form>
            </div>
        </div>
    );
}
