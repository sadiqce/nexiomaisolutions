import React, { useState } from 'react';
import { redirectToCheckout, redirectToTopupCheckout } from '../../services/paymentService';

/**
 * Simple button that redirects to Stripe Checkout Payment Link
 * No backend required - uses Stripe's hosted checkout
 */
export const CheckoutButton = ({ 
  type = 'plan', 
  planTier = null, 
  topupId = null, 
  userId, 
  userEmail,
  children = 'Upgrade Now',
  className = '',
  ...props 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    try {
      setLoading(true);
      setError(null);

      if (type === 'plan' && planTier) {
        await redirectToCheckout(planTier, userEmail, userId);
      } else if (type === 'topup' && topupId) {
        await redirectToTopupCheckout(topupId, userEmail, userId);
      } else {
        throw new Error('Invalid payment type or missing parameters');
      }
    } catch (err) {
      setError(err.message);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition ${className}`}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </>
  );
};

export default CheckoutButton;
