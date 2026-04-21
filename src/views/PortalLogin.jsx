import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

            if (!user.emailVerified) {
                setError('Please verify your email address before logging in.');
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
        <section className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="mb-4 inline-block p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
                        <div className="text-white text-2xl font-bold">Nexiom</div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in to your account</h1>
                    <p className="text-gray-600 text-sm">Access your Nexiom AI Solutions portal</p>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-6 sm:p-8 shadow-sm hover:shadow-md transition">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                            <input 
                                id="email"
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"
                                placeholder="name@company.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input 
                                id="password"
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"
                                placeholder="••••••••"
                            />
                        </div>
                        <button 
                            disabled={loading} 
                            type="submit" 
                            className={`w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg transition ${
                                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                            }`}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                        
                        <div className="text-center pt-2">
                            <a 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); navigate('ForgotPassword'); }} 
                                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                Forgot your password?
                            </a>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-blue-100 text-center">
                        <p className="text-gray-600 text-sm mb-2">Don't have an account?</p>
                        <button 
                            onClick={() => navigate('CreateAccount')}
                            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                        >
                            Create an account
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
export default PortalLogin;