import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Scene } from '../types';
import { generateStickmanImage } from '../services/geminiService';

interface StickmanCanvasProps {
  isLoadingScripture: boolean;
  scenes: Scene[];
  onSceneChange?: (caption: string) => void;
}

const StickmanCanvas: React.FC<StickmanCanvasProps> = ({ isLoadingScripture, scenes, onSceneChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
  const [errorImages, setErrorImages] = useState<Record<number, boolean>>({});
  
  // Reset state when scenes change completely (new search)
  useEffect(() => {
    setImages({});
    setLoadingImages({});
    setErrorImages({});
    setCurrentIndex(0);
  }, [scenes]);

  // Notify parent of scene change for voice agent context
  useEffect(() => {
    if (scenes[currentIndex]) {
      onSceneChange?.(scenes[currentIndex].caption);
    }
  }, [currentIndex, scenes, onSceneChange]);

  // Lazy load the current image
  useEffect(() => {
    const loadCurrentImage = async () => {
      if (!scenes.length) return;
      if (images[currentIndex]) return; // Already loaded
      if (loadingImages[currentIndex]) return; // Already loading

      setLoadingImages(prev => ({ ...prev, [currentIndex]: true }));
      setErrorImages(prev => ({ ...prev, [currentIndex]: false }));

      try {
        const base64 = await generateStickmanImage(scenes[currentIndex].visualPrompt);
        setImages(prev => ({ ...prev, [currentIndex]: base64 }));
      } catch (err) {
        console.error(`Failed to load image for scene ${currentIndex}`, err);
        setErrorImages(prev => ({ ...prev, [currentIndex]: true }));
      } finally {
        setLoadingImages(prev => ({ ...prev, [currentIndex]: false }));
      }
    };

    loadCurrentImage();
  }, [currentIndex, scenes, images, loadingImages]);

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(scenes.length - 1, prev + 1));
  };

  const isLoadingImage = loadingImages[currentIndex];
  const imageData = images[currentIndex];
  const hasError = errorImages[currentIndex];
  const currentCaption = scenes[currentIndex]?.caption;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-square mb-6">
        {/* Hand-drawn border effect */}
        <div className="absolute inset-0 border-4 border-gray-900 rounded-lg transform rotate-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] bg-white z-0"></div>
        <div className="absolute inset-0 border-4 border-gray-900 rounded-lg transform -rotate-1 bg-white z-10 flex items-center justify-center overflow-hidden">
          
          {/* Initial Global Loading State */}
          {isLoadingScripture && (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <Loader2 className="w-12 h-12 text-gray-800 animate-spin" />
              <p className="font-hand text-xl text-gray-600 animate-pulse">Writing the story...</p>
            </div>
          )}

          {/* Scene Loading State */}
          {!isLoadingScripture && isLoadingImage && (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              <p className="font-hand text-lg text-gray-400">Drawing scene {currentIndex + 1}...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoadingScripture && hasError && (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-red-400">
              <ImageIcon className="w-10 h-10 opacity-50" />
              <p className="font-hand">Couldn't draw this scene.</p>
              <button 
                 onClick={() => setLoadingImages(prev => ({ ...prev, [currentIndex]: false }))}
                 className="text-xs underline hover:text-red-600"
              >
                Retry
              </button>
            </div>
          )}

          {/* Image Display */}
          {!isLoadingScripture && imageData && !isLoadingImage && (
            <img 
              src={`data:image/png;base64,${imageData}`} 
              alt={currentCaption} 
              className="w-full h-full object-cover grayscale contrast-125 animate-in fade-in duration-500" 
            />
          )}

          {/* Empty Start State */}
          {!isLoadingScripture && !scenes.length && (
            <div className="p-8 text-center">
              <p className="font-hand text-2xl text-gray-400">Enter a verse to see the story!</p>
            </div>
          )}
        </div>
        
        {/* Tape effect */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-yellow-100/80 rotate-2 shadow-sm z-20 backdrop-blur-sm border border-white/20"></div>

        {/* Navigation Arrows (Overlay) */}
        {!isLoadingScripture && scenes.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/80 rounded-full shadow-sm disabled:opacity-0 hover:bg-white transition-all border-2 border-transparent hover:border-gray-900"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
            <button 
              onClick={handleNext}
              disabled={currentIndex === scenes.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/80 rounded-full shadow-sm disabled:opacity-0 hover:bg-white transition-all border-2 border-transparent hover:border-gray-900"
            >
              <ChevronRight className="w-6 h-6 text-gray-900" />
            </button>
          </>
        )}
      </div>

      {/* Scene Description (Caption) */}
      {!isLoadingScripture && scenes.length > 0 && (
        <div className="text-center space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex justify-center gap-2 mb-2">
            {scenes.map((_, idx) => (
              <div 
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-gray-900' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm inline-block max-w-full">
             <p className="font-hand text-xl md:text-2xl text-gray-800 leading-tight">
              {currentCaption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickmanCanvas;