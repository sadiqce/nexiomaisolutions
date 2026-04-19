import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createAirtableUser, checkUserExists } from '../services/airtableService';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

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

        // 1. Local Validations
        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match.");
        }

        if (!validatePassword(formData.password)) {
            return setError("Password must be at least 12 characters, with uppercase, lowercase, and numbers.");
        }

        try {
            setLoading(true);

            // 2. Check Uniqueness in Airtable
            try {
                const usernameExists = await checkUserExists('Username', formData.username);
                if (usernameExists) {
                    setLoading(false);
                    return setError("Username is already taken.");
                }

                const emailExists = await checkUserExists('Email', formData.email);
                if (emailExists) {
                    setLoading(false);
                    return setError("An account with this email is already registered.");
                }
            } catch (airtableErr) {
                console.error("Airtable check error:", airtableErr);
                setLoading(false);
                return setError("Unable to verify username/email availability. Please try again.");
            }

            // 3. Create User in Firebase Auth
            const userCredential = await signup(formData.email, formData.password);
            const user = userCredential.user;

            // 4. Update Firebase Profile
            await updateUserProfile(user, {
                displayName: formData.username
            });

            // 5. Create Airtable User Record
            await createAirtableUser({
                username: formData.username,
                email: formData.email,
                uid: user.uid
            });

            setInfo("Account created successfully! Please check your email to verify your account before logging in.");
            
            setTimeout(() => {
                navigate('PortalDashboard');
            }, 3000);

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already in use by another account.');
            } else {
                setError('Failed to create account. ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-7xl mx-auto px-4 py-32">
            <h2 className="text-4xl font-extrabold mb-8 text-center">Create Account</h2>
            <div className="flex justify-center">
                <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-gray-800 border border-purple-700">
                    
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
                    {info && <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-4 text-sm">{info}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white" placeholder="johndoe"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white" placeholder="you@company.com"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                            <p className="text-xs text-gray-500 mt-1">12+ chars, Uppercase, Lowercase, Number.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white"/>
                        </div>

                        <button disabled={loading} type="submit" className={`w-full ${BUTTON_GRADIENT} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        Already have an account?{' '}
                        <button onClick={() => navigate('PortalLogin')} className="text-fuchsia-400 hover:underline">
                            Log In
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CreateAccount;