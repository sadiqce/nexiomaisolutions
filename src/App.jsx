import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import Context
import Header from './components/layout/Header';
import HomeView from './views/HomeView';
import PortalLogin from './views/PortalLogin';
import PortalDashboard from './views/PortalDashboard';
import ForgotPassword from './views/ForgotPassword';

// Internal component to handle routing based on Auth State
const AppContent = () => {
    const [currentPage, setCurrentPage] = useState('Home');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    
    // Get Auth State from Context
    const { currentUser, logout } = useAuth(); 

    const navigate = useCallback((page) => {
        setCurrentPage(page);
        const pageToPath = {
            'Home': '/',
            'PortalLogin': '/login',
            'PortalDashboard': '/dashboard',
            'ForgotPassword': '/forgot-password',
        };
        const path = pageToPath[page] || '/';
        window.history.pushState(null, '', path);
    }, []);

    // Update page from URL on load and popstate
    useEffect(() => {
        const updatePageFromURL = () => {
            const pathToPage = {
                '/': 'Home',
                '/login': 'PortalLogin',
                '/dashboard': 'PortalDashboard',
                '/forgot-password': 'ForgotPassword',
            };
            if (window.location.search.startsWith('?/')) {
                const path = '/' + window.location.search.slice(2).split('&')[0].replace(/~and~/g, '&');
                const page = pathToPage[path] || 'Home';
                setCurrentPage(page);
                window.history.replaceState(null, '', path);
            } else {
                const page = pathToPage[window.location.pathname] || 'Home';
                setCurrentPage(page);
            }
        };
        updatePageFromURL();
        window.addEventListener('popstate', updatePageFromURL);
        return () => window.removeEventListener('popstate', updatePageFromURL);
    }, []);

    // If user logs in via Firebase, automatically show Dashboard
    useEffect(() => {
        if (currentUser) {
            // Optional: You might want to stay on Home if they just landed there, 
            // but for this flow, we redirect to dashboard on login.
            // Check if we are on login page to redirect
            if (currentPage === 'PortalLogin') {
                navigate('PortalDashboard');
            }
        }
    }, [currentUser, currentPage, navigate]);

    const handleSignOut = async () => {
        try {
            await logout();
            setUploadedFiles([]);
            navigate('PortalLogin');
        } catch {
            console.error("Failed to log out");
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    let content;
    switch (currentPage) {
        case 'PortalLogin':
            content = <PortalLogin navigate={navigate} onLogin={() => navigate('PortalDashboard')} />;
            break;
        case 'ForgotPassword':
            content = <ForgotPassword navigate={navigate} />;
            break;
        case 'PortalDashboard':
            // Protect Route: Only show if currentUser exists
            content = currentUser 
                ? <PortalDashboard uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} signOut={handleSignOut} />
                : <PortalLogin navigate={navigate} onLogin={() => navigate('PortalDashboard')} />;
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
};

// Wrap the whole app in the AuthProvider
export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}