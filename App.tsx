import React, { useState } from 'react';
import { Search, BookOpen, BrainCircuit, PenTool, Mic, Share2 } from 'lucide-react';
import VoiceAgent from './components/VoiceAgent';
import StickmanCanvas from './components/StickmanCanvas';
import Quiz from './components/Quiz';
import Memorizer from './components/Memorizer';
import { fetchScriptureData } from './services/geminiService';
import { AppState, ScriptureResponse } from './types';

type Tab = 'insight' | 'quiz' | 'memorize';

function App() {
  const [query, setQuery] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [scripture, setScripture] = useState<ScriptureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('insight');
  const [currentSceneCaption, setCurrentSceneCaption] = useState<string>('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setAppState(AppState.LOADING_TEXT);
    setError(null);
    setScripture(null);
    setActiveTab('insight'); // Reset to insight on new search
    setCurrentSceneCaption('');

    try {
      // 1. Fetch Text & Scenes
      const data = await fetchScriptureData(query);
      setScripture(data);
      
      // We no longer generate the image here immediately. 
      // StickmanCanvas handles scene generation lazily.
      
      setAppState(AppState.READY);
    } catch (err) {
      console.error(err);
      setError("Could not find that scripture. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const handleShare = async () => {
    if (!scripture) return;

    const shareData = {
      title: scripture.reference,
      text: `${scripture.reference}\n\n"${scripture.verseText}"\n\nShared via Stickman Scripture`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert("Verse copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-900 selection:bg-yellow-200 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#fdfbf7]/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center text-white font-bold font-hand text-xl">
              S
            </div>
            <h1 className="font-serif font-bold text-xl tracking-tight">Stickman Scripture</h1>
          </div>
          <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
            Powered by Gemini
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search Area */}
        <div className="max-w-xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., David and Goliath, The Last Supper..."
              className="w-full pl-12 pr-36 py-4 bg-white border-2 border-gray-200 rounded-xl font-serif text-lg shadow-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
            
            {/* Voice Search Button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`absolute right-24 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
              title="Search by voice"
            >
              <Mic className="w-5 h-5" />
            </button>

            <button 
              type="submit" 
              disabled={appState === AppState.LOADING_TEXT}
              className="absolute right-2 top-2 bottom-2 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {appState === AppState.LOADING_TEXT ? 'Reading...' : 'Read'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-xl mx-auto mb-8 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Left Column: Visual Narrative */}
          <div className="order-2 md:order-1 sticky top-24">
            <StickmanCanvas 
              isLoadingScripture={appState === AppState.LOADING_TEXT}
              scenes={scripture?.scenes || []}
              onSceneChange={setCurrentSceneCaption}
            />
          </div>

          {/* Right Column: Text & Tools */}
          <div className="order-1 md:order-2 flex flex-col gap-6 md:pt-8">
             {scripture ? (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="flex items-center gap-2 mb-2 text-yellow-600 font-bold uppercase tracking-wider text-xs">
                    <BookOpen className="w-4 h-4" />
                    Scripture
                 </div>
                 
                 {/* Header with Share */}
                 <div className="flex items-start justify-between gap-4 mb-6">
                   <h2 className="font-serif text-4xl md:text-5xl text-gray-900 leading-tight">
                     {scripture.reference}
                   </h2>
                   <button 
                    onClick={handleShare}
                    className="mt-1 p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                    title="Share Verse"
                   >
                     <Share2 className="w-6 h-6" />
                   </button>
                 </div>
                 
                 {/* Tabs */}
                 <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl mb-6 w-fit">
                    <button
                      onClick={() => setActiveTab('insight')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'insight' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <BookOpen className="w-4 h-4" /> Insight
                    </button>
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'quiz' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <PenTool className="w-4 h-4" /> Quiz
                    </button>
                    <button
                      onClick={() => setActiveTab('memorize')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'memorize' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <BrainCircuit className="w-4 h-4" /> Memorize
                    </button>
                 </div>

                 {/* Tab Content */}
                 
                 {/* 1. Insight Tab */}
                 {activeTab === 'insight' && (
                   <>
                    <div className="prose prose-lg prose-stone mb-8">
                      <p className="text-xl md:text-2xl leading-relaxed font-serif text-gray-800">
                        "{scripture.verseText}"
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                        <h3 className="font-hand text-xl font-bold text-gray-900 mb-2">Meaning</h3>
                        <p className="text-gray-600 leading-relaxed">
                          {scripture.explanation}
                        </p>
                    </div>
                   </>
                 )}

                 {/* 2. Quiz Tab */}
                 {activeTab === 'quiz' && (
                   <Quiz scripture={scripture} />
                 )}

                 {/* 3. Memorize Tab */}
                 {activeTab === 'memorize' && (
                   <Memorizer text={scripture.verseText} />
                 )}

               </div>
             ) : (
               // Empty State / Introduction
               !appState.includes('LOADING') && (
                 <div className="text-center md:text-left text-gray-400 py-12">
                   <p className="text-lg font-serif italic">
                     "Thy word is a lamp unto my feet, and a light unto my path."
                   </p>
                   <p className="text-sm mt-2 font-sans">- Psalm 119:105</p>
                   
                   <div className="mt-12 p-6 bg-white rounded-xl border border-dashed border-gray-300">
                      <h3 className="text-gray-900 font-bold mb-2">Features</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                          <BookOpen className="w-4 h-4 mt-1 text-yellow-600" />
                          <span className="text-gray-600 text-left">Visual Stories</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <PenTool className="w-4 h-4 mt-1 text-yellow-600" />
                          <span className="text-gray-600 text-left">Interactive Quizzes</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <BrainCircuit className="w-4 h-4 mt-1 text-yellow-600" />
                          <span className="text-gray-600 text-left">Memorization Tools</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-hand font-bold text-lg leading-none text-yellow-600">?</span>
                          <span className="text-gray-600 text-left">Voice Companion</span>
                        </div>
                      </div>
                   </div>
                 </div>
               )
             )}
          </div>

        </div>
      </main>

      <VoiceAgent 
        contextText={scripture ? `Reading: ${scripture.reference}. Scene: ${currentSceneCaption}` : undefined} 
      />
    </div>
  );
}

export default App;