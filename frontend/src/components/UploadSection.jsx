import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle, Activity } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const UploadSection = ({ setResults, setLoading, loading }) => {
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Updated to use environment variable
            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await axios.post(`${apiUrl}/predict`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000, // 30 second timeout
            });
            setResults(response.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "An error occurred during upload.");
        } finally {
            setLoading(false);
        }
    }, [setResults, setLoading]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1,
        disabled: loading
    });

    return (
        <div className="max-w-2xl mx-auto">
            <div
                {...getRootProps()}
                className={`
                    relative group cursor-pointer
                    border border-dashed rounded-3xl p-12
                    transition-all duration-300 ease-in-out
                    flex flex-col items-center justify-center text-center
                    ${isDragActive ? 'border-white bg-zinc-900 scale-[1.02]' : 'border-zinc-800 hover:border-white hover:bg-zinc-900'}
                    ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                `}
            >
                <input {...getInputProps()} />

                <div className="mb-6 bg-zinc-900 p-4 rounded-full border border-zinc-800 group-hover:scale-110 transition-transform duration-300">
                    {loading ? (
                        <Loader2 className="h-10 w-10 text-white animate-spin" />
                    ) : (
                        <UploadCloud className="h-10 w-10 text-white" />
                    )}
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">
                    {loading ? 'Analyzing Data...' : 'Drop file here'}
                </h3>

                <p className="text-zinc-500 mb-6 max-w-sm">
                    {loading
                        ? 'Processing data...'
                        : 'Support for .CSV and .XLSX.'}
                </p>

                {!loading && (
                    <button className="px-6 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-colors">
                        Select File
                    </button>
                )}
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-zinc-900 border border-white/20 rounded-xl flex items-start gap-3"
                >
                    <AlertCircle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-300">{error}</span>
                </motion.div>
            )}

            <div className="mt-8 flex justify-center gap-8 text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Auto-Format Detection</span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>99% Accuracy</span>
                </div>
            </div>
        </div>
    );
};

export default UploadSection;
