import React, { useState } from 'react';
import { submitContactForm } from '../../services/airtableService';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";
const TITLE_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent";

const ContactFormSection = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const email = e.target.email.value;
        const messageText = e.target.message.value;

        if (!name || !email || !messageText) {
            setMessage('Please fill in all fields.');
            setMessageType('error');
            return;
        }

        setLoading(true);
        setMessage('');
        
        try {
            await submitContactForm({
                name,
                email,
                message: messageText
            });
            
            setMessage('Thank you! Your message has been sent successfully.');
            setMessageType('success');
            e.target.reset();
        } catch (error) {
            console.error('Failed to submit contact form:', error);
            setMessage('Failed to send message. Please try again later.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact-form-section" className="max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-start">
            <div>
                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
                    Ready to <span className={TITLE_GRADIENT}>Transform</span> Your Business?
                </h2>
                <p className="text-xl text-gray-400 mb-8">
                    Reach out to us to discuss how Nexiom AI Solutions can deliver results for your organization.
                </p>
            </div>
            <div className="p-8 rounded-2xl shadow-2xl bg-gray-800 border border-fuchsia-600">
                <h3 className="text-3xl font-bold mb-6 text-white">Contact Us</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                        <input type="text" id="name" name="name" placeholder="John Doe" required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white transition duration-200"/>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                        <input type="email" id="email" name="email" placeholder="you@company.com" required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white transition duration-200"/>
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Your Message</label>
                        <textarea id="message" name="message" rows="4" placeholder="How can we help you future-proof your business?" required className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-purple-500 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-white transition duration-200"></textarea>
                    </div>
                    {message && (
                        <div className={`p-4 rounded-lg ${messageType === 'success' ? 'bg-green-900 border border-green-500 text-green-200' : 'bg-red-900 border border-red-500 text-red-200'}`}>
                            {message}
                        </div>
                    )}
                    <button type="submit" disabled={loading} className={`w-full ${BUTTON_GRADIENT} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {loading ? 'Sending...' : 'Send Email Inquiry'}
                    </button>
                </form>
            </div>
        </section>
    );
};
export default ContactFormSection;