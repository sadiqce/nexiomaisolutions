import React, { useState, useEffect } from 'react';

const TITLE_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent";
const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const Header = ({ navigate, currentPage, signOut, currentUser, getUserTier, onCancelSubscription, onUpgradeClick, paymentRefreshTrigger }) => {
    const isDashboard = currentPage === 'PortalDashboard';
    const [userTier, setUserTier] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [pendingPlan, setPendingPlan] = useState(null);
    const [daysUntilPlanChange, setDaysUntilPlanChange] = useState(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelError, setCancelError] = useState(null);

    // Fetch user tier and subscription status on mount and when currentUser changes
    useEffect(() => {
        if (isDashboard && currentUser && getUserTier) {
            fetchUserData();
        }
    }, [isDashboard, currentUser, getUserTier, paymentRefreshTrigger]);

    const fetchUserData = async () => {
        try {
            const { getUser } = await import('../../services/airtableService');
            const user = await getUser(currentUser.uid);
            setUserTier(user?.Tier || 'Sandbox');
            setSubscriptionStatus(user?.SubscriptionStatus || 'inactive');
            
            // Set pending plan info if exists
            if (user?.PendingTier && user?.PendingActivationDate) {
                setPendingPlan({
                    plan: user.PendingTier,
                    startDate: user.PendingActivationDate
                });
            } else {
                setPendingPlan(null);
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    };

    // Calculate days until plan change
    useEffect(() => {
        if (pendingPlan && pendingPlan.startDate) {
            const calculateDaysRemaining = () => {
                const now = new Date();
                const startDate = new Date(pendingPlan.startDate);
                const daysRemaining = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
                setDaysUntilPlanChange(Math.max(0, daysRemaining));
            };
            calculateDaysRemaining();
            const interval = setInterval(calculateDaysRemaining, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [pendingPlan]);

    const getPlanDetails = () => {
        const planInfo = {
            'Sandbox': {
                limit: '5 documents/mo',
                retention: '24 hours',
                maxPages: '2 pages',
                maxFileSize: '2 MB',
                features: [
                    'Standard AI extraction',
                    'View-only Compliance Ledger',
                    'Top-Up packs available'
                ]
            },
            'Free': {
                limit: '5 documents/mo',
                retention: '24 hours',
                maxPages: '2 pages',
                maxFileSize: '2 MB',
                features: [
                    'Standard AI extraction',
                    'View-only Compliance Ledger',
                    'Top-Up packs available'
                ]
            },
            'Standard': {
                limit: '100 documents/mo',
                retention: '7 days',
                maxPages: '10 pages',
                maxFileSize: '10 MB',
                features: [
                    'Standard AI extraction',
                    'Top-Up packs available',
                    'Auto-renewal with cancel anytime'
                ]
            },
            'Volume': {
                limit: '500 documents/mo',
                retention: '14 days',
                maxPages: '25 pages',
                maxFileSize: '25 MB',
                features: [
                    'Standard AI extraction',
                    'Top-Up packs available',
                    'Auto-renewal with cancel anytime'
                ]
            }
        };
        return planInfo[userTier] || planInfo['Sandbox'];
    };

    const handleCancelClick = async () => {
        if (!onCancelSubscription || !currentUser) return;
        setIsCanceling(true);
        setCancelError(null);
        try {
            console.log(`Initiating subscription cancellation for user ${currentUser.uid}...`);
            await onCancelSubscription(currentUser.uid);
            console.log(`✓ Subscription cancelled successfully`);
            setShowCancelConfirm(false);
        } catch (err) {
            const errorMessage = err?.message || 'Failed to cancel subscription';
            console.error('Error canceling subscription:', err);
            setCancelError(errorMessage);
        } finally {
            setIsCanceling(false);
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-[#0d0a1b] bg-opacity-95 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('Home'); }} className="text-3xl font-extrabold tracking-tight">
                    <span className={TITLE_GRADIENT}>Nexiom</span> AI Solutions
                </a>

                <div className="flex space-x-4 items-center">
                    <a href="#" 
                        onClick={(e) => { e.preventDefault(); navigate('Pricing'); }} 
                        className="text-white px-4 py-2 rounded-xl font-medium transition duration-300 ease-in-out hover:text-fuchsia-500 hover:bg-gray-800"
                    >
                        Pricing
                    </a>
                    <a href="#" 
                        onClick={(e) => { e.preventDefault(); navigate('TermsOfUse'); }} 
                        className="text-white px-4 py-2 rounded-xl font-medium transition duration-300 ease-in-out hover:text-fuchsia-500 hover:bg-gray-800"
                    >
                        Terms & Limits
                    </a>
                    {isDashboard ? (
                        <>
                            {/* Current Plan Display with Details */}
                            <div className="group relative">
                                <div className="flex items-center px-4 py-2 bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-700 transition">
                                    <div>
                                        <p className="text-xs text-gray-400">Current Plan</p>
                                        <p className="text-sm font-semibold text-purple-400">{userTier || 'Loading...'}</p>
                                        {daysUntilPlanChange !== null && daysUntilPlanChange > 0 && (
                                            <p className="text-xs text-green-400 mt-1">
                                                {pendingPlan?.plan} starts in {daysUntilPlanChange} day{daysUntilPlanChange !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <div className="p-4 border-b border-gray-700">
                                        <h3 className="text-white font-semibold mb-3">{userTier || 'Sandbox'} Plan</h3>
                                        {getPlanDetails() && (
                                            <div className="space-y-2 text-xs text-gray-300">
                                                <div className="flex items-start">
                                                    <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                                                    <span>{getPlanDetails().limit}</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                                                    <span>Max file size: {getPlanDetails().maxFileSize}</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                                                    <span>Max {getPlanDetails().maxPages} per document</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                                                    <span>{getPlanDetails().retention} file retention</span>
                                                </div>
                                                {getPlanDetails().features && getPlanDetails().features.length > 0 && (
                                                    <div className="pt-2 border-t border-gray-700">
                                                        {getPlanDetails().features.map((feature, idx) => (
                                                            <div key={idx} className="flex items-start mt-2">
                                                                <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                                                                <span>{feature}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {userTier !== 'Volume' && (
                                        <div className="p-3 border-t border-gray-700">
                                            <button 
                                                onClick={() => onUpgradeClick && onUpgradeClick()}
                                                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded transition"
                                            >
                                                Upgrade Plan
                                            </button>
                                        </div>
                                    )}
                                    {userTier === 'Volume' && (
                                        <div className="p-3 border-t border-gray-700">
                                            <p className="text-xs text-green-400 text-center">✓ Highest tier</p>
                                        </div>
                                    )}
                                    {subscriptionStatus === 'active' && userTier !== 'Sandbox' && (
                                        <div className="p-3 border-t border-gray-700">
                                            <button 
                                                onClick={() => setShowCancelConfirm(true)}
                                                className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold rounded transition"
                                            >
                                                Cancel Subscription
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Cancel Confirmation Modal */}
                                {showCancelConfirm && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md">
                                            <h3 className="text-white font-semibold mb-2">Cancel Subscription</h3>
                                            <p className="text-gray-300 text-sm mb-4">
                                                Are you sure you want to cancel your {userTier} subscription? You'll be downgraded to the Sandbox plan.
                                            </p>
                                            {cancelError && (
                                                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
                                                    {cancelError}
                                                </div>
                                            )}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setShowCancelConfirm(false);
                                                        setCancelError(null);
                                                    }}
                                                    disabled={isCanceling}
                                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition disabled:opacity-50"
                                                >
                                                    Keep Subscription
                                                </button>
                                                <button
                                                    onClick={handleCancelClick}
                                                    disabled={isCanceling}
                                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
                                                >
                                                    {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={signOut}
                                className="border border-red-500 text-red-400 px-4 py-2 rounded-xl font-medium transition duration-300 hover:bg-red-900/30 hover:shadow-md"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <a href="#" 
                            onClick={(e) => { e.preventDefault(); navigate('PortalLogin'); }} 
                            className="text-white px-4 py-2 rounded-xl font-medium transition duration-300 ease-in-out hover:text-fuchsia-500 hover:bg-gray-800 flex items-center"
                        >
                            Client Portal
                        </a>
                    )}
                    {!isDashboard && (
                        <button 
                            onClick={() => currentPage === 'Home' ? document.getElementById('contact-form-section')?.scrollIntoView({ behavior: 'smooth' }) : navigate('Home')}
                            className={BUTTON_GRADIENT}
                        >
                            Get in Touch
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;