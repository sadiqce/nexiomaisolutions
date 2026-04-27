import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createAirtableUser, checkUserExists } from '../services/apiClient';

const CreateAccount = ({ navigate }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup, verifyEmail, updateUserProfile, logout } = useAuth();

    const validatePassword = (pwd) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;
        return regex.test(pwd);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match.");
        }

        if (!validatePassword(formData.password)) {
            return setError("Password must be at least 12 characters with uppercase, lowercase, and numbers.");
        }

        try {
            setLoading(true);

            try {
                const usernameExists = await checkUserExists('Username', formData.username);
                if (usernameExists) {
                    setLoading(false);
                    return setError("Username is already taken.");
                }

                const emailExists = await checkUserExists('Email', formData.email);
                if (emailExists) {
                    setLoading(false);
                    return setError("An account with this email already exists.");
                }
            } catch (airtableErr) {
                console.error("Airtable check error:", airtableErr);
                setLoading(false);
                return setError("Unable to verify availability. Please try again.");
            }

            const userCredential = await signup(formData.email, formData.password);
            const user = userCredential.user;

            await updateUserProfile(user, {
                displayName: formData.username
            });

            await createAirtableUser({
                username: formData.username,
                email: formData.email,
                uid: user.uid
            });

            setInfo("Account created! Check your email to verify before logging in.");
            
            setTimeout(() => {
                navigate('PortalDashboard');
            }, 3000);

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already in use.');
            } else {
                setError('Failed to create account: ' + err.message);
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
                    <p className="text-gray-600 text-sm">Join Nexiom AI Solutions and start processing documents</p>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-6 sm:p-8 shadow-sm hover:shadow-md transition">
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                    {info && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{info}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                            <input 
                                id="username"
                                type="text" 
                                name="username" 
                                value={formData.username} 
                                onChange={handleChange} 
                                required 
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"
                                placeholder="johndoe"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                            <input 
                                id="email"
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"
                                placeholder="you@company.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input 
                                id="password"
                                type="password" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-gray-600 mt-1">At least 12 characters with uppercase, lowercase, and numbers</p>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
                            <input 
                                id="confirmPassword"
                                type="password" 
                                name="confirmPassword" 
                                value={formData.confirmPassword} 
                                onChange={handleChange} 
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
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-blue-100 text-center text-sm">
                        <span className="text-gray-600">Already have an account? </span>
                        <button 
                            onClick={() => navigate('PortalLogin')} 
                            className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CreateAccount;