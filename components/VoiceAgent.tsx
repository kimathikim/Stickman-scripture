import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Loader2, Volume2, X } from 'lucide-react';
import { connectToLiveSession } from '../services/geminiService';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

interface VoiceAgentProps {
  contextText?: string; // Optional context to feed the agent about what user is reading
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({ contextText }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Canvas Ref for Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerDataRef = useRef<Uint8Array | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const cleanupAudio = useCallback(() => {
    if (sessionRef.current) {
      // We can't explicitly "close" via method in some versions, but we drop reference
      // Ideally calls session.close() if available in the returned object structure
      // The instruction says use session.close()
      try { sessionRef.current.close(); } catch (e) { /* ignore */ }
      sessionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    setIsActive(false);
    setIsConnecting(false);
    setIsPlaying(false);
  }, []);

  const startSession = async () => {
    try {
      setIsConnecting(true);

      // 1. Audio Output Setup
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      const outputGain = audioContextRef.current.createGain();
      
      // Analyser for visualizer
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      outputGain.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      nextStartTimeRef.current = 0;

      // 2. Audio Input Setup
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Gemini
      const sessionPromise = connectToLiveSession(
        () => {
          console.log('Session Opened');
          setIsConnecting(false);
          setIsActive(true);
          
          // Setup Input Streaming
          const source = inputContextRef.current!.createMediaStreamSource(stream);
          sourceRef.current = source;
          
          const processor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          
          source.connect(processor);
          processor.connect(inputContextRef.current!.destination);

          // If there is initial context, send it as text
          if (contextText) {
             sessionPromise.then(session => {
               session.sendRealtimeInput({ text: `I am currently reading: ${contextText}. Let's discuss it.` });
             });
          }
        },
        async (msg) => {
          // Handle Audio Output
          const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && audioContextRef.current) {
             setIsPlaying(true);
             const ctx = audioContextRef.current;
             const bytes = base64ToUint8Array(base64Audio);
             const buffer = await decodeAudioData(bytes, ctx);
             
             const source = ctx.createBufferSource();
             source.buffer = buffer;
             source.connect(outputGain);
             
             // Scheduling
             const now = ctx.currentTime;
             // Ensure we don't schedule in the past, but also maintain continuous stream
             const startTime = Math.max(now, nextStartTimeRef.current);
             source.start(startTime);
             
             nextStartTimeRef.current = startTime + buffer.duration;
             
             sourcesRef.current.add(source);
             source.onended = () => {
               sourcesRef.current.delete(source);
               if (sourcesRef.current.size === 0) setIsPlaying(false);
             };
          }

          // Handle Interruption
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setIsPlaying(false);
          }
        },
        (err) => {
          console.error("Live API Error", err);
          cleanupAudio();
        },
        () => {
          console.log("Session Closed");
          cleanupAudio();
        }
      );

      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error("Failed to start session", error);
      cleanupAudio();
    }
  };

  // Visualizer Loop
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    let animationId: number;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const draw = () => {
      if (!analyserRef.current || !ctx) return;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Stickman aesthetic: Sketchy lines
        ctx.fillStyle = `rgb(50, 50, 50)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  // Update context when it changes if session is active
  useEffect(() => {
      if (isActive && sessionRef.current && contextText) {
           sessionRef.current.sendRealtimeInput({ text: `I have moved to a new verse: ${contextText}.` });
      }
  }, [contextText, isActive]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${isActive ? 'w-72' : 'w-16'}`}>
      <div className={`bg-white border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl overflow-hidden transition-all`}>
        
        {/* Active State UI */}
        {isActive && (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-hand font-bold text-xl text-gray-800">Study Buddy</span>
              <button onClick={cleanupAudio} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="h-24 bg-gray-50 rounded-lg border border-gray-200 flex items-end justify-center overflow-hidden relative">
               {!isPlaying && !isConnecting && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Listening...</div>}
               <canvas ref={canvasRef} width={250} height={96} className="w-full h-full" />
            </div>
            
            <div className="text-xs text-gray-500 text-center font-hand">
              Speaking naturally...
            </div>
          </div>
        )}

        {/* Inactive/Toggle Button */}
        {!isActive && (
          <button 
            onClick={startSession}
            disabled={isConnecting}
            className="w-16 h-16 flex items-center justify-center bg-yellow-400 hover:bg-yellow-300 transition-colors"
          >
            {isConnecting ? (
              <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
            ) : (
              <Mic className="w-8 h-8 text-gray-900" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceAgent;