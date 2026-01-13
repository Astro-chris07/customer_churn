import React, { useState } from 'react';
import UploadSection from './components/UploadSection';
import ResultsSection from './components/ResultsSection';
import ChatAdvisor from './components/ChatAdvisor';
import { AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Activity className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">PERSONA AI</h1>
              <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase">Retention Intelligence</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">Enterprise Edition</p>
            <p className="text-xs text-zinc-500">v2.4.0 (Stable)</p>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {results ? (
              <ResultsSection key="results" data={results} />
            ) : (
              <UploadSection key="upload" setResults={setResults} setLoading={setLoading} loading={loading} />
            )}
          </AnimatePresence>
        </main>
      </div>

      <ChatAdvisor results={results} />
    </div>
  );
}

export default App;
