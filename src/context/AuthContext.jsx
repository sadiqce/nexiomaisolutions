import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [loading, setLoading] = useState(true);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email, password) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        return userCredential;
    };

    const logout = () => {
        return firebaseSignOut(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const verifyEmail = (user) => {
        return sendEmailVerification(user);
    };

    const updateUserProfile = (user, profileData) => {
        return updateProfile(user, profileData);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                setIsEmailVerified(user.emailVerified);
            } else {
                setIsEmailVerified(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        isEmailVerified,
        login,
        signup,
        logout,
        resetPassword,
        verifyEmail,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};