import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      title: 'Upload Your Document',
      description: 'Browse and upload your test report or material document from your computer using the file management section. We accept PDF, image files (JPEG, PNG), and Word documents. Just make sure your file isn\'t too large for your plan.',
      icon: '📂'
    },
    {
      number: 2,
      title: 'Smart Analysis & Data Reading',
      description: 'Our intelligent system reads your document and automatically identifies important information like lot numbers, material names, and test dates. It learns what\'s important in your documents to ensure accuracy.',
      icon: '🔍'
    },
    {
      number: 3,
      title: 'Automatic File Renaming',
      description: 'Your document is automatically renamed with a consistent, organized format (e.g., L051824-Steel-Alloy-2024-05-10.pdf) so you can easily find and identify files later.',
      icon: '✏️'
    },
    {
      number: 4,
      title: 'Save & Organize',
      description: 'The new organized filename is saved to your secure storage and library, making it easy to search, sort, and find your documents whenever you need them.',
      icon: '💾'
    }
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 pb-8 border-b-2 border-blue-200">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">How It Works</h1>
          <p className="text-lg text-gray-600">
            Simple steps to extract and organize your document data with Nexiom AI Solutions.
          </p>
        </div>

        {/* Steps Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Quick Start Process</h2>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-20 w-1 h-12 bg-blue-300 opacity-50"></div>
                )}
                
                {/* Step Card */}
                <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition flex gap-6">
                  {/* Step Circle */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-600 text-white font-bold text-lg">
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Step {step.number}: {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Naming Convention */}
        <div className="bg-white border-2 border-green-200 rounded-lg p-8 shadow-sm hover:shadow-md transition mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-green-300">How Your Files Get Organized</h2>
          
          <div className="mb-8">
            <p className="text-gray-700 mb-6 text-base">
              Your documents are automatically organized using a simple naming format that makes them easy to find and identify. Here's what each part means:
            </p>
            
            {/* Format Box */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 mb-6">
              <p className="text-gray-600 text-sm font-semibold mb-3">Automatic Naming Format:</p>
              <p className="font-mono text-lg font-bold text-gray-900 bg-white border border-green-300 rounded px-4 py-3">
                Lot Code - Material Type - Test Date
              </p>
            </div>

            {/* Example Box */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm font-semibold mb-2">Real-World Examples:</p>
              <div className="space-y-2 bg-gray-50 border border-gray-300 rounded-lg p-4">
                <div className="font-mono text-sm text-gray-800 bg-white px-3 py-2 rounded border border-gray-200">
                  L051824-Steel-Alloy-2024-05-10.pdf
                </div>
                <div className="font-mono text-sm text-gray-800 bg-white px-3 py-2 rounded border border-gray-200">
                  L050824-Titanium-Grade5-2024-05-08.pdf
                </div>
                <div className="font-mono text-sm text-gray-800 bg-white px-3 py-2 rounded border border-gray-200">
                  L051224-Composite-Carbon-2024-05-12.pdf
                </div>
              </div>
            </div>

            {/* Component Breakdown */}
            <div className="space-y-3">
              <p className="text-gray-600 text-sm font-semibold">What Each Part Means:</p>
              <div className="space-y-3">
                <div className="bg-white border-l-4 border-blue-600 px-4 py-3 rounded">
                  <p className="font-semibold text-gray-900 text-sm">Lot Code (L)</p>
                  <p className="text-gray-600 text-xs mt-1">A short identifier starting with "L" followed by the date (month-day-year, like L051824 for May 18, 2024). Helps you quickly identify when the material was tested.</p>
                </div>
                <div className="bg-white border-l-4 border-green-600 px-4 py-3 rounded">
                  <p className="font-semibold text-gray-900 text-sm">Material Type</p>
                  <p className="text-gray-600 text-xs mt-1">The type or grade of material (like Steel-Alloy or Titanium-Grade5). Makes it clear what material was being tested at a glance.</p>
                </div>
                <div className="bg-white border-l-4 border-orange-600 px-4 py-3 rounded">
                  <p className="font-semibold text-gray-900 text-sm">Test Date</p>
                  <p className="text-gray-600 text-xs mt-1">The full date when the test was performed (like 2024-05-10). Helps you track when tests were completed for compliance and record-keeping.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Why This Format Works Best:</p>
            <ul className="space-y-2">
              <li className="text-gray-700 text-sm flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>All your files are named the same way, so it's easy to find what you need</span>
              </li>
              <li className="text-gray-700 text-sm flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Files are automatically organized in order by test date</span>
              </li>
              <li className="text-gray-700 text-sm flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>No manual renaming needed - it happens automatically</span>
              </li>
              <li className="text-gray-700 text-sm flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Perfect for compliance records and audits</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
