import React, { useState, useMemo } from 'react';
import { formatFileSize } from '../../utils/formatters';
import { getDownloadUrl } from '../../services/apiClient';

const FileList = ({ files }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('uploadDate');
    const [sortDirection, setSortDirection] = useState('desc');
    
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    };

    // Handle sorting
    const handleSort = (column) => {
        if (sortColumn === column) {
            // Toggle direction if clicking same column
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column and default to descending
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    // Filter and sort files
    const filteredAndSortedFiles = useMemo(() => {
        // Filter files based on search term
        let filtered = files.filter(file => {
            const searchLower = searchTerm.toLowerCase();
            return (
                (file.originalName && file.originalName.toLowerCase().includes(searchLower)) ||
                (file.newName && file.newName.toLowerCase().includes(searchLower)) ||
                (file.size && formatFileSize(file.size).toLowerCase().includes(searchLower))
            );
        });

        // Sort files
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'originalName':
                    aValue = a.originalName || '';
                    bValue = b.originalName || '';
                    break;
                case 'newName':
                    aValue = a.newName || '';
                    bValue = b.newName || '';
                    break;
                case 'size':
                    aValue = a.size || 0;
                    bValue = b.size || 0;
                    break;
                case 'uploadDate':
                    aValue = new Date(a.uploadDate || 0).getTime();
                    bValue = new Date(b.uploadDate || 0).getTime();
                    break;
                default:
                    return 0;
            }

            // Handle string comparison
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
                return sortDirection === 'asc' 
                    ? aValue.localeCompare(bValue) 
                    : bValue.localeCompare(aValue);
            }

            // Handle numeric comparison
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });

        return filtered;
    }, [files, searchTerm, sortColumn, sortDirection]);

    const SortableHeader = ({ column, label }) => {
        const isActive = sortColumn === column;
        const arrow = isActive ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
        
        return (
            <th 
                onClick={() => handleSort(column)}
                className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                title="Click to sort"
            >
                {label}{arrow}
            </th>
        );
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
        <div>
            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by filename or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* File Count */}
            {searchTerm && (
                <div className="mb-2 text-xs text-gray-600">
                    Found {filteredAndSortedFiles.length} of {files.length} files
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <SortableHeader column="originalName" label="Original Filename" />
                            <SortableHeader column="newName" label="New File Name" />
                            <SortableHeader column="size" label="Size" />
                            <SortableHeader column="uploadDate" label="Upload Date" />
                            <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-gray-900">
                        {filteredAndSortedFiles.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-2 text-center text-gray-500 text-sm">
                                    {files.length === 0 ? 'No files found. Upload a file to get started.' : 'No files match your search.'}
                                </td>
                            </tr>
                        ) : (
                            filteredAndSortedFiles.map(file => (
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
        </div>
    );
};
export default FileList;