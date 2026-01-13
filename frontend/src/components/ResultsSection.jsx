import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingDown, AlertTriangle, ArrowRight, UserCheck, FileText, Sparkles, Loader2, Mail } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const ResultsSection = ({ data }) => {
    const { summary, results } = data;
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInput, setEmailInput] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    const handleSendEmail = async () => {
        if (!emailInput || !report) return;
        setSendingEmail(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            await axios.post(`${apiUrl}/send_report`, {
                email: emailInput,
                report_markdown: report
            });
            alert("Email sent successfully!");
            setShowEmailModal(false);
            setEmailInput("");
        } catch (error) {
            console.error("Email failed", error);
            alert("Failed to send email. Check backend logs.");
        } finally {
            setSendingEmail(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, subtext }) => (
        <div className="bg-black p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 text-black">
                <Icon className="h-6 w-6" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm font-medium text-zinc-400">{label}</div>
            {subtext && <div className="text-xs text-zinc-500 mt-2">{subtext}</div>}
        </div>
    );

    const downloadCSV = () => {
        if (!results || results.length === 0) return;

        // Sort by risk descending
        const sortedData = [...results].sort((a, b) => b.churn_probability - a.churn_probability);

        // Get all headers from the first row (preserves original columns + new predictions)
        const headers = Object.keys(sortedData[0]);

        // Map data to CSV rows
        const csvRows = sortedData.map(row => {
            return headers.map(fieldName => {
                const value = row[fieldName];
                // Handle potential commas or quotes in data
                const stringValue = value === null || value === undefined ? '' : String(value);
                if (stringValue.includes(',') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(","),
            ...csvRows.map(e => e.join(","))
        ].join("\n");

        // Create blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "churn_predictions_full_sorted.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generateReport = async () => {
        setReportLoading(true);
        setReport(""); // Clear previous report
        try {
            const sortedRisk = [...results].sort((a, b) => b.churn_probability - a.churn_probability);
            const headers = Object.keys(results[0] || {});

            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiUrl}/generate_report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    churn_metrics: summary,
                    top_risks: sortedRisk.slice(0, 20), // Send top 20 for context
                    csv_columns: headers
                })
            });

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;
                setReport(accumulatedText);
            }

        } catch (error) {
            console.error("Report generation failed:", error);
            setReport("## Error\nFailed to generate report. Please try again.");
        } finally {
            setReportLoading(false);
        }
    };

    // Sort results for display (Top 10 High Risk)
    const displayedResults = [...results]
        .sort((a, b) => b.churn_probability - a.churn_probability)
        .slice(0, 10);

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={Users}
                    label="Total Customers"
                    value={summary.total_customers}
                />
                <StatCard
                    icon={TrendingDown}
                    label="Churn Rate"
                    value={`${(summary.churn_rate * 100).toFixed(1)}%`}
                    subtext={summary.churn_rate > 0.3 ? "Critical Alert" : "Healthy Range"}
                />
                <StatCard
                    icon={AlertTriangle}
                    label="At-Risk Customers"
                    value={summary.high_risk_count}
                    subtext="Action Recommended"
                />
            </div>

            {/* Detailed Table */}
            <div className="bg-black border border-zinc-900 rounded-3xl overflow-hidden">
                <div className="px-8 py-6 border-b border-zinc-900 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-white">Top 10 High Risk Customers</h3>
                        <p className="text-sm text-zinc-500">Prioritize these accounts immediately</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Download Full Details</span>
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors text-sm font-medium"
                        >
                            <TrendingDown className="h-4 w-4" />
                            Download CSV
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-950 text-zinc-500 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Customer ID</th>
                                <th className="px-6 py-4">Contract</th>
                                <th className="px-6 py-4">Tenure</th>
                                <th className="px-6 py-4">Probability</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {displayedResults.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-900 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">
                                        {row.customerID || row.customer_id || `#${idx + 1}`}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">{row.contract || row.contract_type || '-'}</td>
                                    <td className="px-6 py-4 text-zinc-400">
                                        {row.tenure || row.tenure_months} months
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${row.churn_probability > 0.5 ? 'bg-white' : 'bg-zinc-600'}`}
                                                    style={{ width: `${row.churn_probability * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-mono font-medium text-zinc-500">
                                                {(row.churn_probability * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {row.churn_prediction === 1 ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-black">
                                                RISK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-zinc-900 text-zinc-500 border border-zinc-800">
                                                SAFE
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Executive Report Section */}
            <div className="bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-lg">
                <div className="px-8 py-6 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white text-black rounded-lg">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-white">Executive Briefing</h3>
                            <p className="text-sm text-zinc-500">AI-Generated Analysis</p>
                        </div>
                    </div>

                    {!report && !reportLoading && (
                        <button
                            onClick={generateReport}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all"
                        >
                            <FileText className="h-5 w-5" />
                            Generate Report
                        </button>
                    )}
                </div>

                <div className="p-8">
                    {reportLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-white" />
                            <p className="animate-pulse">Consulting the model...</p>
                        </div>
                    ) : report ? (
                        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-white prose-strong:text-white">
                            <ReactMarkdown>{report}</ReactMarkdown>

                            <div className="mt-8 pt-8 border-t border-zinc-900 flex justify-end">
                                <button
                                    onClick={generateReport}
                                    className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Refresh Brief
                                </button>
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 transition-colors ml-6"
                                >
                                    <Mail className="h-4 w-4" />
                                    Email PDF
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-zinc-600">
                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p>Generate a comprehensive executive summary.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-2">Email Executive Report</h3>
                        <p className="text-zinc-400 text-sm mb-6">Enter your email address to receive the PDF report.</p>

                        <input
                            type="email"
                            placeholder="executive@company.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white mb-4 focus:ring-2 focus:ring-white/20 outline-none transition-all"
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail || !emailInput}
                                className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                Send PDF
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ResultsSection;
