import React from 'react';

const TITLE_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent";

const SolutionsSection = () => (
    <section id="solutions-section" className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-extrabold mb-12 text-center">Core Solutions</h2>
        <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl shadow-xl bg-gray-800 border border-purple-700 hover:scale-[1.02] transition duration-300">
                <div className={`text-3xl font-bold mb-4 ${TITLE_GRADIENT}`}>1/3</div>
                <h3 className="text-2xl font-semibold mb-3">Process Automation</h3>
                <p className="text-gray-400">Streamline repetitive tasks using sophisticated AI bots to reduce errors.</p>
            </div>
            <div className="p-8 rounded-2xl shadow-xl bg-gray-800 border border-purple-700 hover:scale-[1.02] transition duration-300">
                <div className={`text-3xl font-bold mb-4 ${TITLE_GRADIENT}`}>2/3</div>
                <h3 className="text-2xl font-semibold mb-3">Predictive Analytics</h3>
                <p className="text-gray-400">Uncover hidden trends and predict future outcomes from your data.</p>
            </div>
            <div className="p-8 rounded-2xl shadow-xl bg-gray-800 border border-purple-700 hover:scale-[1.02] transition duration-300">
                <div className={`text-3xl font-bold mb-4 ${TITLE_GRADIENT}`}>3/3</div>
                <h3 className="text-2xl font-semibold mb-3">Custom AI Models</h3>
                <p className="text-gray-400">Develop and deploy bespoke AI models tailored precisely to your unique business processes.</p>
            </div>
        </div>
    </section>
);
export default SolutionsSection;