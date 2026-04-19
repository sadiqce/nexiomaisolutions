import React, { useState, useEffect } from 'react';
import { redirectToTopupCheckout, TOPUP_PACKS } from '../../services/paymentService';
import { getUser } from '../../services/airtableService';

/**
 * TopupModal - Purchase additional documents
 * Redirects to Stripe Payment Link when user clicks Buy
 */
const TopupModal = ({ isOpen, onClose, userId, userEmail, currentTopupCredits = 0 }) => {
  const [selectedTopup, setSelectedTopup] = useState('topup-20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const topupDetails = TOPUP_PACKS[selectedTopup];
  const displayPrice = `$${(topupDetails.amount / 100).toFixed(2)}`;

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!userId || !userEmail) {
        throw new Error('User information not available');
      }

      // Redirect to Stripe Payment Link
      await redirectToTopupCheckout(selectedTopup, userEmail, userId);
    } catch (err) {
      setError(err.message || 'Failed to start checkout');
      console.error('Checkout error:', err);
      setLoading(false);
    }
  };

  // Show package selection
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Buy Additional Documents</h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-white text-2xl font-bold"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Current Credits */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Your Current Credits</p>
          <h3 className="text-3xl font-bold text-purple-400">{currentTopupCredits}</h3>
          <p className="text-gray-400 text-xs mt-1">documents available</p>
        </div>

        {/* Select Package */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-semibold mb-3">
            Choose a Package
          </label>
          <div className="space-y-2">
            {Object.entries(TOPUP_PACKS).map(([id, pack]) => (
              <label
                key={id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                  selectedTopup === id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-600 hover:border-purple-500'
                }`}
              >
                <input
                  type="radio"
                  name="topup-pack"
                  value={id}
                  checked={selectedTopup === id}
                  onChange={(e) => setSelectedTopup(e.target.value)}
                  className="w-4 h-4 accent-purple-500"
                  disabled={loading}
                />
                <div className="ml-3 flex-1">
                  <p className="text-white font-semibold">{pack.documents} documents</p>
                  <p className="text-gray-400 text-sm">${(pack.amount / 100).toFixed(2)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="mb-6 p-4 bg-blue-600/20 border border-blue-600 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Price:</span>
              <span className="text-white font-semibold">{displayPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Documents:</span>
              <span className="text-white font-semibold">+{topupDetails.documents}</span>
            </div>
            <div className="border-t border-blue-500 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">New Total:</span>
                <span className="text-fuchsia-400 text-lg font-bold">
                  {currentTopupCredits + topupDetails.documents}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onClose(false)}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded font-medium hover:bg-gray-600 transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Buy Now (${displayPrice})`}
          </button>
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">
          Secure payment processing by Stripe
        </p>
      </div>
    </div>
  );
};

export default TopupModal;
