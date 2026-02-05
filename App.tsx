
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Background from './components/Background';
import FloatingElements from './components/FloatingElements';
import ErrorNotification from './components/ErrorNotification';
import { puterService, AttachedFile } from './puterService';
import { ChatMessage, UsageStats } from './types';

// TYPES
type ViewMode = 'synthesis' | 'media' | 'references';

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
    <div 
      className={`layout-transition flex flex-col pointer-events-auto select-none w-full ${
        hasHistory 
          ? 'items-start justify-center' 
          : 'items-center pt-16 sm:pt-28'
      }`}
    >
      <button 
        onClick={onReset}
        disabled={!hasHistory || isLoading}
        className={`flex flex-col relative transition-all duration-1000 group ${
        hasHistory 
          ? 'scale-[0.5] sm:scale-[0.55] origin-left' 
          : 'scale-100 items-center origin-center'
      }`}>
        <SparkParticles />
        <h1 className={`font-cursive tracking-tight text-7xl sm:text-8xl md:text-9xl font-light relative z-10 transition-all duration-1000 ${
          hasHistory || isLoading ? 'spark-glow-active' : 'spark-glow text-white/95'
        } ${hasHistory ? 'group-hover:scale-110 active:scale-95' : ''}`}>
          Spark
        </h1>
        <span className={`text-[11px] font-bold text-cyan-400/40 uppercase tracking-[1.5em] mt-3 transition-all duration-1000 ${hasHistory ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          Vayu AGI Synthesis
        </span>
      </button>
    </div>
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
             Neural Link Active
           </span>
        </div>
      </div>
    </div>
  );
};

const ThinkingIndicator: React.FC<{ engine?: UsageStats['engine']; step?: string }> = ({ engine, step }) => {
  const isCached = engine === 'Local Cache';
  
  return (
    <div className="flex items-center gap-5 mt-6 animate-result">
      <div className="thinking-spark-container">
        <div className={`thinking-spark-ring ${isCached ? 'border-green-400' : 'border-cyan-400'}`}></div>
        <div className={`thinking-spark-core ${isCached ? 'bg-green-400' : 'bg-cyan-400'}`}></div>
      </div>
      <div className="flex flex-col">
        <span className={`text-[12px] font-black uppercase tracking-[0.6em] animate-pulse ${isCached ? 'text-green-400' : 'text-cyan-400'}`}>
          {isCached ? 'Memory Sector' : 'Vayu Neural Uplink'}
        </span>
        <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1.5 font-mono italic">
          {step || 'Processing inquiry...'}
        </span>
      </div>
    </div>
  );
};

const FormattedContent: React.FC<{ content: string }> = React.memo(({ content }) => {
  const parseMarkdown = useCallback((text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="md-inline-code">$1</code>');
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
            <pre key={`code-${i}`} className="md-code-block animate-result">
              <code>{currentCodeBlock.join('\n')}</code>
            </pre>
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

      const style = { animationDelay: `${Math.min(i * 0.015, 0.4)}s` };

      if (trimmedLine.startsWith('# ')) {
        elements.push(<h1 key={i} className="animate-result" style={style} dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmedLine.replace('# ', '')) }} />);
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(<h2 key={i} className="animate-result" style={style} dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmedLine.replace('## ', '')) }} />);
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(<h3 key={i} className="animate-result" style={style} dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmedLine.replace('### ', '')) }} />);
      } 
      else if (trimmedLine.match(/^[-*]\s/)) {
        const text = trimmedLine.replace(/^[-*]\s/, '');
        elements.push(
          <li key={i} className="animate-result" style={style} dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }} />
        );
      } 
      else if (trimmedLine) {
        elements.push(<p key={i} className="animate-result" style={style} dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }} />);
      }
    });

    return elements;
  }, [content, parseMarkdown]);

  return <div className="md-content">{renderLines}</div>;
});

const UsageBadge: React.FC<{ usage?: UsageStats }> = ({ usage }) => {
  if (!usage) return null;
  const labels: Record<string, string> = {
    'Puter AI (GPT-4o-mini)': 'Vayu Node 4.0',
    'Local Cache': 'Memory Sector'
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

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | undefined>();
  const [currentEngine, setCurrentEngine] = useState<UsageStats['engine']>('Puter AI (GPT-4o-mini)');
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
    const finalQuery = (overrideQuery || query).trim();
    if ((!finalQuery && !attachedFile) || isLoading) return;

    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    
    const userMsgIdx = messages.length;
    setMessages(prev => [...prev, { role: 'user', content: finalQuery || "Analyze Payload" }]);
    setIsLoading(true);
    setCurrentStep("Initializing Vayu Node...");
    setCurrentEngine('Puter AI (GPT-4o-mini)');
    setError(null);

    const startTime = Date.now();
    const currentFile = attachedFile;
    setAttachedFile(null);

    try {
      const imageGenPromise = puterService.searchWebImages(finalQuery || "Spark Context");
      const stream = puterService.streamSearch(finalQuery || "Search Request", currentFile || undefined);
      
      let assistantMsgAdded = false;
      let accumulatedText = '';
      let loopEngine: UsageStats['engine'] = 'Puter AI (GPT-4o-mini)';

      for await (const chunk of stream) {
        if (chunk.step) setCurrentStep(chunk.step);
        if (chunk.engine) loopEngine = chunk.engine;
        setCurrentEngine(loopEngine);

        if (!chunk.done && chunk.text) {
          accumulatedText += chunk.text;
          if (!assistantMsgAdded) {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: accumulatedText, 
              usage: { estimatedTokens: 0, engine: loopEngine, isCached: chunk.isCached || false } 
            }]);
            assistantMsgAdded = true;
            setActiveTabs(prev => ({ ...prev, [userMsgIdx + 1]: 'synthesis' }));
          } else {
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = { 
                ...newMsgs[newMsgs.length - 1], 
                content: accumulatedText,
                usage: { estimatedTokens: 0, engine: loopEngine, isCached: chunk.isCached || false, latency: Date.now() - startTime }
              };
              return newMsgs;
            });
          }
        } else if (chunk.done) {
          const [finalImages, related] = await Promise.all([
            imageGenPromise,
            puterService.generateRelatedQueries(finalQuery, accumulatedText)
          ]);
          
          puterService.updateCacheRelated(finalQuery, currentFile, related);

          setMessages(prev => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            if (lastIdx < 0) return prev;
            newMsgs[lastIdx] = { 
              ...newMsgs[lastIdx], 
              sources: chunk.sources,
              images: finalImages,
              relatedQueries: related,
              usage: { ...newMsgs[lastIdx].usage!, latency: Date.now() - startTime }
            };
            return newMsgs;
          });
          setIsLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Critical Failure:", error);
      setError("Vayu core disconnect detected.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
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
    <div className="relative h-screen w-full flex bg-[#010103] overflow-hidden font-sans selection:bg-cyan-500/20">
      <CustomCursor />
      <Background />
      <FloatingElements />
      {error && <ErrorNotification message={error} onClose={() => setError(null)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        <header className={`layout-transition fixed top-0 left-0 right-0 z-[60] flex items-center px-6 sm:px-16 ${
          hasHistory ? 'h-20 header-glass' : 'h-[32vh] sm:h-[38vh] items-end justify-center pb-8'
        } ${isLoading ? 'header-loading-glow' : ''}`}>
          <SparkleTitle hasHistory={hasHistory} isLoading={isLoading} onReset={handleReset} />
          {hasHistory && <div className="header-accent-line" />}
        </header>

        <main 
          ref={scrollRef}
          className={`flex-1 w-full max-w-[920px] mx-auto px-4 sm:px-12 overflow-y-auto pt-28 sm:pt-36 pb-64 transition-all duration-1000 custom-scroll ${hasHistory ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          <div className="flex flex-col gap-12 sm:gap-18">
            {messages.map((msg, idx) => (
              <div key={idx} className="group/msg animate-result flex flex-col w-full relative">
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
                        {['synthesis', 'media', 'references'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTabs(prev => ({ ...prev, [idx]: tab as ViewMode }))}
                            className={`px-4 sm:px-7 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                              (activeTabs[idx] || 'synthesis') === tab 
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/15' 
                              : 'text-white/30 hover:text-white/70'
                            }`}
                          >
                            {tab === 'references' ? 'Sources' : tab}
                          </button>
                        ))}
                      </div>
                      <UsageBadge usage={msg.usage} />
                    </div>

                    <div className="p-7 sm:p-12 min-h-[200px]">
                      {(activeTabs[idx] || 'synthesis') === 'synthesis' && (
                        <div className="animate-fade-scale">
                          <FormattedContent content={msg.content} />
                          {idx === messages.length - 1 && isLoading && msg.content && (
                            <div className="flex items-center gap-4 mt-6 opacity-40">
                              <div className="thinking-spark-container scale-[0.6]">
                                <div className="thinking-spark-ring border-cyan-400"></div>
                                <div className="thinking-spark-core bg-cyan-400"></div>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/50">
                                Neural Stream Active...
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {(activeTabs[idx] || 'synthesis') === 'media' && (
                        <div className="animate-fade-scale grid grid-cols-1 sm:grid-cols-2 gap-8">
                          {msg.images?.map((img, i) => (
                            <div key={i} className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 aspect-video bg-black/90 shadow-xl group/img">
                              <img src={img} alt="Visual Artifact" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 group-hover/img:scale-105 transition-all duration-700" />
                            </div>
                          )) || <div className="h-40 border border-dashed border-white/10 rounded-2xl flex items-center justify-center opacity-30 text-[9px] uppercase tracking-[0.5em] font-black">No artifacts found</div>}
                        </div>
                      )}

                      {(activeTabs[idx] || 'synthesis') === 'references' && (
                        <div className="animate-fade-scale grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="col-span-2 text-center opacity-20 py-16 uppercase tracking-[0.5em] text-[10px] font-black">Vayu sources integrated in markdown</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!isLoading && messages.length > 0 && (
              <section className="animate-result flex flex-col gap-8 pt-6 pb-24">
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
                  {(messages[messages.length-1].relatedQueries || ["Explore Vayu AGI", "AI search tools", "Neural logic systems"]).map((text, i) => (
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
              </section>
            )}
          </div>
        </main>

        <div className={`fixed left-0 right-0 px-4 flex flex-col items-center z-[70] transition-all duration-1000 ${hasHistory ? 'bottom-6 sm:bottom-10' : 'top-[50vh] -translate-y-1/2'}`}>
          <div className="w-full max-w-2xl flex flex-col items-center relative">
            
            {/* Scroll to Top Arrow Button */}
            {hasHistory && (
              <button
                onClick={scrollToTop}
                className={`mb-6 p-3.5 rounded-full bg-white/[0.02] border border-cyan-400/20 text-cyan-400 backdrop-blur-xl shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-500 hover:scale-110 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-90 group relative ${showScrollTop ? 'opacity-100 translate-y-0 scale-100 animate-[spark-jump_2s_infinite]' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'}`}
              >
                <div className="absolute inset-0 rounded-full border border-cyan-400/10 animate-[rotating-spark_4s_linear_infinite]" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-y-1 transition-transform">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            )}

            <form onSubmit={handleSearch} className="w-full relative group/form">
              <div className={`flex items-center relative rounded-[2rem] sm:rounded-[2.5rem] transition-all duration-700 search-glass search-focus-glow ring-1 ring-white/10 ${isLoading ? 'border-cyan-500/60 shadow-[0_0_40px_rgba(34,211,238,0.2)]' : ''}`}>
                
                <div className="flex-shrink-0 pl-4 sm:pl-7 pr-1">
                  <div className="w-10 h-10 flex items-center justify-center relative">
                    <div className={`absolute inset-0 rounded-full border border-cyan-400/20 ${isLoading ? 'animate-spin' : ''}`} />
                    <div className={`w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)] ${!isLoading ? 'animate-pulse' : 'animate-ping'}`} />
                  </div>
                </div>

                <div className="flex-grow relative flex items-center">
                  {ghostText && (
                    <div className="absolute left-2.5 pointer-events-none text-white/20 text-sm sm:text-lg font-light tracking-tight whitespace-pre select-none">
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
                    placeholder={isListening ? "Listening..." : "Search with Vayu AGI..."}
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
            </form>
          </div>
        </div>

        {!hasHistory && (
          <div className="fixed bottom-10 left-0 right-0 flex flex-col items-center gap-8 animate-result delay-500">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 px-6">
              <button onClick={() => handleSearch(undefined, "Markets update")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Markets</button>
              <button onClick={() => handleSearch(undefined, "Academic research topics")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Research</button>
              <button onClick={() => handleSearch(undefined, "AI breakthroughs")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">AI News</button>
              <button onClick={() => handleSearch(undefined, "Global events today")} className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-cyan-400 transition-all border border-white/10 px-7 py-2.5 rounded-full search-glass font-bold">Global</button>
            </div>
            <div className="flex justify-center gap-10 sm:gap-48 text-[11px] uppercase tracking-[2em] text-white/5 pointer-events-none select-none font-black opacity-30">
              <span>Spark Vayu</span>
              <span>Neural Logic</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
