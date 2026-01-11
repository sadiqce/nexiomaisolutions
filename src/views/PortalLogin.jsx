import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const PortalLogin = ({ navigate, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Get login function from our new Context
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setError('');
            setLoading(true);
            
            // 1. Call Firebase Login
            await login(email, password);
            
            // 2. If successful, navigate
            onLogin(); 
            
        } catch (err) {
            console.error(err);
            // Map Firebase error codes to readable messages
            if(err.code === 'auth/invalid-credential') {
                setError('Incorrect email or password.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Try again later.');
            } else {
                setError('Failed to log in. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-7xl mx-auto px-4 py-40">
            <h2 className="text-4xl font-extrabold mb-12 text-center">Client Portal Login</h2>

            <div className="flex justify-center">
                <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-gray-800 border border-purple-700">
                    <h3 className="text-3xl font-bold mb-4 text-fuchsia-500 text-center">Access Your Solution</h3>
                    
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4 text-center text-sm">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>
                        <button disabled={loading} type="submit" className={`w-full ${BUTTON_GRADIENT} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {loading ? 'Signing In...' : 'Sign In Securely'}
                        </button>
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