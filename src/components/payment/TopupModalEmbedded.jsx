import React, { useState, useEffect } from 'react';
import { redirectToTopupCheckout, TOPUP_PACKS } from '../../services/paymentService';
import { getUser } from '../../services/airtableService';

/**
 * TopupModal - Purchase additional documents
 * Redirects to Stripe Payment Link when user clicks Buy
 */
const TopupModalEmbedded = ({ isOpen, onClose, userId, userEmail, currentTopupCredits = 0 }) => {
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
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-blue-200">
          <h2 className="text-2xl font-bold text-blue-700">Buy Additional Documents</h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Current Credits */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-gray-600 text-sm mb-2">Your Current Credits</p>
          <h3 className="text-3xl font-bold text-blue-700">{currentTopupCredits}</h3>
          <p className="text-gray-500 text-xs mt-1">documents available</p>
        </div>

        {/* Select Package */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-3">
            Choose a Package
          </label>
          <div className="space-y-2">
            {Object.entries(TOPUP_PACKS).map(([id, pack]) => (
              <label
                key={id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                  selectedTopup === id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-400'
                }`}
              >
                <input
                  type="radio"
                  name="topup-pack"
                  value={id}
                  checked={selectedTopup === id}
                  onChange={(e) => setSelectedTopup(e.target.value)}
                  className="w-4 h-4 accent-blue-600"
                  disabled={loading}
                />
                <div className="ml-3 flex-1">
                  <p className="text-gray-900 font-semibold">{pack.documents} documents</p>
                  <p className="text-gray-600 text-sm">${(pack.amount / 100).toFixed(2)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Price:</span>
              <span className="text-gray-900 font-semibold">{displayPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Documents:</span>
              <span className="text-gray-900 font-semibold">+{topupDetails.documents}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-bold">New Total:</span>
                <span className="text-blue-700 text-lg font-bold">
                  {currentTopupCredits + topupDetails.documents}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onClose(false)}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded font-medium hover:bg-gray-200 transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Buy Now (${displayPrice})`}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          Secure payment processing by Stripe
        </p>
      </div>
    </div>
  );
};

export default TopupModalEmbedded;
