import React, { useState } from 'react';
import { MOCK_AUTH } from '../config/aws';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const PortalLogin = ({ navigate, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageClass, setMessageClass] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setMessage('');
        setMessageClass('');

        if (email === MOCK_AUTH.EMAIL && password === MOCK_AUTH.PASSWORD) {
            setMessage('Login successful! Redirecting to Dashboard...');
            setMessageClass('text-green-500');
            setTimeout(() => {
                onLogin();
                setEmail('');
                setPassword('');
            }, 2000);
        } else {
            setMessage('Login failed. Invalid email or password.');
            setMessageClass('text-red-500');
        }
    };

    return (
        <section className="max-w-7xl mx-auto px-4 py-40">
            <h2 className="text-4xl font-extrabold mb-12 text-center">Client Portal Login</h2>
            <div className="flex justify-center">
                <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-gray-800 border border-purple-700">
                    <h3 className="text-3xl font-bold mb-4 text-fuchsia-500 text-center">Access Your Solution</h3>
                    <p className="text-gray-400 mb-6 text-center p-3 rounded-lg bg-gray-700 text-sm">
                        <span className="font-bold text-white">Mock Credentials:</span> <code className="text-purple-400">{MOCK_AUTH.EMAIL}</code> / <code className="text-purple-400">{MOCK_AUTH.PASSWORD}</code>
                    </p>
                    <div className={`text-center font-medium mb-4 ${messageClass}`}>{message}</div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>
                        <button type="submit" className={`w-full ${BUTTON_GRADIENT}`}>Sign In Securely</button>
                        <p className="text-center text-sm text-gray-500 pt-2">
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate('ForgotPassword'); }} className="text-purple-500 hover:underline">Forgot Password?</a>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
};
export default PortalLogin;