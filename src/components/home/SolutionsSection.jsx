import React from 'react';

const SolutionsSection = () => (
    <section id="solutions-section" className="w-full bg-white py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">Upload documents and let our AI engine do the heavy lifting</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl hover:border-blue-400 transition group">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold mb-3 group-hover:bg-blue-700 transition">1</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Documents</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Upload PDFs, images, or Word documents. Supported formats are automatically validated and processed.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl hover:border-blue-400 transition group">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold mb-3 group-hover:bg-blue-700 transition">2</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">AI Extraction</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Our AI extracts structured data from your documents with confidence scoring and real-time processing.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl hover:border-blue-400 transition group">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold mb-3 group-hover:bg-blue-700 transition">3</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Get Results</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Access extracted data instantly through our dashboard or integrate via API for seamless workflow automation.</p>
            </div>
            </div>
        </div>
    </section>
);
export default SolutionsSection;