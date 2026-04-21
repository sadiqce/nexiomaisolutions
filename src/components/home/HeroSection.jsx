import React from 'react';

const HeroSection = () => {
    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="bg-gradient-to-b from-blue-700 to-blue-600 pt-10 sm:pt-14 pb-10 sm:pb-14 text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-3 sm:mb-4 text-white drop-shadow-lg">
                        Intelligent Document Processing for Your Business
                    </h1>
                    <p className="text-base sm:text-lg text-blue-50 mb-5 sm:mb-7 leading-relaxed">
                        Automate data extraction and processing with our advanced AI solutions. Save time, reduce errors, and scale your operations effortlessly.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <button 
                            onClick={() => scrollToSection('contact-form-section')}
                            className="px-8 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-gray-50 transition shadow-lg hover:shadow-xl"
                        >
                            Get Started
                        </button>
                        <button 
                            onClick={() => scrollToSection('solutions-section')}
                            className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-700 transition"
                        >
                            Learn More
                        </button>
                    </div>
                </div>


            </div>
        </section>
    );
};

export default HeroSection;
