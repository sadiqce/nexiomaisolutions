import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const PortalLogin = ({ navigate, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            
            const userCredential = await login(email, password);
            const user = userCredential.user;

            // Optional: Check if email is verified before allowing full access
            if (!user.emailVerified) {
                setError('Please verify your email address before logging in.');
                // await logout(); // Optional: force logout if you want strict enforcement
                return;
            }
            
            onLogin(); 
            
        } catch (err) {
            console.error(err);
            if(err.code === 'auth/invalid-credential') {
                setError('Incorrect email or password.');
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
                        
                        <div className="flex justify-between items-center text-sm pt-2">
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate('ForgotPassword'); }} className="text-gray-400 hover:text-purple-400">Forgot Password?</a>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                        <p className="text-gray-400 text-sm mb-3">Don't have an account?</p>
                        <button 
                            onClick={() => navigate('CreateAccount')}
                            className="text-fuchsia-400 font-semibold hover:underline"
                        >
                            Create New Account
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
export default PortalLogin;