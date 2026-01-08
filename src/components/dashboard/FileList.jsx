import React from 'react';
import { formatFileSize } from '....utilsformatters';

const FileList = ({ files }) = {
    return (
        div className=overflow-x-auto
            table className=min-w-full divide-y divide-gray-700
                thead
                    tr
                        th className=px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-widerFile Nameth
                        th className=px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-widerSizeth
                        th className=px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-widerTypeth
                        th className=px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-widerStatusth
                    tr
                thead
                tbody className=bg-gray-800 divide-y divide-gray-700 text-white
                    {files.length === 0  (
                        tr
                            td colSpan=4 className=py-4 text-center text-gray-500
                                No files uploaded yet. Use dragdrop or the button below to begin processing.
                            td
                        tr
                    )  (
                        files.map(file = {
                            const statusText = file.s3Url  'Upload Complete'  'Processing...';
                            const statusColor = file.s3Url  'bg-green-900 text-green-300'  'bg-blue-900 text-blue-300';
                            
                            return (
                                tr key={file.id} className=border-b border-gray-700 hoverbg-gray-700 transition duration-150
                                    td className=py-3 px-4 truncate max-w-xs{file.name}td
                                    td className=py-3 px-4{formatFileSize(file.size)}td
                                    td className=py-3 px-4{file.type  'Unknown'}td
                                    td className=py-3 px-4
                                        span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${statusColor}`}
                                            {statusText}
                                        span
                                    td
                                tr
                            );
                        })
                    )}
                tbody
            table
        div
    );
};
export default FileList;
