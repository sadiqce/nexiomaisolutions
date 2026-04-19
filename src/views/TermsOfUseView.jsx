import React from 'react';

const TermsOfUseView = () => {
  return (
    <section className="min-h-screen bg-gray-900 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-extrabold mb-4">Terms of Use & Service Limits</h1>
          <p className="text-lg text-gray-400">
            Please read these terms carefully before using Nexiom AI's document extraction services.
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8 sticky top-4">
          <h3 className="font-bold text-white mb-3">Quick Navigation</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#supported-files" className="text-fuchsia-400 hover:text-fuchsia-300">Supported File Types</a></li>
            <li><a href="#file-limits" className="text-fuchsia-400 hover:text-fuchsia-300">File & Page Limits</a></li>
            <li><a href="#usage-caps" className="text-fuchsia-400 hover:text-fuchsia-300">Hard Usage Caps</a></li>
            <li><a href="#tier-limits" className="text-fuchsia-400 hover:text-fuchsia-300">Tier-Specific Limits</a></li>
            <li><a href="#billing-topups" className="text-fuchsia-400 hover:text-fuchsia-300">Billing & Top-Ups</a></li>
            <li><a href="#data-retention" className="text-fuchsia-400 hover:text-fuchsia-300">Data Retention Policy</a></li>
          </ul>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Supported Files */}
          <section id="supported-files" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">📋 Supported File Types</h2>
            <p className="text-gray-300 mb-4">
              Nexiom AI currently supports the following file types for document extraction:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <ul className="space-y-2">
                <li className="text-green-400">✓ PDF (.pdf)</li>
                <li className="text-green-400">✓ PNG Image (.png)</li>
                <li className="text-green-400">✓ JPEG Image (.jpg, .jpeg)</li>
                <li className="text-green-400">✓ Microsoft Word (.doc, .docx)</li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-200 font-bold mb-2">⚠️ Unsupported & Blocked File Types:</p>
              <ul className="space-y-1 text-red-300 text-sm">
                <li>• Password-protected PDFs</li>
                <li>• Encrypted or corrupted documents</li>
                <li>• Proprietary formats (CAD, DWG, etc.)</li>
                <li>• Executables, archives, or malicious files</li>
                <li>• Documents exceeding your tier's page limit</li>
              </ul>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              <strong>Important:</strong> Uploading an unsupported or corrupted file counts as a failed execution and will deduct 1 document from your monthly quota without processing the file.
            </p>
          </section>

          {/* File Limits */}
          <section id="file-limits" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">📦 File & Page Limits</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-3">Maximum File Sizes by Plan</h3>
              <div className="space-y-3">
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-yellow-500">
                  <p className="font-bold text-white">Sandbox Plan</p>
                  <p className="text-gray-300">File Size: <span className="text-yellow-400 font-bold">2 MB</span> | Pages: <span className="text-yellow-400 font-bold">2 max</span></p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-green-500">
                  <p className="font-bold text-white">Standard Plan</p>
                  <p className="text-gray-300">File Size: <span className="text-green-400 font-bold">10 MB</span> | Pages: <span className="text-green-400 font-bold">10 max</span></p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-purple-600">
                  <p className="font-bold text-white">Volume Plan</p>
                  <p className="text-gray-300">File Size: <span className="text-purple-400 font-bold">25 MB</span> | Pages: <span className="text-purple-400 font-bold">25 max</span></p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <p className="text-blue-200 font-bold mb-2">💡 Why Page Limits?</p>
              <p className="text-blue-300 text-sm">
                AI models charge by token usage. We limit pages to control your API costs and ensure predictable pricing. Documents exceeding your tier's limit will be rejected at upload.
              </p>
            </div>
          </section>

          {/* Hard Usage Caps */}
          <section id="usage-caps" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">🔒 Hard Usage Caps (Strict Limits)</h2>
            
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 mb-6">
              <p className="text-red-200 font-bold text-lg mb-2">⚠️ Uploads Are Blocked When Limits Are Reached</p>
              <p className="text-red-100 text-base leading-relaxed">
                Once you reach your plan's monthly document limit, the system will automatically <strong>reject</strong> all further uploads for that month. No files will be processed, and the system will display a clear message explaining your options.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">What This Means for You:</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-3 font-bold">1.</span>
                  <span><strong>Hard Stop:</strong> You cannot exceed your monthly limit, even if you try. The webhook will be rejected.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-3 font-bold">2.</span>
                  <span><strong>Immediate Notification:</strong> You'll receive a clear alert telling you that you've hit your limit and how to get more capacity.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-3 font-bold">3.</span>
                  <span><strong>Top-Up Option:</strong> Purchase a Top-Up pack instantly to continue processing without waiting for month-end.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-fuchsia-400 mr-3 font-bold">4.</span>
                  <span><strong>Predictable Costs:</strong> You will never be surprised by unexpected overage charges. You control when you increase capacity.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 bg-gray-900 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                <strong>Example:</strong> If you're on the Standard plan (100 docs/month), and you upload 100 documents on day 15, your account will be locked from further uploads until the month resets on the 1st. You can purchase a $20 Top-Up pack to get 50 more documents immediately.
              </p>
            </div>
          </section>

          {/* Billing & Top-Ups */}
          <section id="billing-topups" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">💳 Billing Logic & Top-Up Packs</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900 rounded-lg p-6 border border-green-700/50">
                <h3 className="text-lg font-bold text-white mb-3">Top-Up Packs</h3>
                <p className="text-green-400 text-2xl font-bold mb-2">$20 for 50 documents</p>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>No expiration dates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Roll over month-to-month</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Can purchase multiple packs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Activate instantly</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-blue-700/50">
                <h3 className="text-lg font-bold text-white mb-3">Who Uses Top-Ups?</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Unexpected volume spikes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Processing backlogs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Seasonal business increases</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Testing new extraction features</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Evaluating plan upgrades</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
              <p className="text-yellow-200 font-bold mb-2">📋 Failed Document Executions</p>
              <p className="text-yellow-100 text-sm leading-relaxed">
                If a document fails to process (corrupted file, exceeds page limit, unsupported format, etc.), <strong>1 document is still deducted from your monthly quota</strong>. This is to prevent abuse of failed uploads. We recommend validating documents before upload.
              </p>
            </div>
          </section>

          {/* Tier-Specific Limits */}
          <section id="tier-limits" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">📊 Tier-Specific Limits & Features</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4 font-bold">Feature</th>
                    <th className="text-center py-3 px-4 font-bold">Sandbox</th>
                    <th className="text-center py-3 px-4 font-bold">Standard</th>
                    <th className="text-center py-3 px-4 font-bold">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="py-3 px-4 text-gray-300">Monthly Limit</td>
                    <td className="text-center py-3 px-4 text-yellow-400 font-bold">5 docs</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">100 docs</td>
                    <td className="text-center py-3 px-4 text-purple-400 font-bold">500 docs</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-300">Max File Size</td>
                    <td className="text-center py-3 px-4 text-yellow-400">2 MB</td>
                    <td className="text-center py-3 px-4 text-green-400">10 MB</td>
                    <td className="text-center py-3 px-4 text-purple-400">25 MB</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-300">Max Pages</td>
                    <td className="text-center py-3 px-4 text-yellow-400">2 pages</td>
                    <td className="text-center py-3 px-4 text-green-400">10 pages</td>
                    <td className="text-center py-3 px-4 text-purple-400">25 pages</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-300">File Retention</td>
                    <td className="text-center py-3 px-4 text-yellow-400">24 hours</td>
                    <td className="text-center py-3 px-4 text-green-400">7 days</td>
                    <td className="text-center py-3 px-4 text-purple-400">14 days</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-300">Priority Processing</td>
                    <td className="text-center py-3 px-4 text-gray-500">No</td>
                    <td className="text-center py-3 px-4 text-gray-500">No</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Data Retention */}
          <section id="data-retention" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">🗂️ Data Retention & Privacy</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Retention by Plan</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><strong>Sandbox:</strong> Files are automatically purged after 24 hours from AWS S3.</li>
                  <li><strong>Standard:</strong> Files are retained for 7 days; after that, they are securely deleted.</li>
                  <li><strong>Volume:</strong> Files are retained for 14 days to allow batch processing and verification.</li>
                </ul>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">What Happens After Retention Expires</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>• Your files are securely deleted using cryptographic erasure.</li>
                  <li>• Extracted metadata is retained for analytics (anonymized).</li>
                  <li>• You can request data deletion on demand anytime.</li>
                  <li>• We comply with GDPR, CCPA, and relevant data protection regulations.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-fuchsia-400">✅ Acceptable Use Policy</h2>
            
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">You Agree NOT to:</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-400 mr-3 font-bold">•</span>
                  <span>Upload files containing malware, viruses, or malicious code.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3 font-bold">•</span>
                  <span>Perform load testing or DoS attacks against our servers.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3 font-bold">•</span>
                  <span>Attempt to reverse-engineer or bypass usage limits.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3 font-bold">•</span>
                  <span>Share your account credentials with unauthorized users.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3 font-bold">•</span>
                  <span>Upload documents that violate third-party privacy or IP rights.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3 font-bold">•</span>
                  <span>Use the service for compliance fraud or illegal document processing.</span>
                </li>
              </ul>
            </div>

            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mt-6">
              <p className="text-red-200 font-bold">Violation of this policy may result in immediate account suspension or termination, with no refunds.</p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-purple-900 to-fuchsia-900 border border-fuchsia-500 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Questions About These Terms?</h2>
            <p className="text-gray-200 mb-4">
              If you have any questions or concerns about our service limits, pricing, or data policies, please don't hesitate to reach out.
            </p>
            <a 
              href="/" 
              className="inline-block bg-white text-fuchsia-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-200 transition"
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
