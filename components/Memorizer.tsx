import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Eye, EyeOff, Wand2 } from 'lucide-react';

interface MemorizerProps {
  text: string;
}

const Memorizer: React.FC<MemorizerProps> = ({ text }) => {
  const [level, setLevel] = useState(0); // 0 = show all, 1 = easy, 2 = med, 3 = hard
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  // Split text into words, preserving punctuation attached to words is tricky, 
  // so we just split by space and handle basic punctuation.
  const words = useMemo(() => text.split(' '), [text]);

  useEffect(() => {
    generateHiddenIndices(level);
  }, [level, text]);

  const generateHiddenIndices = (lvl: number) => {
    setRevealedIndices(new Set()); // Reset revealed hints
    const indices = new Set<number>();
    
    if (lvl === 0) {
        setHiddenIndices(indices);
        return;
    }

    const totalWords = words.length;
    // Level 1: 25%, Level 2: 50%, Level 3: 80%
    const percentToHide = lvl === 1 ? 0.25 : lvl === 2 ? 0.5 : 0.8;
    const countToHide = Math.floor(totalWords * percentToHide);

    // Create array of indices [0...n]
    const allIndices = Array.from({ length: totalWords }, (_, i) => i);
    
    // Shuffle
    for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }

    // Pick first N
    for (let i = 0; i < countToHide; i++) {
        indices.add(allIndices[i]);
    }
    setHiddenIndices(indices);
  };

  const toggleReveal = (index: number) => {
    const newRevealed = new Set(revealedIndices);
    if (newRevealed.has(index)) {
        newRevealed.delete(index);
    } else {
        newRevealed.add(index);
    }
    setRevealedIndices(newRevealed);
  };

  const levels = [
    { label: 'Read', icon: Eye },
    { label: 'Easy', icon: Wand2 },
    { label: 'Medium', icon: EyeOff },
    { label: 'Hard', icon: EyeOff },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
      
      {/* Controls */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 justify-center overflow-x-auto">
        {levels.map((lvl, idx) => {
            const Icon = lvl.icon;
            const isActive = level === idx;
            return (
                <button
                    key={idx}
                    onClick={() => setLevel(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${isActive 
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200 ring-1 ring-gray-900' 
                            : 'text-gray-500 hover:bg-gray-100'
                        }
                    `}
                >
                    <Icon className="w-4 h-4" />
                    {lvl.label}
                </button>
            );
        })}
      </div>

      {/* Game Area */}
      <div className="p-8 min-h-[300px] flex items-center justify-center">
        <div className="flex flex-wrap gap-x-2 gap-y-4 text-xl md:text-2xl leading-relaxed font-serif justify-center">
            {words.map((word, idx) => {
                const isHidden = hiddenIndices.has(idx);
                const isRevealed = revealedIndices.has(idx);
                
                if (!isHidden) {
                    return <span key={idx} className="text-gray-800">{word}</span>;
                }

                return (
                    <button
                        key={idx}
                        onClick={() => toggleReveal(idx)}
                        className={`
                            relative px-2 py-0.5 rounded transition-all duration-300
                            ${isRevealed 
                                ? 'bg-yellow-100 text-gray-800 ring-1 ring-yellow-300' 
                                : 'bg-gray-200 text-transparent hover:bg-gray-300 cursor-pointer w-[5ch] min-h-[1.5em]'
                            }
                        `}
                        aria-label={isRevealed ? "Hide word" : "Reveal word"}
                    >
                        {/* Always render word for width, hide with text-transparent if needed */}
                        <span className={!isRevealed ? 'invisible' : ''}>{word}</span>
                        {!isRevealed && (
                             <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs font-sans select-none">
                                ?
                             </span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      <div className="bg-gray-50 border-t border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 font-hand">
              Level {level === 0 ? "Zero" : level}: {hiddenIndices.size} words hidden. Click a box to peek.
          </p>
      </div>
    </div>
  );
};

export default Memorizer;
