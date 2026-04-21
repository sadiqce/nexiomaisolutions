import React from 'react';

const TermsOfUseView = () => {
  return (
    <section className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-8 border-b-2 border-blue-200">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Terms of Use & Service Limits</h1>
          <p className="text-lg text-gray-600">
            Please read these terms carefully before using Nexiom AI Solutions's document extraction services.
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4 mb-6 sticky top-16 z-10 shadow-lg max-h-[calc(100vh-6rem)] overflow-y-auto">
          <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">📋 Quick Navigation</h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs">
            <li><a href="#supported-files" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">Supported File Types</a></li>
            <li><a href="#file-limits" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">File & Page Limits</a></li>
            <li><a href="#usage-caps" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">Hard Usage Caps</a></li>
            <li><a href="#tier-limits" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">Tier-Specific Limits</a></li>
            <li><a href="#billing-topups" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">Billing & Top-Ups</a></li>
            <li><a href="#data-retention" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">Data Retention</a></li>
          </ul>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Supported Files */}
          <section id="supported-files" className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-blue-300">Supported File Types</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Nexiom AI currently supports the following file types for document extraction:
            </p>
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 mb-4 border border-blue-200">
              <ul className="space-y-2">
                <li className="text-blue-700 font-semibold text-sm">✓ PDF (.pdf)</li>
                <li className="text-blue-700 font-semibold text-sm">✓ PNG Image (.png)</li>
                <li className="text-blue-700 font-semibold text-sm">✓ JPEG Image (.jpg, .jpeg)</li>
                <li className="text-blue-700 font-semibold text-sm">✓ Microsoft Word (.doc, .docx)</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 font-bold mb-2 text-sm">⚠️ Unsupported & Blocked File Types:</p>
              <ul className="space-y-1 text-red-600 text-xs">
                <li>• Password-protected PDFs</li>
                <li>• Encrypted or corrupted documents</li>
                <li>• Proprietary formats (CAD, DWG, etc.)</li>
                <li>• Executables, archives, or malicious files</li>
                <li>• Documents exceeding your tier's page limit</li>
              </ul>
            </div>
            <p className="text-gray-600 text-xs bg-yellow-50 border border-yellow-200 rounded p-3\">
              <strong>Important:</strong> Uploading an unsupported or corrupted file counts as a failed execution and will deduct 1 document from your monthly quota without processing the file.
            </p>
          </section>

          {/* File Limits */}
          <section id="file-limits" className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 pb-3 border-b-2 border-blue-300">File & Page Limits</h2>
            
            <div className="mb-5">
              <h3 className="text-base font-bold text-gray-900 mb-3 text-blue-700\">Maximum File Sizes by Plan</h3>
              <div className="space-y-2">
                <div className="bg-white rounded-lg p-3 border-l-4 border-yellow-500 bg-yellow-50/30">
                  <p className="font-bold text-gray-900 text-sm\">Sandbox Plan</p>
                  <p className="text-gray-700 text-xs\">File Size: <span className="text-yellow-700 font-bold\">2 MB</span> | Pages: <span className="text-yellow-700 font-bold\">2 max</span></p>
                </div>
                <div className="bg-white rounded-lg p-3 border-l-4 border-green-500 bg-green-50/30\">
                  <p className="font-bold text-gray-900 text-sm\">Standard Plan</p>
                  <p className="text-gray-700 text-xs\">File Size: <span className="text-green-700 font-bold\">10 MB</span> | Pages: <span className="text-green-700 font-bold\">10 max</span></p>
                </div>
                <div className="bg-white rounded-lg p-3 border-l-4 border-blue-500 bg-blue-50/30\">
                  <p className="font-bold text-gray-900 text-sm\">Volume Plan</p>
                  <p className="text-gray-700 text-xs\">File Size: <span className="text-blue-700 font-bold\">25 MB</span> | Pages: <span className="text-blue-700 font-bold\">25 max</span></p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3\">
              <p className="text-blue-700 font-bold mb-2 text-sm\">💡 Why Page Limits?</p>
              <p className="text-blue-600 text-xs\">
                AI models charge by token usage. We limit pages to control your API costs and ensure predictable pricing. Documents exceeding your tier's limit will be rejected at upload.
              </p>
            </div>
          </section>

          {/* Hard Usage Caps */}
          <section id="usage-caps" className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-blue-300\">Hard Usage Caps (Strict Limits)</h2>
            
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-5">
              <p className="text-red-700 font-bold text-sm mb-2">⚠️ Uploads Are Blocked When Limits Are Reached</p>
              <p className="text-red-600 text-xs leading-relaxed">
                Once you reach your plan's monthly document limit, the system will automatically reject all further uploads for that month. No files will be processed, and the system will display a clear message explaining your options.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">What This Means for You:</h3>
              <ul className="space-y-2 text-gray-700 text-xs">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">1.</span>
                  <span><strong>Hard Stop:</strong> You cannot exceed your monthly limit. All uploads will be rejected.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">2.</span>
                  <span><strong>Immediate Notification:</strong> You'll receive a clear alert when you've hit your limit and how to get more capacity.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">3.</span>
                  <span><strong>Top-Up Option:</strong> Purchase a Top-Up pack instantly to continue processing without waiting for month-end.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">4.</span>
                  <span><strong>Predictable Costs:</strong> You will never be surprised by unexpected overage charges. You control when you increase capacity.</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 text-xs">
                <strong>Example:</strong> If you're on the Standard plan (100 docs/month) and upload 100 documents on day 15, your account will be locked until month-end. Purchase a $20 Top-Up pack to get 50 more documents immediately.
              </p>
            </div>
          </section>

          {/* Billing & Top-Ups */}
          <section id="billing-topups" className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 pb-3 border-b-2 border-blue-300">Billing Logic & Top-Up Packs</h2>
            
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-5 border border-blue-200">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Top-Up Packs</h3>
                <p className="text-blue-600 text-lg font-bold mb-3">$20 for 50 documents</p>
                <ul className="space-y-1 text-gray-700 text-xs">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 font-bold">✓</span>
                    <span>No expiration dates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 font-bold">✓</span>
                    <span>Roll over month-to-month</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 font-bold">✓</span>
                    <span>Can purchase multiple packs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 font-bold">✓</span>
                    <span>Activate instantly</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-5 border border-green-200">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Who Uses Top-Ups?</h3>
                <ul className="space-y-1 text-gray-700 text-xs">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2 font-bold">•</span>
                    <span>Unexpected volume spikes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2 font-bold">•</span>
                    <span>Processing backlogs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2 font-bold">•</span>
                    <span>Seasonal business increases</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2 font-bold">•</span>
                    <span>Testing new extraction features</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2 font-bold">•</span>
                    <span>Evaluating plan upgrades</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <p className="text-yellow-700 font-bold text-sm mb-2">📋 Failed Document Executions</p>
              <p className="text-yellow-600 text-xs leading-relaxed">
                If a document fails to process, <strong>1 document is still deducted from your monthly quota</strong>. This prevents abuse of failed uploads. We recommend validating documents before upload.
              </p>
            </div>
          </section>

          {/* Tier-Specific Limits */}
          <section id="tier-limits" className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 pb-3 border-b-2 border-blue-300">Tier-Specific Limits & Features</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-blue-300 bg-blue-50">
                    <th className="text-left py-2 px-3 font-bold text-gray-900">Feature</th>
                    <th className="text-center py-2 px-3 font-bold text-gray-900">Sandbox</th>
                    <th className="text-center py-2 px-3 font-bold text-gray-900">Standard</th>
                    <th className="text-center py-2 px-3 font-bold text-gray-900">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700 font-medium">Monthly Limit</td>
                    <td className="text-center py-2 px-3 text-yellow-600 font-bold">5 docs</td>
                    <td className="text-center py-2 px-3 text-green-600 font-bold">100 docs</td>
                    <td className="text-center py-2 px-3 text-blue-600 font-bold">500 docs</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700 font-medium">Max File Size</td>
                    <td className="text-center py-2 px-3 text-gray-700">2 MB</td>
                    <td className="text-center py-2 px-3 text-gray-700">10 MB</td>
                    <td className="text-center py-2 px-3 text-gray-700">25 MB</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700 font-medium">Max Pages</td>
                    <td className="text-center py-2 px-3 text-gray-700">2 pages</td>
                    <td className="text-center py-2 px-3 text-gray-700">10 pages</td>
                    <td className="text-center py-2 px-3 text-gray-700">25 pages</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700 font-medium">File Retention</td>
                    <td className="text-center py-2 px-3 text-gray-700">24 hours</td>
                    <td className="text-center py-2 px-3 text-gray-700">7 days</td>
                    <td className="text-center py-2 px-3 text-gray-700">14 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Data Retention */}
          <section id="data-retention" className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 pb-3 border-b-2 border-blue-300">Data Retention & Privacy</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Retention by Plan</h3>
                <ul className="space-y-1 text-gray-700 text-xs">
                  <li><strong>Sandbox:</strong> Files are automatically purged after 24 hours.</li>
                  <li><strong>Standard:</strong> Files are retained for 7 days; after that, they are securely deleted.</li>
                  <li><strong>Volume:</strong> Files are retained for 14 days to allow batch processing and verification.</li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-300">
                <h3 className="text-sm font-bold text-gray-900 mb-2">What Happens After Retention Expires</h3>
                <ul className="space-y-1 text-gray-700 text-xs">
                  <li>• Your files are securely deleted using cryptographic erasure.</li>
                  <li>• Extracted metadata is retained for analytics (anonymized).</li>
                  <li>• You can request data deletion on demand anytime.</li>
                  <li>• We comply with GDPR, CCPA, and relevant data protection regulations.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-2xl font-bold text-gray-900 mb-5 pb-3 border-b-2 border-blue-300">Acceptable Use Policy</h2>
            
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">You Agree NOT to:</h3>
              <ul className="space-y-2 text-gray-700 text-xs">
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span>Upload files containing malware, viruses, or malicious code.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span>Perform load testing or DoS attacks against our servers.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span>Attempt to reverse-engineer or bypass usage limits.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span>Share your account credentials with unauthorized users.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span>Upload documents that violate third-party privacy or IP rights.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span>Use the service for compliance fraud or illegal document processing.</span>
                </li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-300 rounded-lg p-3 mt-4">
              <p className="text-red-700 font-bold text-xs">Violation of this policy may result in immediate account suspension or termination, with no refunds.</p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-300 rounded-lg p-6 text-center shadow-md">
            <h2 className="text-2xl font-bold text-white mb-2">Questions About These Terms?</h2>
            <p className="text-blue-100 mb-4 text-sm">
              If you have any questions or concerns about our service limits, pricing, or data policies, please don't hesitate to reach out.
            </p>
            <a 
              href="/" 
              className="inline-block bg-white hover:bg-gray-100 text-blue-700 font-bold px-6 py-2 rounded-lg transition"
            >
              Contact Support
            </a>
          </section>
        </div>
      </div>
    </section>
  );
};

export default TermsOfUseView;
