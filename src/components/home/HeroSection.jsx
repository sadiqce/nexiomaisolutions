import React from 'react';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";
const TITLE_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent";

const HeroSection = () => {
    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="pt-20 pb-32 overflow-hidden" style={{backgroundImage: 'radial-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px)', backgroundSize: '30px 30px'}}>
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
                        Future-Proof Your <span className={TITLE_GRADIENT}>Business</span> with A
                    </h1>
                    <p className="text-xl text-gray-400 mb-8">
                        Leverage advanced, scalable AI solutions to automate data processing.
                    </p>
                    <div className="flex space-x-4">
                        <button 
                            onClick={() => scrollToSection('contact-form-section')}
                            className={`${BUTTON_GRADIENT} px-8 py-3 rounded-xl font-medium transform hover:scale-[1.02]`}
                        >
                            Get Started Today
                        </button>
                        <button 
                            onClick={() => scrollToSection('solutions-section')}
                            className="border border-purple-500 text-purple-500 px-8 py-3 rounded-xl font-semibold transition duration-300 ease-in-out hover:bg-purple-500 hover:text-white hover:shadow-lg"
                        >
                            Explore Solutions
                        </button>
                    </div>
                </div>
                {/* Visual SVG Placeholder */}
                <div className="flex justify-center items-center relative min-h-[300px]">
                    <div className="absolute w-72 h-72 border-2 rounded-full animate-spin-slow" style={{borderColor: 'rgba(139, 92, 246, 0.3)', borderLeftColor: '#8b5cf6'}}></div>
                    <div className="absolute w-52 h-52 border-2 rounded-full animate-spin-slow-reverse" style={{borderColor: 'rgba(217, 70, 239, 0.3)', borderRightColor: '#d946ef'}}></div>
                    <div className="relative flex flex-col items-center justify-center p-8 rounded-full bg-[#0d0a1b] shadow-2xl shadow-purple-500/50">
                        <span className="text-lg font-bold text-white">LOGO AI</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
