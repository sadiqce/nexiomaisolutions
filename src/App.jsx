import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/layout/Header';
import HomeView from './views/HomeView';
import PortalLogin from './views/PortalLogin';
import PortalDashboard from './views/PortalDashboard';
import ForgotPassword from './views/ForgotPassword';

export default function App() {
    const [currentPage, setCurrentPage] = useState('Home');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const navigate = useCallback((page) => setCurrentPage(page), []);

    const handleLoginSuccess = useCallback(() => {
        setIsLoggedIn(true);
        navigate('PortalDashboard');
    }, [navigate]);

    const handleSignOut = useCallback(() => {
        setIsLoggedIn(false);
        setUploadedFiles([]);
        navigate('PortalLogin');
    }, [navigate]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    let content;
    switch (currentPage) {
        case 'PortalLogin':
            content = <PortalLogin navigate={navigate} onLogin={handleLoginSuccess} />;
            break;
        case 'ForgotPassword':
            content = <ForgotPassword navigate={navigate} />;
            break;
        case 'PortalDashboard':
            content = isLoggedIn 
                ? <PortalDashboard uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} signOut={handleSignOut} />
                : <PortalLogin navigate={navigate} onLogin={handleLoginSuccess} />;
            break;
        case 'Home':
        default:
            content = <HomeView />;
            break;
    }

    return (
        <div className="min-h-screen bg-[#0d0a1b] text-gray-200 font-sans">
            <Header navigate={navigate} currentPage={currentPage} signOut={handleSignOut} />
            <main>{content}</main>
            <footer className="bg-gray-900 mt-20 p-8 text-center border-t border-purple-800">
                <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Nexiom AI Solutions.</p>
            </footer>
        </div>
    );
}
