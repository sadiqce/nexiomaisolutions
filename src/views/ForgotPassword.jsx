import React, { useState } from 'react';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const ForgotPassword = ({ navigate }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [messageClass, setMessageClass] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) {
            setMessage('Please enter your email.');
            setMessageClass('text-red-500');
            return;
        }
        setMessageClass('text-green-500');
        setMessage(`Success! A password reset link has been sent to ${email}. Redirecting to login...`);
        setTimeout(() => {
            navigate('PortalLogin');
            setEmail('');
        }, 3000);
    };
    
    return (
        <section className="max-w-7xl mx-auto px-4 py-40">
            <h2 className="text-4xl font-extrabold mb-12 text-center">Reset Your Password</h2>
            <div className="flex justify-center">
                <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-gray-800 border border-purple-700">
                    <h3 className="text-3xl font-bold mb-4 text-fuchsia-500 text-center">Password Recovery</h3>
                    <p className="text-gray-400 mb-6 text-center">Enter the email address associated with your account.</p>
                    <div className={`text-center font-medium mb-4 ${messageClass}`}>{message}</div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>
                        <button type="submit" className={`w-full ${BUTTON_GRADIENT}`}>Send Reset Link</button>
                        <p className="text-center text-sm text-gray-500 pt-2">
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate('PortalLogin'); }} className="text-purple-500 hover:underline">Back to Sign In</a>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
};
export default ForgotPassword;
