import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

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
            
            // Call Firebase Password Reset
            await resetPassword(email);
            setMessage('Check your inbox for password reset instructions.');
            
            // Optional: Redirect after delay
            setTimeout(() => {
                navigate('PortalLogin');
            }, 5000);

        } catch (err) {
            console.error(err);
            setError('Failed to reset password. Ensure the email is correct.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <section className="max-w-7xl mx-auto px-4 py-40">
            <h2 className="text-4xl font-extrabold mb-12 text-center">Reset Your Password</h2>
            <div className="flex justify-center">
                <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-gray-800 border border-purple-700">
                    <h3 className="text-3xl font-bold mb-4 text-fuchsia-500 text-center">Password Recovery</h3>
                    <p className="text-gray-400 mb-6 text-center">Enter the email address associated with your account.</p>
                    
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4 text-center text-sm">{error}</div>}
                    {message && <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-2 rounded mb-4 text-center text-sm">{message}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>
                        <button disabled={loading} type="submit" className={`w-full ${BUTTON_GRADIENT}`}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
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