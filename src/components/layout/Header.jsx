import React from 'react';

const TITLE_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent";
const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const Header = ({ navigate, currentPage, signOut }) => {
    const isDashboard = currentPage === 'PortalDashboard';

    return (
        <header className="sticky top-0 z-50 bg-[#0d0a1b] bg-opacity-95 shadow-lg">
            <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('Home'); }} className="text-3xl font-extrabold tracking-tight">
                    <span className={TITLE_GRADIENT}>Nexiom</span> AI Solutions
                </a>

                <div className="flex space-x-4">
                    {isDashboard ? (
                        <button 
                            onClick={signOut}
                            className="border border-red-500 text-red-400 px-4 py-2 rounded-xl font-medium transition duration-300 hover:bg-red-900/30 hover:shadow-md"
                        >
                            Sign Out
                        </button>
                    ) : (
                        <>
                            <a href="#" 
                                onClick={(e) => { e.preventDefault(); navigate('PortalLogin'); }} 
                                className="text-white px-4 py-2 rounded-xl font-medium transition duration-300 ease-in-out hover:text-fuchsia-500 hover:bg-gray-800 flex items-center"
                            >
                                Client Portal
                            </a>
                            <button 
                                onClick={() => currentPage === 'Home' ? document.getElementById('contact-form-section')?.scrollIntoView({ behavior: 'smooth' }) : navigate('Home')}
                                className={BUTTON_GRADIENT}
                            >
                                Get in Touch
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;