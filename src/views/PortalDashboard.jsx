import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadFileToS3 } from '../services/s3Service';
import { fetchUserFiles, createFileRecord, getUser, getTopUpCredits } from '../services/airtableService';
import { triggerMakeScenarioForMultipleFiles } from '../services/makeService';
import { cancelSubscription, activateScheduledPlan, checkAndActivatePendingTier } from '../services/paymentService';
import { validateUpload, checkMonthlyLimit, getTierConfig } from '../services/tierLimitService';
import { validateDocumentPageCount } from '../utils/docxUtils';
import FileList from '../components/dashboard/FileList';
import MetricCard from '../components/common/MetricCard';
import PaymentModalEmbedded from '../components/payment/PaymentModalEmbedded';
import TopupModalEmbedded from '../components/payment/TopupModalEmbedded';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const PortalDashboard = ({ shouldShowUpgradeModal, setShouldShowUpgradeModal, onPaymentSuccess }) => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // To force re-fetch
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupCredits, setTopupCredits] = useState(0);
    const [paymentModalConfig, setPaymentModalConfig] = useState({
        type: 'plan',
        targetPlan: 'Standard',
    });
    const fileInputRef = useRef(null);
    const [info, setInfo] = useState('');
    const autoRefreshIntervalRef = useRef(null);
    
    const { currentUser, isEmailVerified, verifyEmail } = useAuth();
    const [userTier, setUserTier] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
    const [pendingTier, setPendingTier] = useState(null);
    const [pendingActivationDate, setPendingActivationDate] = useState(null);

    // 1. Fetch User Data and Files on Load
    useEffect(() => {
        if (currentUser && isEmailVerified) {
            const fetchFiles = async () => {
                try {
                    // Check and activate pending tier via backend
                    await checkAndActivatePendingTier(currentUser.uid);
                    
                    const user = await getUser(currentUser.uid);
                    if (user) {
                        setUserTier(user.Tier);
                        setSubscriptionStatus(user.SubscriptionStatus);
                        setSubscriptionEndDate(user.SubscriptionEndDate || null);
                        setPendingTier(user.PendingTier || null);
                        setPendingActivationDate(user.PendingActivationDate || null);

                        if (user.PendingTier && user.PendingActivationDate && new Date(user.PendingActivationDate) <= new Date()) {
                            await activateScheduledPlan(currentUser.uid, user);
                            const updatedUser = await getUser(currentUser.uid);
                            if (updatedUser) {
                                setUserTier(updatedUser.Tier);
                                setSubscriptionStatus(updatedUser.SubscriptionStatus);
                                setSubscriptionEndDate(updatedUser.SubscriptionEndDate || null);
                                setPendingTier(updatedUser.PendingTier || null);
                                setPendingActivationDate(updatedUser.PendingActivationDate || null);
                            }
                        }

                        // Get top-up credits
                        const credits = await getTopUpCredits(currentUser.uid);
                        setTopupCredits(credits || 0);
                    }
                    
                    const files = await fetchUserFiles(currentUser.uid);
                    setUploadedFiles(files);
                } catch (error) {
                    console.error('Failed to fetch files:', error);
                }
            };
            
            fetchFiles();
            
            // Auto-refresh file list every 15 seconds to catch Airtable updates
            autoRefreshIntervalRef.current = setInterval(fetchFiles, 15000);
            
            return () => {
                if (autoRefreshIntervalRef.current) {
                    clearInterval(autoRefreshIntervalRef.current);
                }
            };
        }
    }, [currentUser, isEmailVerified, refreshTrigger]);

    // 2. Periodically check for pending tier activation (every 60 seconds)
    useEffect(() => {
        if (currentUser) {
            const checkPendingInterval = setInterval(async () => {
                try {
                    await checkAndActivatePendingTier(currentUser.uid);
                } catch (error) {
                    console.error('Error checking pending tier:', error);
                }
            }, 60000); // Check every 60 seconds

            return () => clearInterval(checkPendingInterval);
        }
    }, [currentUser]);

    // Handle upgrade modal trigger from Header
    useEffect(() => {
        if (shouldShowUpgradeModal) {
            // Determine target plan based on current tier
            const currentTier = userTier || 'Sandbox';
            let targetPlan = 'Standard';
            if (currentTier === 'Standard') {
                targetPlan = 'Volume';
            }
            setPaymentModalConfig({
                type: 'plan',
                targetPlan: targetPlan,
            });
            setShowPaymentModal(true);
            setShouldShowUpgradeModal(false);
        }
    }, [shouldShowUpgradeModal, setShouldShowUpgradeModal, userTier]);

    const handleResendVerification = async () => {
        try {
            await verifyEmail(currentUser);
            setInfo('Verification email sent! Please check your inbox.');
        } catch (error) {
            console.error('Failed to resend verification email', error);
            setInfo('Failed to send verification email. Please try again.');
        }
    }

    const handleCancelSubscription = async () => {
        setIsCanceling(true);
        setCancelError('');
        
        try {
            await cancelSubscription(currentUser.uid);
            setInfo('✓ Subscription canceled successfully. Your plan remains active until the end of the billing period.');
            setShowCancelConfirm(false);
            // Refresh user data to reflect subscription status
            const user = await getUser(currentUser.uid);
            if (user) {
                setUserTier(user.Tier);
                setSubscriptionStatus(user.SubscriptionStatus);
                setSubscriptionEndDate(user.SubscriptionEndDate || null);
                setPendingTier(user.PendingTier || null);
                setPendingActivationDate(user.PendingActivationDate || null);
            }
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            setCancelError(`Failed to cancel subscription: ${error.message}`);
        } finally {
            setIsCanceling(false);
        }
    }

    const handleOpenPaymentModal = (planTier) => {
        setPaymentModalConfig({
            type: 'plan',
            targetPlan: planTier,
        });
        setShowPaymentModal(true);
    };

    const handlePaymentModalClose = (success = false) => {
        setShowPaymentModal(false);
        if (success) {
            // Refresh user data immediately after successful payment
            const fetchUserData = async () => {
                try {
                    const user = await getUser(currentUser.uid);
                    if (user) {
                        setUserTier(user.Tier);
                        setSubscriptionStatus(user.SubscriptionStatus);
                        setSubscriptionEndDate(user.SubscriptionEndDate || null);
                        setPendingTier(user.PendingTier || null);
                        setPendingActivationDate(user.PendingActivationDate || null);
                        
                        // Show appropriate success message
                        if (user.PendingTier) {
                            const activationDate = new Date(user.PendingActivationDate);
                            const now = new Date();
                            const daysLeft = Math.ceil((activationDate - now) / (1000 * 60 * 60 * 24));
                            setInfo(`✓ ${user.PendingTier} plan scheduled! Activates in ${daysLeft} days.`);
                        } else {
                            setInfo(`✓ Successfully upgraded to ${user.Tier} plan!`);
                        }
                        setTimeout(() => setInfo(''), 5000);
                        
                        // Notify parent component (App.jsx) to trigger header refresh
                        onPaymentSuccess?.();
                    }
                } catch (error) {
                    console.error('Failed to fetch user data:', error);
                }
            };
            fetchUserData();
            // Also trigger a refresh of the file list
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const handleOpenTopupModal = () => {
        setShowTopupModal(true);
    };

    const handleTopupModalClose = (success = false) => {
        setShowTopupModal(false);
        if (success) {
            // Refresh user data after successful top-up
            const fetchUserData = async () => {
                try {
                    const credits = await getTopUpCredits(currentUser.uid);
                    setTopupCredits(credits || 0);
                } catch (error) {
                    console.error('Failed to fetch top-up credits:', error);
                }
            };
            fetchUserData();
        }
    };

    // Refresh file list manually
    const handleRefreshFiles = async () => {
        setIsRefreshing(true);
        try {
            const files = await fetchUserFiles(currentUser.uid);
            setUploadedFiles(files);
            setInfo('File list refreshed. Check if processing is complete.');
            setTimeout(() => setInfo(''), 3000);
        } catch (error) {
            console.error('Failed to refresh files:', error);
            setInfo('Failed to refresh file list. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    }

    // Calculate total storage used in MB
    const calculateStorageUsed = () => {
        const totalBytes = uploadedFiles.reduce((sum, file) => {
            return sum + (typeof file.size === 'number' ? file.size : 0);
        }, 0);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        return totalMB;
    };

    // 2. Handle File Selection/Drop with Tier Validation
    const handleFileTransfer = useCallback(async (fileList) => {
        // If no tier is set, assume Sandbox (free)
        const effectiveTier = userTier || 'Sandbox';
        const tierConfig = getTierConfig(effectiveTier);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Count files uploaded this month
        const monthlyUploads = uploadedFiles.filter(file => {
            const uploadDate = new Date(file.uploadDate);
            return uploadDate.getMonth() === currentMonth && uploadDate.getFullYear() === currentYear;
        });

        const currentMonthlyUsage = monthlyUploads.length;
        const topUpCredits = 0; // TODO: Fetch from user profile/Airtable
        
        const newFiles = Array.from(fileList);
        let skippedCount = 0;
        let errorMessages = [];
        const successfullyUploadedFiles = [];
        
        // Process each file with validation
        for (const file of newFiles) {
            // Check if file already uploaded
            if (uploadedFiles.some(uploadedFile => uploadedFile.originalName === file.name)) {
                errorMessages.push(`File "${file.name}" has already been uploaded and will be skipped.`);
                skippedCount++;
                continue;
            }

            // Check PDF page count before other validations
            let pageCount = null;
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                const pdfValidation = await validateDocumentPageCount(file, tierConfig.maxPages);
                if (!pdfValidation.valid) {
                    errorMessages.push(pdfValidation.message);
                    skippedCount++;
                    continue;
                }
                pageCount = pdfValidation.pageCount;
            } else if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                // Check Word document page count
                const docxValidation = await validateDocumentPageCount(file, tierConfig.maxPages);
                if (!docxValidation.valid) {
                    errorMessages.push(docxValidation.message);
                    skippedCount++;
                    continue;
                }
                pageCount = docxValidation.pageCount;
            }

            // Validate file against tier limits (including page count for PDFs)
            const validation = validateUpload(
                file,
                currentMonthlyUsage + successfullyUploadedFiles.length,
                topUpCredits,
                effectiveTier,
                pageCount // Pass page count if extracted
            );

            if (!validation.isValid) {
                errorMessages.push(...validation.errors);
                skippedCount++;
                continue;
            }

            // Show warnings
            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    setInfo(warning);
                });
            }

            // A. Create temporary UI object (optimistic UI)
            const tempId = Date.now();
            const tempFile = {
                id: tempId,
                originalName: file.name,
                newName: 'Generating...',
                size: file.size,
                status: 'Uploading...',
                uploadDate: new Date().toISOString()
            };
            
            // Add to UI immediately
            setUploadedFiles(prev => [tempFile, ...prev]);

            // B. Upload to S3
            const uploadResult = await uploadFileToS3(file, currentUser);

            if (uploadResult.success) {
                // C. Save to Airtable with tier metadata
                await createFileRecord({
                    originalName: file.name,
                    size: file.size,
                    userId: currentUser.uid,
                    userTier: effectiveTier,
                    uploadTimestamp: new Date().toISOString(),
                    pageCount: pageCount // Store page count for PDFs
                });

                // Track successful upload for batch make.com request
                successfullyUploadedFiles.push({
                    originalName: file.name,
                    size: file.size
                });
            } else {
                // Handle failure (remove temp file or show error)
                console.error("Upload failed");
                setUploadedFiles(prev => prev.filter(f => f.id !== tempId));
                errorMessages.push(`Failed to upload ${file.name}`);
            }
        }

        // Display all error messages
        if (errorMessages.length > 0) {
            const errorSummary = errorMessages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n');
            setInfo(`Upload Blocked - Plan Restriction:\n${errorSummary}`);
        }

        // D. Trigger Make.com Scenario once for all successful uploads
        if (successfullyUploadedFiles.length > 0) {
            try {
                await triggerMakeScenarioForMultipleFiles(currentUser.uid, successfullyUploadedFiles);
                setInfo(`Successfully uploaded ${successfullyUploadedFiles.length} file(s)`);
            } catch (error) {
                console.error("Failed to trigger Make.com scenario:", error);
                setInfo(`Files uploaded but processing webhook failed. Check status later.`);
            }
        }

        // E. Refresh List to get the real Airtable record ID and formatting
        if (successfullyUploadedFiles.length > 0) {
            setRefreshTrigger(prev => prev + 1);
        }
    }, [currentUser, userTier, uploadedFiles]);

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsDragging(false); 
        handleFileTransfer(e.dataTransfer.files); 
    };

    if (!isEmailVerified) {
        return (
            <section className="max-w-7xl mx-auto px-4 py-32">
                <div className="flex justify-center">
                    <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-gray-800 border border-purple-700 text-center">
                        <h2 className="text-3xl font-extrabold mb-4">Verify Your Email</h2>
                        <p className="text-gray-400 mb-6">
                            Your account has been created, but you need to verify your email address to access the dashboard. Please check your inbox for a verification link.
                        </p>
                        {info && <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-4 text-sm">{info}</div>}
                        <button onClick={handleResendVerification} className={`${BUTTON_GRADIENT} px-6 py-2 rounded-xl font-medium`}>
                            Resend Verification Email
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-7xl mx-auto px-4 pt-4 pb-8">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h2 className="text-4xl font-extrabold">Welcome, {currentUser?.displayName}!</h2>
                    <p className="text-xl text-gray-400">Your Data Dashboard</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-2 mb-3">
                <MetricCard title="Total Files" value={uploadedFiles.length} unit="" color="purple" time="All Time" />
                <MetricCard title="Storage Used" value={calculateStorageUsed()} unit=" MB" color="green" time="Calculated" />
                <MetricCard title="Account Status" value="Active" unit="" color="green" time="Verified" />
            </div>

            {/* Top-Up Credits Card */}
            {topupCredits > 0 && (
                <div className="mb-3 p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-600">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-400 text-sm">Available Top-Up Credits</p>
                            <h3 className="text-2xl font-bold text-cyan-400">{topupCredits} documents</h3>
                        </div>
                        <button
                            onClick={handleOpenTopupModal}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
                        >
                            Buy More
                        </button>
                    </div>
                </div>
            )}
            
            <div className="p-6 rounded-xl bg-gray-800 border border-fuchsia-600 shadow-2xl">
                <h3 className="text-2xl font-semibold mb-6 text-white border-b border-gray-700 pb-3">File Management</h3>
                <input type="file" ref={fileInputRef} multiple className="hidden" onChange={(e) => handleFileTransfer(e.target.files)} />
                
                <div className="mb-4 flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`${BUTTON_GRADIENT} px-4 py-2 rounded-lg font-medium text-sm`}
                    >
                        Upload Files
                    </button>
                    <button 
                        onClick={handleRefreshFiles}
                        disabled={isRefreshing}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${isRefreshing ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
                    </button>
                </div>

                {info && (
                    <div className={`mb-4 p-3 rounded-lg text-sm whitespace-pre-wrap ${info.includes('Blocked') || info.includes('Failed') ? 'bg-red-900/50 border border-red-500 text-red-200' : 'bg-green-900/50 border border-green-500 text-green-200'}`}>
                        {info}
                    </div>
                )}
                
                <div 
                    onDragEnter={handleDragOver}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-4 border-dashed rounded-xl p-4 mb-4 text-center cursor-pointer ${isDragging ? 'border-fuchsia-500 bg-gray-900' : 'border-purple-700'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <svg className="mx-auto h-10 w-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 014 4.975V15a4 4 0 01-4 4H7a4 4 0 010-8z"></path></svg>
                    <p className="mt-2 text-md font-medium text-white">Drag & Drop files or Click to Upload</p>
                </div>
                
                <FileList files={uploadedFiles} />
            </div>

            {/* Payment Modal */}
            <PaymentModalEmbedded
                isOpen={showPaymentModal}
                onClose={handlePaymentModalClose}
                userId={currentUser?.uid}
                userEmail={currentUser?.email}
                currentTier={userTier}
                subscriptionStatus={subscriptionStatus}
                subscriptionEndDate={subscriptionEndDate}
                pendingTier={pendingTier}
                pendingActivationDate={pendingActivationDate}
                targetPlan={paymentModalConfig.targetPlan}
            />

            {/* Top-Up Modal */}
            <TopupModalEmbedded
                isOpen={showTopupModal}
                onClose={handleTopupModalClose}
                userId={currentUser?.uid}
                userEmail={currentUser?.email}
                currentCredits={topupCredits}
            />
        </section>
    );
};

export default PortalDashboard;