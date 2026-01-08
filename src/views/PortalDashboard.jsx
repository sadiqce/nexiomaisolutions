import React, { useState, useEffect, useCallback, useRef } from 'react';
import { uploadFileToS3 } from '../services/s3Service';
import FileList from '../components/dashboard/FileList';
import MetricCard from '../components/common/MetricCard';

const BUTTON_GRADIENT = "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg transition duration-300 ease-in-out hover:opacity-90 hover:shadow-xl";

const PortalDashboard = ({ uploadedFiles, setUploadedFiles, signOut }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileTransfer = useCallback((fileList) => {
        const newFiles = Array.from(fileList).map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            s3Url: null,
            id: Date.now() + Math.random(),
            fileInstance: file,
        }));
        setUploadedFiles(prev => prev.concat(newFiles));
    }, [setUploadedFiles]);
    
    useEffect(() => {
        uploadedFiles.forEach(file => {
            if (file.s3Url === null) {
                uploadFileToS3(file.fileInstance).then(result => {
                    if (result.success) {
                        setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, s3Url: result.url } : f));
                    }
                });
            }
        });
    }, [uploadedFiles, setUploadedFiles]);

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileTransfer(e.dataTransfer.files); };

    return (
        <section className="max-w-7xl mx-auto px-4 py-20">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-4xl font-extrabold">Welcome Back, Client!</h2>
                    <p className="text-xl text-gray-400">Your AI Solutions Status Overview</p>
                </div>
                <button onClick={signOut} className="border border-red-500 text-red-400 px-4 py-2 rounded-xl font-medium transition duration-300 hover:bg-red-900/30 hover:shadow-md">Sign Out</button>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
                <MetricCard title="Model Uptime" value="99.98" unit="%" color="green" time="Last 30 Days" />
                <MetricCard title="API Usage" value="4,102" unit=" Calls" color="purple" time="Today's Total" />
                <MetricCard title="Monthly Spend" value="$450" unit=" USD" color="red" time="Projected" />
            </div>
            
            <div className="p-8 rounded-xl bg-gray-800 border border-fuchsia-600 shadow-2xl">
                <h3 className="text-2xl font-semibold mb-6 text-white border-b border-gray-700 pb-3">Data Upload</h3>
                <input type="file" ref={fileInputRef} multiple className="hidden" onChange={(e) => handleFileTransfer(e.target.files)} />
                
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-4 border-dashed rounded-xl p-10 mb-6 text-center cursor-pointer ${isDragging ? 'border-fuchsia-500 bg-gray-900' : 'border-purple-700'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <p className="text-lg font-medium text-white">Drag & Drop files or Click to Upload</p>
                </div>
                
                <FileList files={uploadedFiles} />
            </div>
        </section>
    );
};

export default PortalDashboard;