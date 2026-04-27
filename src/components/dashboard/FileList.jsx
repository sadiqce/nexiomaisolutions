import React from 'react';
import { formatFileSize } from '../../utils/formatters';
import { getDownloadUrl } from '../../services/apiClient';

const FileList = ({ files }) => {
    
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    };

    const handleDownload = async (file) => {
        if (!file.url) {
            alert("File is still being processed. Please wait a moment and refresh the page.");
            return;
        }
        
        // Normalize the fileKey - remove any whitespace
        let fileKey = file.url.trim();
        
        console.log(`[Download] Downloading: ${fileKey}`);
        
        const result = await getDownloadUrl(fileKey);
        
        if (result.success) {
            // Force download to local machine by creating a blob link
            // Use fetch to get the file and trigger download
            fetch(result.url)
                .then(response => response.blob())
                .then(blob => {
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = file.newName || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);
                })
                .catch(error => {
                    console.error('Download error:', error);
                    alert('Failed to download file. Please try again.');
                });
        } else {
            console.error('Download error details:', result.details);
            alert(
                `Could not download file.\n\n` +
                `Error: ${result.error}\n\n` +
                `Please try again or contact support.`
            );
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Original Filename</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">New File Name</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Size</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Upload Date</th>
                        <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-gray-900">
                    {files.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="py-2 text-center text-gray-500 text-sm">
                                No files found. Upload a file to get started.
                            </td>
                        </tr>
                    ) : (
                        files.map(file => (
                            <tr key={file.id} className="border-b border-gray-200 hover:bg-gray-50 transition duration-150">
                                <td className="py-1.5 px-3 truncate max-w-xs text-sm">{file.originalName}</td>
                                <td className="py-1.5 px-3 truncate max-w-xs text-blue-600 font-mono text-xs">{file.newName || '-'}</td>
                                <td className="py-1.5 px-3 text-sm">{typeof file.size === 'number' ? formatFileSize(file.size) : file.size}</td>
                                <td className="py-1.5 px-3 text-xs text-gray-600">{formatDate(file.uploadDate)}</td>
                                <td className="py-1.5 px-3">
                                    {file.url ? (
                                        <button onClick={() => handleDownload(file)} className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                                            Download
                                        </button>
                                    ) : (
                                        <span className="text-yellow-600 text-xs font-medium cursor-help" title="File is being processed. Refresh the page in a moment.">⏳ Processing</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
export default FileList;