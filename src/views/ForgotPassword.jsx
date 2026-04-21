import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = ({ navigate }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setMessage('');
            setError('');
            setLoading(true);
            
            await resetPassword(email);
            setMessage('Check your inbox for password reset instructions.');
            
            setTimeout(() => {
                navigate('PortalLogin');
            }, 5000);

        } catch (err) {
            console.error(err);
            setError('Failed to send reset email. Check the email address and try again.');
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h1>
                    <p className="text-gray-600 text-sm">Enter your email address and we'll send you a reset link</p>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-lg p-6 sm:p-8 shadow-sm hover:shadow-md transition">
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                    {message && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>}
                    
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
                                placeholder="you@company.com"
                            />
                        </div>
                        <button 
                            disabled={loading} 
                            type="submit" 
                            className={`w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg transition ${
                                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                            }`}
                        >
                            {loading ? 'Sending...' : 'Send reset link'}
                        </button>
                        <p className="text-center text-sm pt-2 border-t border-blue-100 mt-4">
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate('PortalLogin'); }} className="text-blue-600 hover:text-blue-700 font-semibold">Back to sign in</a>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
};
export default ForgotPassword;