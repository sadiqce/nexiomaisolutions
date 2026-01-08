import React from 'react';
import { MOCK_AUTH } from '../../config/aws';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";
const TITLE_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent";

const ContactFormSection = () => {
    const handleSubmit = (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const email = e.target.email.value;
        const message = e.target.message.value;

        if (!name || !email || !message) {
            console.error('Form incomplete.');
            return;
        }

        const subject = encodeURIComponent(`Nexiom AI Inquiry from ${name}`);
        const body = encodeURIComponent(`Sender Name: ${name}\nSender Email: ${email}\n\nMessage:\n${message}`);
        const mailtoLink = `mailto:${MOCK_AUTH.TARGET_EMAIL}?subject=${subject}&body=${body}`;

        window.location.href = mailtoLink;
        e.target.reset();
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
                <button className={BUTTON_GRADIENT}>View Case Studies</button>
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
                    <button type="submit" className={`w-full ${BUTTON_GRADIENT}`}>Send Email Inquiry</button>
                </form>
            </div>
        </section>
    );
};
export default ContactFormSection;