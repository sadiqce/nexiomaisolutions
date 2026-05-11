import React, { useState, useMemo, useCallback } from 'react';
import { formatFileSize } from '../../utils/formatters';
import { getDownloadUrl } from '../../services/apiClient';

const FileList = ({ files = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('uploadDate');
    const [sortDirection, setSortDirection] = useState('desc');
    
    // Memoized date formatter to avoid recreating on every render
    const formatDate = useCallback((dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return dateString;
        }
    }, []);

    // Handle sorting with useCallback to prevent unnecessary re-renders
    const handleSort = useCallback((column) => {
        setSortColumn(prev => {
            const newDirection = prev === column && sortDirection === 'asc' ? 'desc' : 'asc';
            if (prev !== column) {
                setSortDirection('desc');
                return column;
            }
            setSortDirection(newDirection);
            return prev;
        });
    }, [sortColumn, sortDirection]);

    // Optimized filter and sort - only recalculates when files, search, or sort changes
    const filteredAndSortedFiles = useMemo(() => {
        if (!files || files.length === 0) return [];
        
        // Filter files based on search term (case-insensitive)
        let filtered = files.filter(file => {
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                (file.originalName && file.originalName.toLowerCase().includes(searchLower)) ||
                (file.newName && file.newName.toLowerCase().includes(searchLower)) ||
                (file.size && formatFileSize(file.size).toLowerCase().includes(searchLower))
            );
        });

        // Sort files efficiently
        const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
        
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'originalName':
                    aValue = (a.originalName || '').toLowerCase();
                    bValue = (b.originalName || '').toLowerCase();
                    return aValue.localeCompare(bValue) * sortMultiplier;
                    
                case 'newName':
                    aValue = (a.newName || '').toLowerCase();
                    bValue = (b.newName || '').toLowerCase();
                    return aValue.localeCompare(bValue) * sortMultiplier;
                    
                case 'size':
                    aValue = a.size || 0;
                    bValue = b.size || 0;
                    return (aValue - bValue) * sortMultiplier;
                    
                case 'uploadDate':
                    aValue = new Date(a.uploadDate || 0).getTime();
                    bValue = new Date(b.uploadDate || 0).getTime();
                    return (aValue - bValue) * sortMultiplier;
                    
                default:
                    return 0;
            }
        });

        return filtered;
    }, [files, searchTerm, sortColumn, sortDirection, formatFileSize]);

    // Memoized sortable header component
    const SortableHeader = useCallback(({ column, label }) => {
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
    }, [sortColumn, sortDirection, handleSort]);

    // Memoized download handler
    const handleDownload = useCallback(async (file) => {
        if (!file.url) {
            alert("File is still being processed. Please wait a moment and refresh the page.");
            return;
        }
        
        try {
            let fileKey = file.url.trim();
            console.log(`[Download] Downloading: ${fileKey}`);
            
            const result = await getDownloadUrl(fileKey);
            
            if (result.success) {
                // Force download to local machine by creating a blob link
                const response = await fetch(result.url);
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = file.newName || 'download';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            } else {
                console.error('Download error:', result.error);
                alert(`Could not download file.\n\nError: ${result.error}\n\nPlease try again or contact support.`);
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download file. Please try again.');
        }
    }, []);

    // Memoized file row component to prevent unnecessary re-renders
    const FileRow = React.memo(({ file }) => (
        <tr className="border-b border-gray-200 hover:bg-gray-50 transition duration-150">
            <td className="py-1.5 px-3 truncate max-w-xs text-sm">{file.originalName}</td>
            <td className="py-1.5 px-3 truncate max-w-xs text-blue-600 font-mono text-xs">{file.newName || '-'}</td>
            <td className="py-1.5 px-3 text-sm">{typeof file.size === 'number' ? formatFileSize(file.size) : file.size}</td>
            <td className="py-1.5 px-3 text-xs text-gray-600">{formatDate(file.uploadDate)}</td>
            <td className="py-1.5 px-3">
                {file.url ? (
                    <button 
                        onClick={() => handleDownload(file)} 
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium transition"
                    >
                        Download
                    </button>
                ) : (
                    <span className="text-yellow-600 text-xs font-medium cursor-help" title="File is being processed. Refresh the page in a moment.">⏳ Processing</span>
                )}
            </td>
        </tr>
    ), (prevProps, nextProps) => {
        // Custom equality check - only re-render if file data actually changed
        return prevProps.file.id === nextProps.file.id &&
               prevProps.file.originalName === nextProps.file.originalName &&
               prevProps.file.size === nextProps.file.size &&
               prevProps.file.uploadDate === nextProps.file.uploadDate &&
               prevProps.file.url === nextProps.file.url;
    });
    
    FileRow.displayName = 'FileRow';

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
                                <FileRow key={file.id} file={file} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default FileList;