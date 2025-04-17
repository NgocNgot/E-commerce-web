"use client"
import { useState } from "react"
import type React from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"

interface LoginModalProps {
    onClose: () => void
    onLoginSuccess: (user: any, token: string) => void
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error] = useState("")

    const handleLogin = async () => {
        try {
            const response = await fetch("http://localhost:1337/api/auth/local", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    identifier: email,
                    password: password,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            console.log("Login successful", data);

            // Call onLoginSuccess with user data and token
            onLoginSuccess(data.user, data.jwt);

            alert("Log in successfully!");
            onClose();
        } catch (error) {
            console.error("Error during login:", error)
        }
    }

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-opacity-50 backdrop-blur-sm z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
                <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={onClose}>
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <h2 className="text-center text-4xl font-extrabold mb-4">Login</h2>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <input
                    type="email"
                    placeholder="Your email"
                    className="w-full p-2 border border-gray-300 rounded mb-3 focus:ring-rose-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-2 border border-gray-300 rounded mb-3 focus:ring-rose-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <a href="#" className="text-rose-400 text-sm block mb-4 hover:underline">
                    Forgot your password?
                </a>

                <button onClick={handleLogin} className="uppercase w-full bg-black text-white p-2 rounded hover:bg-rose-500">
                    Login
                </button>

                <button className="uppercase w-full mt-2 border border-black p-2 rounded hover:bg-gray-100">
                    Create Account
                </button>
            </div>
        </div>
    )
}

export default LoginModal

