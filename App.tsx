
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import Background from './components/Background';
import FloatingElements from './components/FloatingElements';
import ErrorNotification from './components/ErrorNotification';
import { puterService, AttachedFile } from './puterService';
import { ChatMessage, UsageStats } from './types';

// TYPES
type ViewMode = 'synthesis' | 'media' | 'references' | 'sources' | 'neural-artifacts';

// CUSTOM THEMED CURSOR
const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsHidden(false);
      const target = e.target as HTMLElement;
      setIsPointer(
        window.getComputedStyle(target).cursor === 'pointer' || 
        ['BUTTON', 'A', 'INPUT'].includes(target.tagName) || 
        !!target.closest('button')
      );
    };
    const onMouseLeave = () => setIsHidden(true);
    const onMouseEnter = () => setIsHidden(false);

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, []);

  if (isHidden) return null;

  return (
    <div 
      className="fixed top-0 left-0 pointer-events-none z-[100] transition-transform duration-75 ease-out"
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      <div className={`relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 ${isPointer ? 'scale-125' : 'scale-100'}`}>
        <div className="absolute w-12 h-12 bg-cyan-400/5 rounded-full blur-2xl animate-pulse" />
        <div className={`absolute w-7 h-7 border border-cyan-400/20 rounded-full transition-all duration-500 ${isPointer ? 'rotate-90 scale-110' : ''}`} />
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,1)]" />
        {isPointer && (
          <div className="absolute w-10 h-10 border-[0.5px] border-cyan-400/40 rounded-full animate-ping" />
        )}
      </div>
    </div>
  );
};

const SparkParticles: React.FC = React.memo(() => {
  const particles = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1.2}px`,
      delayVal: Math.random() * 2,
      durationVal: Math.random() * 2.5 + 1.5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-cyan-400 rounded-full blur-[1px] shadow-[0_0_12px_rgba(34,211,238,0.8)]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `spark-flicker ${p.durationVal}s infinite ease-in-out ${p.delayVal}s, spark-float ${p.durationVal * 2}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
});

const SparkleTitle: React.FC<{ hasHistory: boolean; isLoading: boolean; onReset: () => void }> = ({ hasHistory, isLoading, onReset }) => {
  return (
    <motion.div 
      layout
      className={`flex flex-col pointer-events-auto select-none w-full ${
        hasHistory 
          ? 'items-start justify-center' 
          : 'items-center pt-16 sm:pt-28'
      }`}
    >
      <motion.button 
        layout
        onClick={onReset}
        disabled={!hasHistory || isLoading}
        className={`flex flex-col relative transition-all duration-1000 group ${
        hasHistory 
          ? 'scale-[0.08] sm:scale-[0.1] origin-left' 
          : 'scale-100 items-center origin-center'
      }`}>
        <SparkParticles />
        <motion.h1 
          layout
          className={`font-cursive tracking-tight text-7xl sm:text-8xl md:text-9xl font-light relative z-10 transition-all duration-1000 ${
          hasHistory || isLoading ? 'spark-glow-active' : 'spark-glow text-white/95'
        } ${hasHistory ? 'group-hover:scale-110 active:scale-95' : ''}`}>
          Spark
        </motion.h1>
        <motion.span 
          layout
          className={`text-[11px] font-bold text-cyan-400/40 uppercase tracking-[1.5em] mt-3 transition-all duration-1000 ${hasHistory ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          Intelligence Reimagined
        </motion.span>
      </motion.button>
    </motion.div>
  );
};

const FieldThinkingIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  if (!isLoading) return null;
  return (
    <div className="absolute -bottom-6 left-0 right-0 h-1 px-10 pointer-events-none overflow-hidden animate-in fade-in duration-700">
      <div className="relative w-full h-full bg-cyan-400/5 rounded-full">
        <div className="absolute inset-0 bg-cyan-400/10 blur-[2px]" />
        <div 
          className="absolute h-full w-20 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)]"
          style={{ animation: 'spark-travel 2s infinite ease-in-out' }}
        />
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
           <span className="text-[9px] font-black text-cyan-400/40 uppercase tracking-[0.5em] animate-pulse">
             Spark Neural Link Active
           </span>
        </div>
      </div>
    </div>
  );
};

const ThinkingIndicator: React.FC<{ engine?: UsageStats['engine']; step?: string }> = ({ engine, step }) => {
  const isCached = engine === 'Local Cache';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-5 mt-6"
    >
      <div className="thinking-spark-container">
        <div className={`thinking-spark-ring ${isCached ? 'border-green-400' : 'border-cyan-400'}`}></div>
        <div className={`thinking-spark-core ${isCached ? 'bg-green-400' : 'bg-cyan-400'}`}></div>
      </div>
      <div className="flex flex-col">
        <span className={`text-[12px] font-black uppercase tracking-[0.6em] animate-pulse ${isCached ? 'text-green-400' : 'text-cyan-400'}`}>
          {isCached ? 'Memory Sector' : 'Spark Neural Uplink'}
        </span>
        <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1.5 font-mono italic">
          {step || 'Processing inquiry...'}
        </span>
      </div>
    </motion.div>
  );
};

const FormattedContent: React.FC<{ content: string }> = React.memo(({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseMarkdown = useCallback((text: string) => {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="md-inline-code">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">$1</a>');
  }, []);

  const renderLines = useMemo(() => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentCodeBlock: string[] | null = null;

    lines.forEach((line, i) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('```')) {
        if (currentCodeBlock) {
          elements.push(
            <motion.pre 
              key={`code-${i}`} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              className="md-code-block"
            >
              <code>{currentCodeBlock.join('\n')}</code>
            </motion.pre>
          );
          currentCodeBlock = null;
        } else {
          currentCodeBlock = [];
        }
        return;
      }
      
      if (currentCodeBlock !== null) {
        currentCodeBlock.push(line);
        return;
      }

      const delay = Math.min(i * 0.02, 0.5);

      // Handle headers by removing # and making them bold/large
      if (trimmedLine.startsWith('#')) {
        const level = (trimmedLine.match(/^#+/) || ['#'])[0].length;
        const text = trimmedLine.replace(/^#+\s*/, '');
        const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
        elements.push(
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Tag dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }} />
          </motion.div>
        );
      } 
      else if (trimmedLine.match(/^[-*]\s/)) {
        const text = trimmedLine.replace(/^[-*]\s/, '');
        elements.push(
          <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }} />
        );
      } 
      else if (trimmedLine) {
        elements.push(<motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }} />);
      }
    });

    return elements;
  }, [content, parseMarkdown]);

  return (
    <div className="md-content relative group/content">
      <button 
        onClick={handleCopy}
        className="absolute -top-4 -right-4 p-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all opacity-0 group-hover/content:opacity-100 z-20 flex items-center gap-2"
      >
        <span className="text-[8px] font-bold uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {copied ? <path d="M20 6L9 17l-5-5" /> : <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />}
          {!copied && <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />}
        </svg>
      </button>
      {renderLines}
    </div>
  );
});

const UsageBadge: React.FC<{ usage?: UsageStats }> = ({ usage }) => {
  if (!usage) return null;
  const labels: Record<string, string> = {
    'Spark AI Synthesis': 'Spark Node 4.0',
    'Local Cache': 'Memory Sector',
    'Quick Search Fallback': 'Neural Fallback'
  };
  
  const colorClass = usage.isCached ? 'text-green-400' : 'text-cyan-400';

  return (
    <div className="flex items-center gap-3 ml-auto px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-inner">
      <div className="flex flex-col items-end">
        <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Latency</span>
        <span className={`text-[10px] font-bold ${colorClass}`}>
          {usage.latency ? `${usage.latency}ms` : 'Instant'}
        </span>
      </div>
      <div className="w-px h-6 bg-white/10" />
      <div className="flex flex-col items-start">
        <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Neural Path</span>
        <span className="text-[10px] text-white/70 font-mono tracking-tight">{labels[usage.engine] || usage.engine}</span>
      </div>
    </div>
  );
};

const QuickResults: React.FC<{ sources?: any[], images?: any[], videos?: any[] }> = ({ sources, images, videos }) => {
  if (!sources?.length && !images?.length && !videos?.length) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 mt-8 p-6 sm:p-10 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] shadow-2xl ring-1 ring-white/5 overflow-hidden"
    >
      <div className="flex items-center gap-4 mb-2">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/60">Neural Search Results</h3>
      </div>
      
      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-4">
          <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Verified Links</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.slice(0, 4).map((s, i) => (
              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all flex items-center gap-3 group/link min-w-0">
                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/40 group-hover/link:text-cyan-400 shrink-0">{i+1}</div>
                <span className="text-[11px] text-white/70 truncate group-hover/link:text-white font-medium">{s.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {images && images.length > 0 && (
        <div className="flex flex-col gap-4">
          <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Visual Context</h4>
          <div className="flex gap-3 overflow-x-auto pb-4 custom-scroll no-scrollbar -mx-2 px-2">
            {images.slice(0, 8).map((img, i) => (
              <div key={i} className="relative shrink-0 group/qimg">
                <img 
                  src={img.thumbnail || img.url} 
                  alt={img.title}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border border-white/10 hover:scale-105 transition-all duration-500 cursor-pointer shadow-lg" 
                  onClick={() => window.open(img.url, '_blank')} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400`;
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/qimg:opacity-100 transition-opacity rounded-2xl pointer-events-none flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const App: React.FC = () => {
  const [isPuterReady, setIsPuterReady] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | undefined>();
  const [currentEngine, setCurrentEngine] = useState<UsageStats['engine']>('Spark AI Synthesis');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<number, ViewMode>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const toggleVoiceSearch = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) return;
    if (isListening) { recognitionRef.current?.stop(); return; }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => { setQuery(event.results[0][0].transcript); setIsListening(false); };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) { setIsListening(false); }
  }, [isListening]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setQuery('');
    setAttachedFile(null);
    setIsLoading(false);
    setError(null);
    setShowScrollTop(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    const checkPuter = () => {
      if (typeof (window as any).puter !== 'undefined') {
        setIsPuterReady(true);
      } else {
        setTimeout(checkPuter, 100);
      }
    };
    checkPuter();
  }, []);

  useEffect(() => {
    const mainEl = scrollRef.current;
    if (!mainEl) return;
    const handleScroll = () => setShowScrollTop(mainEl.scrollTop > 300);
    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length >= 2 && !isLoading) {
        const fetched = await puterService.getSuggestions(query);
        setSuggestions(fetched);
        setShowSuggestions(fetched.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [query, isLoading]);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault();
    if (!isPuterReady) {
      setError("Spark Neural Interface is still initializing...");
      return;
    }
    const finalQuery = (overrideQuery || query).trim();
    if ((!finalQuery && !attachedFile) || isLoading) return;

    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    
    const userMsgIdx = messages.length;
    setMessages(prev => [...prev, { role: 'user', content: finalQuery || "Analyze Payload" }]);
    setIsLoading(true);
    setCurrentStep("Initializing Spark Node...");
    setCurrentEngine('Spark AI Synthesis');
    setError(null);

    const startTime = Date.now();
    const currentFile = attachedFile;
    setAttachedFile(null);

    try {
      const stream = puterService.streamSearch(finalQuery || "Search Request", currentFile || undefined);
      
      let assistantMsgAdded = false;
      let accumulatedText = '';
      let loopEngine: UsageStats['engine'] = 'Spark AI Synthesis';

      for await (const chunk of stream) {
        if (chunk.step) setCurrentStep(chunk.step);
        if (chunk.engine) loopEngine = chunk.engine;
        setCurrentEngine(loopEngine);

        const hasContent = chunk.text || chunk.images || chunk.videos || chunk.sources;

        if (!chunk.done && hasContent) {
          if (chunk.text) accumulatedText += chunk.text;
          
          if (!assistantMsgAdded) {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: accumulatedText, 
              images: chunk.images,
              videos: chunk.videos,
              sources: chunk.sources,
              usage: { estimatedTokens: 0, engine: loopEngine, isCached: chunk.isCached || false } 
            }]);
            assistantMsgAdded = true;
            // If it's a fallback, maybe switch to sources tab? 
            // Actually, let's keep it on synthesis but show the results below.
            setActiveTabs(prev => ({ ...prev, [userMsgIdx + 1]: 'synthesis' }));
          } else {
            setMessages(prev => {
              const newMsgs = [...prev];
              const lastIdx = newMsgs.length - 1;
              if (lastIdx < 0) return prev;
              newMsgs[lastIdx] = { 
                ...newMsgs[lastIdx], 
                content: accumulatedText,
                images: chunk.images || newMsgs[lastIdx].images,
                videos: chunk.videos || newMsgs[lastIdx].videos,
                sources: chunk.sources || newMsgs[lastIdx].sources,
                usage: { estimatedTokens: 0, engine: loopEngine, isCached: chunk.isCached || false, latency: Date.now() - startTime }
              };
              return newMsgs;
            });
          }
        } else if (chunk.done) {
          const related = await puterService.generateRelatedQueries(finalQuery, accumulatedText);
          
          puterService.updateCacheRelated(finalQuery, currentFile, related);

          setMessages(prev => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            if (lastIdx < 0) return prev;
            newMsgs[lastIdx] = { 
              ...newMsgs[lastIdx], 
              sources: chunk.sources,
              images: chunk.images || newMsgs[lastIdx].images,
              videos: chunk.videos || newMsgs[lastIdx].videos,
              relatedQueries: related,
              usage: { ...newMsgs[lastIdx].usage!, latency: Date.now() - startTime }
            };
            return newMsgs;
          });
          setIsLoading(false);

          // Trigger AI Visual Generation in background
          handleAIGeneration(finalQuery, userMsgIdx + 1);
        }
      }
    } catch (error: any) {
      console.error("Critical Failure:", error);
      setError("Spark core disconnect detected.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setCurrentStep(undefined);
    }
  };

  const handleAIGeneration = async (query: string, msgIdx: number) => {
    try {
      setCurrentStep("Synthesizing Neural Visuals...");
      const [aiImage, aiVideo] = await Promise.all([
        puterService.generateAIImage(query),
        puterService.generateAIVideo(query)
      ]);

      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[msgIdx]) {
          newMsgs[msgIdx] = {
            ...newMsgs[msgIdx],
            aiImage: aiImage || undefined,
            aiVideo: aiVideo || undefined
          };
        }
        return newMsgs;
      });
    } catch (e) {
      console.error("AI Generation failed", e);
    } finally {
      setCurrentStep(undefined);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const hasHistory = messages.length > 0;
  const canSubmit = query.trim().length > 0 || attachedFile !== null;

  const ghostText = useMemo(() => {
    if (!query || suggestions.length === 0) return '';
    const firstMatch = suggestions[0];
    if (firstMatch.toLowerCase().startsWith(query.toLowerCase())) {
      return firstMatch.slice(query.length);
    }
    return '';
  }, [query, suggestions]);

  return (
    <LayoutGroup>
      <div className="relative h-screen w-full flex bg-[#010103] overflow-hidden font-sans selection:bg-cyan-500/20">
      <CustomCursor />
      <Background />
      <FloatingElements />
      {error && <ErrorNotification message={error} onClose={() => setError(null)} />}

      {/* Main Content Area */}
      {!isPuterReady && (
        <div className="fixed inset-0 z-[100] bg-[#010103] flex flex-col items-center justify-center gap-6">
          <div className="thinking-spark-container scale-150">
            <div className="thinking-spark-ring border-cyan-400"></div>
            <div className="thinking-spark-core bg-cyan-400"></div>
          </div>
          <span className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.8em] animate-pulse">
            Initializing Spark Neural Bridge
          </span>
        </div>
      )}
      <div className="flex-1 flex flex-col relative">
        <motion.header 
          layout
          className={`fixed top-0 left-0 right-0 z-[60] flex items-center px-6 sm:px-16 transition-all duration-1000 ${
          hasHistory ? 'h-20 header-glass' : 'h-[32vh] sm:h-[38vh] items-end justify-center pb-8'
        } ${isLoading ? 'header-loading-glow' : ''}`}>
          <SparkleTitle hasHistory={hasHistory} isLoading={isLoading} onReset={handleReset} />
          {hasHistory && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="header-accent-line" />}
        </motion.header>

        <main 
          ref={scrollRef}
          className={`flex-1 w-full max-w-[920px] mx-auto px-4 sm:px-12 overflow-y-auto pt-28 sm:pt-36 pb-64 transition-all duration-1000 custom-scroll ${hasHistory ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          <div className="flex flex-col gap-12 sm:gap-18">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group/msg flex flex-col w-full relative"
                >
                  {msg.role === 'user' ? (
                    <div className="flex flex-col gap-1 py-8 px-4">
                      <div className="flex items-center gap-5 sm:gap-7">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 shrink-0 shadow-lg rotate-2 uppercase tracking-tighter">Query</div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-white/95 tracking-tight leading-snug">{msg.content}</h2>
                      </div>
                      {idx === messages.length - 1 && isLoading && !messages.find((m, i) => i > idx) && (
                        <div className="pl-13 sm:pl-17">
                          <ThinkingIndicator engine={currentEngine} step={currentStep} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col border border-white/[0.08] bg-white/[0.02] backdrop-blur-[60px] rounded-[2rem] sm:rounded-[2.8rem] overflow-hidden shadow-2xl transition-all ring-1 ring-white/5 relative">
                      <div className="flex flex-wrap items-center px-5 sm:px-8 py-4 border-b border-white/[0.03] bg-white/[0.02] gap-2">
                        <div className="flex bg-white/[0.05] p-1 rounded-full gap-0.5 border border-white/5">
                          {['synthesis', 'media', 'references', 'sources', 'neural-artifacts'].map((tab) => {
                            const hasMedia = tab === 'media' && (msg.images?.length || 0) > 0;
                            const hasVideos = tab === 'references' && (msg.videos?.length || 0) > 0;
                            const hasSources = tab === 'sources' && (msg.sources?.length || 0) > 0;
                            const hasArtifacts = tab === 'neural-artifacts' && (msg.aiImage || msg.aiVideo);
                            return (
                              <button
                                key={tab}
                                onClick={() => setActiveTabs(prev => ({ ...prev, [idx]: tab as ViewMode }))}
                                className={`px-4 sm:px-7 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 relative ${
                                  (activeTabs[idx] || 'synthesis') === tab 
                                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/15' 
                                  : 'text-white/30 hover:text-white/70'
                                }`}
                              >
                                {tab === 'references' ? 'Videos' : tab === 'media' ? 'Images' : tab === 'neural-artifacts' ? 'AI Visuals' : tab}
                                {(hasMedia || hasVideos || hasSources || hasArtifacts) && (
                                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                          {msg.images && msg.images.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
                              <div className="w-1 h-1 rounded-full bg-cyan-400" />
                              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{msg.images.length} Images</span>
                            </div>
                          )}
                          {msg.videos && msg.videos.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
                              <div className="w-1 h-1 rounded-full bg-purple-400" />
                              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{msg.videos.length} Videos</span>
                            </div>
                          )}
                          <UsageBadge usage={msg.usage} />
                        </div>
                      </div>

                      <div className="p-7 sm:p-12 min-h-[200px]">
                        <AnimatePresence mode="wait">
                          {(activeTabs[idx] || 'synthesis') === 'synthesis' && (
                            <motion.div 
                              key="synthesis"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <FormattedContent content={msg.content} />
                              
                              {(msg.usage?.engine === 'Quick Search Fallback' || (!msg.content && msg.sources?.length)) && (
                                <QuickResults sources={msg.sources} images={msg.images} videos={msg.videos} />
                              )}

                              {idx === messages.length - 1 && isLoading && (
                                <div className="flex items-center gap-4 mt-8 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                                  <div className="thinking-spark-container scale-[0.6]">
                                    <div className="thinking-spark-ring border-cyan-400"></div>
                                    <div className="thinking-spark-core bg-cyan-400"></div>
                                  </div>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-cyan-400/80">
                                    Neural Stream Active...
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )}

                            {(activeTabs[idx] || 'synthesis') === 'media' && (
                              <motion.div 
                                key="media"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-10"
                              >
                                {msg.images && msg.images.length > 0 ? (
                                  <div className="flex flex-col gap-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/60 pl-2">Visual Artifacts</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                                      {msg.images.map((img, i) => (
                                        <motion.div 
                                          key={i} 
                                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          transition={{ duration: 0.5, delay: i * 0.05 }}
                                          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 aspect-square bg-black/90 shadow-xl group/img"
                                        >
                                          <img 
                                            src={img.thumbnail || img.url} 
                                            alt={img.title} 
                                            className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 group-hover/img:scale-110 transition-all duration-700 cursor-zoom-in" 
                                            referrerPolicy="no-referrer"
                                            onClick={() => window.open(img.url, '_blank')}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400`;
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 pointer-events-none">
                                            <p className="text-[9px] text-white/90 line-clamp-2 font-bold leading-tight mb-2">{img.title}</p>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[7px] text-cyan-400 uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/20">Source</span>
                                              <span className="text-[7px] text-white/40 truncate">{img.metadata?.domain || 'web'}</span>
                                            </div>
                                          </div>
                                          <a 
                                            href={img.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-white/10 text-white/40 opacity-0 group-hover/img:opacity-100 transition-all hover:text-cyan-400 hover:bg-black/80"
                                          >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                                          </a>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-40 border border-dashed border-white/10 rounded-2xl flex items-center justify-center opacity-30 text-[9px] uppercase tracking-[0.5em] font-black">No images found</div>
                                )}
                              </motion.div>
                            )}

                             {(activeTabs[idx] || 'synthesis') === 'references' && (
                              <motion.div 
                                key="references"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-10"
                              >
                                {msg.videos && msg.videos.length > 0 ? (
                                  <div className="flex flex-col gap-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400/60 pl-2">Motion Artifacts</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-7">
                                      {msg.videos.map((vid, i) => (
                                        <motion.a 
                                          key={i} 
                                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          transition={{ duration: 0.5, delay: i * 0.05 }}
                                          href={vid.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 aspect-video bg-black/90 shadow-2xl group/vid block ring-1 ring-white/5"
                                        >
                                          <img src={vid.thumbnail || vid.url} alt={vid.title} className="w-full h-full object-cover opacity-60 group-hover/vid:opacity-90 group-hover/vid:scale-110 transition-all duration-1000" referrerPolicy="no-referrer" />
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover/vid:scale-110 group-hover/vid:bg-cyan-500/20 group-hover/vid:border-cyan-400/40 transition-all duration-500 shadow-2xl">
                                              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="ml-1 group-hover:fill-cyan-400 transition-colors"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                          </div>
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-100 flex flex-col justify-end p-5">
                                            <p className="text-[11px] text-white/90 line-clamp-2 font-bold leading-snug mb-2 group-hover:text-cyan-400 transition-colors">{vid.title}</p>
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-purple-400" />
                                                <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">{vid.metadata?.domain || 'Video'}</span>
                                              </div>
                                              {vid.metadata?.engine && (
                                                <span className="text-[8px] text-white/20 uppercase font-bold tracking-tighter ml-auto">{vid.metadata.engine}</span>
                                              )}
                                            </div>
                                          </div>
                                        </motion.a>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-40 border border-dashed border-white/10 rounded-2xl flex items-center justify-center opacity-30 text-[9px] uppercase tracking-[0.5em] font-black">No videos found</div>
                                )}
                              </motion.div>
                            )}

                            {(activeTabs[idx] || 'synthesis') === 'sources' && (
                              <motion.div 
                                key="sources"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-6"
                              >
                                {msg.sources && msg.sources.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {msg.sources.map((source, i) => (
                                      <motion.a
                                        key={i}
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 transition-all group/source flex flex-col gap-2"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 group-hover/source:text-cyan-400 transition-colors">
                                            {i + 1}
                                          </div>
                                          <span className="text-[11px] font-bold text-white/80 group-hover/source:text-white transition-colors truncate">
                                            {source.title}
                                          </span>
                                        </div>
                                        <span className="text-[9px] text-white/30 truncate font-mono">
                                          {source.uri}
                                        </span>
                                      </motion.a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-40 border border-dashed border-white/10 rounded-2xl flex items-center justify-center opacity-30 text-[9px] uppercase tracking-[0.5em] font-black">No sources found</div>
                                )}
                              </motion.div>
                            )}

                            {(activeTabs[idx] || 'synthesis') === 'neural-artifacts' && (
                              <motion.div 
                                key="neural-artifacts"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-10"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                  {/* AI Image */}
                                  <div className="flex flex-col gap-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/60 pl-2">Neural Image</h3>
                                    {msg.aiImage ? (
                                      <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-square bg-black/90 shadow-2xl group/ai-img">
                                        <img src={msg.aiImage} alt="AI Generated" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/ai-img:opacity-100 transition-opacity flex items-end p-6">
                                          <button 
                                            onClick={() => window.open(msg.aiImage, '_blank')}
                                            className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 text-[10px] font-bold uppercase tracking-widest"
                                          >
                                            Export Artifact
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="aspect-square rounded-3xl border border-dashed border-white/10 flex items-center justify-center opacity-30 text-[9px] uppercase tracking-[0.5em] font-black">
                                        {isLoading ? 'Synthesizing...' : 'No Image Artifact'}
                                      </div>
                                    )}
                                  </div>

                                  {/* AI Video */}
                                  <div className="flex flex-col gap-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400/60 pl-2">Neural Motion</h3>
                                    {msg.aiVideo ? (
                                      <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-square bg-black/90 shadow-2xl group/ai-vid">
                                        <video src={msg.aiVideo} controls className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="aspect-square rounded-3xl border border-dashed border-white/10 flex items-center justify-center opacity-30 text-[9px] uppercase tracking-[0.5em] font-black">
                                        {isLoading ? 'Synthesizing...' : 'No Motion Artifact'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {!isLoading && messages.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-8 pt-6 pb-24"
              >
                <div className="flex items-center gap-4 px-2">
                  <div className="h-px flex-grow bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </div>
                    <h3 className="text-[11px] font-black text-cyan-400/60 uppercase tracking-[0.5em] whitespace-nowrap">Neural Bridge</h3>
                  </div>
                  <div className="h-px flex-grow bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {(messages[messages.length-1].relatedQueries || ["Explore Spark AI", "Spark AI search tools", "Neural logic systems"]).map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearch(undefined, text)}
                      className="p-6 sm:p-9 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-white/[0.015] backdrop-blur-md hover:bg-cyan-500/[0.03] hover:border-cyan-500/40 transition-all text-left group shadow-lg ring-1 ring-white/5 relative overflow-hidden"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all group-hover:rotate-12">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3z"/></svg>
                      </div>
                      <span className="text-[13px] sm:text-[14px] text-white/50 group-hover:text-white transition-colors line-clamp-2 leading-relaxed font-medium tracking-tight">{text}</span>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        </main>

        <LayoutGroup>
          <motion.div 
            layout
            className={`fixed left-0 right-0 px-4 flex flex-col items-center z-[70] transition-all duration-1000 ${hasHistory ? 'bottom-6 sm:bottom-10' : 'top-[50vh] -translate-y-1/2'}`}
          >
            <div className="w-full max-w-2xl flex flex-col items-center relative">
              
              {/* Scroll to Top Arrow Button */}
              <AnimatePresence>
                {hasHistory && showScrollTop && (
                  <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.5 }}
                    onClick={scrollToTop}
                    className="mb-6 p-3.5 rounded-full bg-white/[0.02] border border-cyan-400/20 text-cyan-400 backdrop-blur-xl shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-500 hover:scale-110 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-90 group relative animate-[spark-jump_2s_infinite]"
                  >
                    <div className="absolute inset-0 rounded-full border border-cyan-400/10 animate-[rotating-spark_4s_linear_infinite]" />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-y-1 transition-transform">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>

              <motion.form layout onSubmit={handleSearch} className="w-full relative group/form">
                <div className={`flex items-center relative rounded-[2rem] sm:rounded-[2.5rem] transition-all duration-700 search-glass search-focus-glow ring-1 ring-white/10 ${isLoading ? 'border-cyan-500/60 shadow-[0_0_40px_rgba(34,211,238,0.2)]' : ''}`}>
                  
                  <div className="flex-shrink-0 pl-4 sm:pl-7 pr-1">
                    <div className="w-10 h-10 flex items-center justify-center relative">
                      <div className={`absolute inset-0 rounded-full border border-cyan-400/20 ${isLoading ? 'animate-spin' : ''}`} />
                      <div className={`w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)] ${!isLoading ? 'animate-pulse' : 'animate-ping'}`} />
                    </div>
                  </div>

                  <div className="flex-grow relative flex items-center overflow-hidden">
                    {ghostText && (
                      <div className="absolute left-2.5 pointer-events-none text-white/20 text-sm sm:text-lg font-light tracking-tight whitespace-pre select-none truncate max-w-full">
                        <span className="opacity-0">{query}</span>
                        <span>{ghostText}</span>
                      </div>
                    )}
                    <input
                      type="text" value={query} 
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && ghostText) {
                          e.preventDefault();
                          setQuery(query + ghostText);
                        }
                      }}
                      placeholder={isListening ? "Listening..." : "Search with Spark AI..."}
                      onFocus={() => { if(query.length >= 2) setShowSuggestions(true); }}
                      className="w-full bg-transparent px-2.5 py-4 sm:py-5 text-white placeholder-white/20 focus:outline-none text-sm sm:text-lg font-light tracking-tight relative z-10"
                      autoFocus
                    />
                  </div>

                <div className="flex-shrink-0 pr-4 sm:pr-6 flex items-center gap-1.5 sm:gap-2.5">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-lg transition-all ${attachedFile ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/40' : 'text-white/35 hover:text-cyan-400'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57a4 4 0 1 1 5.66 5.66l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setAttachedFile({ data: (reader.result as string).split(',')[1], mimeType: file.type });
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <button type="button" onClick={toggleVoiceSearch} className={`p-2.5 rounded-full transition-colors ${isListening ? 'bg-red-500/60 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-white/10 hover:text-cyan-400'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </button>
                  <button type="submit" disabled={!canSubmit || isLoading} className={`p-3.5 sm:p-4 rounded-full transition-all duration-700 ${canSubmit ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/40 active:scale-95' : 'bg-white/5 text-white/10 opacity-30'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>

              {/* Thinking Indicator */}
              <FieldThinkingIndicator isLoading={isLoading} />

              {showSuggestions && suggestions.length > 0 && query.length >= 2 && (
                <div 
                  ref={suggestionRef}
                  className="absolute top-full left-0 right-0 mt-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[80] animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-white/5"
                >
                  <div className="py-3">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSearch(undefined, s)}
                        className="w-full px-8 py-4 text-left hover:bg-white/5 flex items-center gap-5 group transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/20 group-hover:text-cyan-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <span className="text-white/60 group-hover:text-white text-[15px] font-medium tracking-tight">
                          {s}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.form>
            </div>
          </motion.div>
        </LayoutGroup>

          {!hasHistory && (
            <div className="fixed bottom-10 left-0 right-0 flex flex-col items-center gap-8 animate-result delay-500">
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 px-6">
                <button onClick={() => handleSearch(undefined, "Markets update")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Markets</button>
                <button onClick={() => handleSearch(undefined, "Academic research topics")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Research</button>
                <button onClick={() => handleSearch(undefined, "Spark AI breakthroughs")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Spark News</button>
                <button onClick={() => handleSearch(undefined, "Global events today")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Global</button>
              </div>
              <div className="flex justify-center gap-10 sm:gap-48 text-[11px] uppercase tracking-[2em] text-white/5 pointer-events-none select-none font-black opacity-30">
                <span>Spark AI</span>
                <span>Neural Logic</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
};

export default App;
