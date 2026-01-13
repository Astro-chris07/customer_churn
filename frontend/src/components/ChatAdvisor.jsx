import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { MessageSquare, Send, X, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatAdvisor = ({ results }) => {
    // ... (lines 7-111 remain unchanged, so we target the start of the file for the import, and then the specific block for the clean up. I will do this in two chunks using multi_replace_file_content if I could, but I'll use replace_file_content for the whole file to be safe given the mess, OR just use multi_replace. Let's use multi_replace.)
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Hello! I am Persona, your AI Data Scientist. I can analyze your churn results and suggest retention strategies. Ask me anything!' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg = inputValue;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Prepare context from results
            let churnMetrics = null;
            let topRisks = null;

            if (results && results.summary) {
                churnMetrics = results.summary;
            }
            if (results && results.results) {
                // Get top 5 highest probability churners
                topRisks = [...results.results]
                    .sort((a, b) => b.churn_probability - a.churn_probability)
                    .slice(0, 5);
            }

            // Create temporary bot message for streaming
            setMessages(prev => [...prev, { role: 'bot', text: '' }]);

            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_message: userMsg,
                    churn_metrics: churnMetrics,
                    top_risks: topRisks
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

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.role === 'bot') {
                        lastMsg.text = accumulatedText;
                    }
                    return newMessages;
                });
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble thinking right now. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-8 right-8 p-4 rounded-full shadow-2xl z-50 transition-colors ${isOpen ? 'bg-zinc-800 text-zinc-400 opacity-0 pointer-events-none' : 'bg-white text-black'
                    }`}
            >
                <MessageSquare className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-white text-black border border-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">1</span>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-8 right-8 w-[500px] h-[80vh] max-h-[800px] bg-black rounded-2xl shadow-2xl border border-zinc-800 z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-zinc-950 p-4 flex justify-between items-center text-white border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg text-black">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Persona</h3>
                                    <p className="text-xs text-zinc-500">AI Data Scientist</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages Area */}

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                        ${msg.role === 'user' ? 'bg-white text-black' : 'bg-zinc-800 text-white'}
                                    `}>
                                        {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={`
                                        max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm
                                        ${msg.role === 'user'
                                            ? 'bg-white text-black rounded-tr-none'
                                            : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'}
                                    `}>
                                        {msg.role === 'bot' ? (
                                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700">
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-4 shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-zinc-950 border-t border-zinc-900">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                                className="relative"
                            >
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask for advice..."
                                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:border-white focus:ring-1 focus:ring-white outline-none transition-all text-sm placeholder:text-zinc-600"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatAdvisor;
