import React, { useState, useEffect } from 'react';

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
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('Home'); }} className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">Nexiom AI Solutions</span>
                </a>

                <nav className="hidden md:flex items-center gap-6">
                    <a href="#" 
                        onClick={(e) => { e.preventDefault(); navigate('Pricing'); }} 
                        className="text-sm text-gray-600 hover:text-gray-900 transition"
                    >
                        Pricing
                    </a>
                    <a href="#" 
                        onClick={(e) => { e.preventDefault(); navigate('TermsOfUse'); }} 
                        className="text-sm text-gray-600 hover:text-gray-900 transition"
                    >
                        Terms & Limits
                    </a>
                </nav>

                <div className="flex items-center gap-3 sm:gap-4">
                    {isDashboard ? (
                        <>
                            {/* Current Plan Display */}
                            <div className="group relative">
                                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition text-sm">
                                    <span className="text-gray-600">Plan:</span>
                                    <span className="font-semibold text-blue-600">{userTier || 'Loading'}</span>
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <div className="p-4 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 text-sm">{userTier || 'Sandbox'} Plan</h3>
                                        {getPlanDetails() && (
                                            <div className="space-y-2 text-xs text-gray-600">
                                                <div className="flex items-start">
                                                    <span className="text-blue-600 mr-2 flex-shrink-0">✓</span>
                                                    <span>{getPlanDetails().limit}</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="text-blue-600 mr-2 flex-shrink-0">✓</span>
                                                    <span>Max file size: {getPlanDetails().maxFileSize}</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="text-blue-600 mr-2 flex-shrink-0">✓</span>
                                                    <span>Max {getPlanDetails().maxPages} per document</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="text-blue-600 mr-2 flex-shrink-0">✓</span>
                                                    <span>{getPlanDetails().retention} file retention</span>
                                                </div>
                                                {getPlanDetails().features && getPlanDetails().features.length > 0 && (
                                                    <div className="pt-2 border-t border-gray-200">
                                                        {getPlanDetails().features.map((feature, idx) => (
                                                            <div key={idx} className="flex items-start mt-2">
                                                                <span className="text-blue-600 mr-2 flex-shrink-0">✓</span>
                                                                <span>{feature}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {userTier !== 'Volume' && (
                                        <div className="p-3 border-t border-gray-200">
                                            <button 
                                                onClick={() => onUpgradeClick && onUpgradeClick()}
                                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition"
                                            >
                                                Upgrade Plan
                                            </button>
                                        </div>
                                    )}
                                    {userTier === 'Volume' && (
                                        <div className="p-3 border-t border-gray-200">
                                            <p className="text-xs text-gray-600 text-center">✓ Highest tier</p>
                                        </div>
                                    )}
                                    {subscriptionStatus === 'active' && userTier !== 'Sandbox' && (
                                        <div className="p-3 border-t border-gray-200">
                                            <button 
                                                onClick={() => setShowCancelConfirm(true)}
                                                className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded transition"
                                            >
                                                Cancel Subscription
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Cancel Confirmation Modal */}
                                {showCancelConfirm && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
                                            <h3 className="font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
                                            <p className="text-gray-600 text-sm mb-4">
                                                Are you sure you want to cancel your {userTier} subscription? You'll be downgraded to the Sandbox plan.
                                            </p>
                                            {cancelError && (
                                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
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
                                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition disabled:opacity-50"
                                                >
                                                    Keep Subscription
                                                </button>
                                                <button
                                                    onClick={handleCancelClick}
                                                    disabled={isCanceling}
                                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition disabled:opacity-50"
                                                >
                                                    {isCanceling ? 'Canceling...' : 'Cancel'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={signOut}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <a href="#" 
                                onClick={(e) => { e.preventDefault(); navigate('PortalLogin'); }} 
                                className="text-sm text-gray-600 hover:text-gray-900 transition"
                            >
                                Portal
                            </a>
                            <button 
                                onClick={() => currentPage === 'Home' ? document.getElementById('contact-form-section')?.scrollIntoView({ behavior: 'smooth' }) : navigate('Home')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                            >
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;