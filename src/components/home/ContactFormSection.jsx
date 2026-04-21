import React, { useState } from 'react';
import { submitContactForm } from '../../services/airtableService';

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
        <section id="contact-form-section" className="w-full bg-gradient-to-r from-blue-700 to-blue-600 py-10 sm:py-14">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-start">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3 sm:mb-4">
                            Ready to transform your business?
                        </h2>
                        <p className="text-blue-50 text-lg leading-relaxed">
                            Contact us to discuss how Nexiom AI Solutions can deliver measurable results for your organization.
                        </p>
                    </div>
                    <div className="p-6 rounded-xl border border-white bg-white bg-opacity-95 shadow-2xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Get in touch</h3>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input type="text" id="name" name="name" placeholder="John Doe" required className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"/>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" id="email" name="email" placeholder="you@company.com" required className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition"/>
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                            <textarea id="message" name="message" rows="3" placeholder="Tell us how we can help..." required className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition resize-none"></textarea>
                        </div>
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                {message}
                            </div>
                        )}
                        <button type="submit" disabled={loading} className={`w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
            </div>
        </section>
    );
};
export default ContactFormSection;