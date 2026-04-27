import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import { getUser } from './services/apiClient';
import { cancelSubscription } from './services/paymentService';
import HomeView from './views/HomeView';
import PortalLogin from './views/PortalLogin';
import PortalDashboard from './views/PortalDashboard';
import ForgotPassword from './views/ForgotPassword';
import CreateAccount from './views/CreateAccount'; // New Import
import PricingView from './views/PricingView';
import TermsOfUseView from './views/TermsOfUseView';

const AppContent = () => {
    const [currentPage, setCurrentPage] = useState('Home');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [shouldShowUpgradeModal, setShouldShowUpgradeModal] = useState(false);
    const [paymentRefreshTrigger, setPaymentRefreshTrigger] = useState(0); // Trigger for Header to refetch user data
    const { currentUser, logout } = useAuth();

    // Handle URL-based routing for direct portal access
    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/portal' || path === '/portal/') {
            setCurrentPage('PortalDashboard');
        } else if (path === '/pricing' || path === '/pricing/') {
            setCurrentPage('Pricing');
        } else if (path === '/terms' || path === '/terms/') {
            setCurrentPage('TermsOfUse');
        }
    }, []);

    const navigate = useCallback((page) => {
        setCurrentPage(page);
        // Update URL for portal
        if (page === 'PortalDashboard') {
            window.history.pushState({}, '', '/portal');
        } else if (page === 'Pricing') {
            window.history.pushState({}, '', '/pricing');
        } else if (page === 'TermsOfUse') {
            window.history.pushState({}, '', '/terms');
        } else if (page === 'Home') {
            window.history.pushState({}, '', '/');
        }
    }, []);

    // Redirect logic
    useEffect(() => {
        if (currentUser) {
            if (currentPage === 'PortalLogin' || currentPage === 'CreateAccount') {
                navigate('PortalDashboard');
            }
        }
    }, [currentUser, currentPage, navigate]);

    const handleSignOut = async () => {
        try {
            await logout();
            setUploadedFiles([]);
            navigate('PortalLogin');
        } catch (e) {
            console.error("Failed to log out", e);
        }
    };

    const getUserTier = useCallback(async (userId) => {
        try {
            const user = await getUser(userId);
            return user?.Tier || 'Sandbox';
        } catch (err) {
            console.error('Error fetching user tier:', err);
            return 'Sandbox';
        }
    }, []);

    const handleCancelSubscription = useCallback(async (userId) => {
        try {
            await cancelSubscription(userId);
            // Refresh the dashboard to show updated subscription status
            if (currentPage === 'PortalDashboard') {
                window.location.reload();
            }
        } catch (err) {
            console.error('Error canceling subscription:', err);
            throw err;
        }
    }, [currentPage]);

    const handleUpgradeClick = useCallback(() => {
        setShouldShowUpgradeModal(true);
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    // After user returns from Stripe
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success') {
            // Reload user data to get updated tier/credits
            // Currently handled by modals, but you may want explicit handling
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    }, []);
    let content;
    switch (currentPage) {
        case 'PortalLogin':
            content = <PortalLogin navigate={navigate} onLogin={() => navigate('PortalDashboard')} />;
            break;
        case 'CreateAccount': // New Route
            content = <CreateAccount navigate={navigate} />;
            break;
        case 'ForgotPassword':
            content = <ForgotPassword navigate={navigate} />;
            break;
        case 'Pricing':
            content = <PricingView />;
            break;
        case 'TermsOfUse':
            content = <TermsOfUseView />;
            break;
        case 'PortalDashboard':
            content = currentUser
                ? <PortalDashboard uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} signOut={handleSignOut} shouldShowUpgradeModal={shouldShowUpgradeModal} setShouldShowUpgradeModal={setShouldShowUpgradeModal} onPaymentSuccess={() => setPaymentRefreshTrigger(t => t + 1)} />
                : <PortalLogin navigate={navigate} onLogin={() => navigate('PortalDashboard')} />;
            break;
        case 'Home':
        default:
            content = <HomeView />;
            break;
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            <Header navigate={navigate} currentPage={currentPage} signOut={handleSignOut} currentUser={currentUser} getUserTier={getUserTier} onCancelSubscription={handleCancelSubscription} onUpgradeClick={handleUpgradeClick} paymentRefreshTrigger={paymentRefreshTrigger} />
            <main>{content}</main>
            <footer className="bg-blue-900 mt-12 p-8 text-center">
                <p className="text-blue-100 text-sm">&copy; {new Date().getFullYear()} Nexiom AI Solutions. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}