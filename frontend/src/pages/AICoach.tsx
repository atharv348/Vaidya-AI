import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, User, Bot, Loader2, Sparkles, HeartPulse, Info, HelpCircle, Mic, Paperclip, Trash2, Square, Copy, RotateCw, Volume2, Globe, Target, Flame, Calendar, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import heroBg from '@/assets/hero-bg.jpg';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  rating?: number;
}

interface UserProfile {
  full_name: string;
  fitness_goal: string;
  streak_count: number;
  last_checkin: string;
}

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm **AROMI**, your personal AI Health Coach. I'm here to help you understand your health data, provide wellness advice, and guide you on your fitness journey. What's on your mind today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<'friendly' | 'professional'>('friendly');
  const [style, setStyle] = useState<'concise' | 'detailed'>('concise');
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatHistory();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setUserProfile(response.data);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  const handleRate = async (messageId: number, rating: number) => {
    try {
      await api.post(`/coach/rate/${messageId}?rating=${rating}`);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, rating } : m));
      toast({
        title: "Rating Saved",
        description: `You rated this session ${rating} stars.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save rating.",
      });
    }
  };

  const quickQuestions = [
    "How can I improve my sleep?",
    "Healthy snacks for weight loss?",
    "Explain my last diagnosis",
    "Benefits of daily walking?",
    "How to reduce stress?"
  ];

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const response = await api.get('/coach/history');
      if (response.data && response.data.length > 0) {
        setMessages(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  };

  const clearChat = async () => {
    if (!confirm("Are you sure you want to clear your chat history?")) return;
    
    try {
      await api.delete('/coach/history');
      setMessages([{ role: 'assistant', content: "Hello! I'm **AROMI**, your personal AI Health Coach. I'm here to help you understand your health data, provide wellness advice, and guide you on your fitness journey. What's on your mind today?" }]);
      toast({
        title: "History Cleared",
        description: "Your chat history has been deleted.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not clear chat history. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startVoiceToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Your browser does not support voice recognition.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    toast({
      title: "Listening...",
      description: "Ask AROMI your health question.",
    });

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Voice recognition failed. Please try again.",
      });
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "File Selected",
        description: `${file.name} ready to be analyzed.`,
      });
      setInput(prev => `${prev} [File: ${file.name}] `);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || loading) return;

    if (!customPrompt) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: promptToSend }]);
    setLoading(true);

    const locale = language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Marathi';
    const toneText = tone === 'friendly' ? 'friendly and supportive' : 'professional and clear';
    const styleText = style === 'concise' ? 'concise answers (3–6 sentences total unless lists are needed)' : 'more detailed, step-by-step answers when useful';
    const preferencePrefix = `Please respond in ${locale} with a ${toneText} tone. Use ${styleText}. When listing steps, keep bullets short. `;
    const effectivePrompt = `${preferencePrefix}\n${promptToSend}`;

    const controller = new AbortController();
    setAborter(controller);
    try {
      const response = await api.post('/coach/chat', { prompt: effectivePrompt }, { signal: controller.signal as any });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err) {
      if ((err as any)?.name === 'CanceledError' || (err as any)?.message?.includes('canceled')) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Request canceled." }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." }]);
      }
    } finally {
      setLoading(false);
      setAborter(null);
    }
  };

  const stopGeneration = () => {
    try {
      aborter?.abort();
    } catch {}
    setLoading(false);
    setAborter(null);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Message copied to clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Clipboard permission denied." });
    }
  };

  const speakText = (text: string) => {
    try {
      const utter = new SpeechSynthesisUtterance(text.replace(/[#*`_>-]/g, ' '));
      utter.lang = language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  const regenerateLast = () => {
    // Find last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        handleSend(messages[i].content);
        break;
      }
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/coach-bg.jpg'), url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative flex-1 flex flex-col h-full overflow-hidden">
      <header className="px-6 py-4 bg-card border-b border-border/40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse size={22} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground">AROMI Health Coach</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Always Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 mr-2">
            <Button variant={tone === 'friendly' ? 'default' : 'ghost'} size="sm" onClick={() => setTone('friendly')}>Friendly</Button>
            <Button variant={tone === 'professional' ? 'default' : 'ghost'} size="sm" onClick={() => setTone('professional')}>Professional</Button>
            <span className="mx-1 text-muted-foreground">•</span>
            <Button variant={style === 'concise' ? 'default' : 'ghost'} size="sm" onClick={() => setStyle('concise')}>Concise</Button>
            <Button variant={style === 'detailed' ? 'default' : 'ghost'} size="sm" onClick={() => setStyle('detailed')}>Detailed</Button>
            <span className="mx-1 text-muted-foreground">•</span>
            <Button variant="ghost" size="icon" title="Language">
              <Globe className="w-4 h-4" />
            </Button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="h-8 rounded-md border border-border/50 bg-transparent text-sm"
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-destructive transition-colors"
            onClick={clearChat}
            title="Clear History"
          >
            <Trash2 size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors">
            <HelpCircle size={20} />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4 md:p-6" viewportRef={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {userProfile && (
            <Card className="mb-6 bg-card/80 backdrop-blur-md border-primary/20 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Target size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Goal</p>
                    <h2 className="text-lg font-bold text-foreground">{userProfile.fitness_goal?.replace('_', ' ') || 'General Wellness'}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame size={20} fill="currentColor" />
                      <span className="text-xl font-bold">{userProfile.streak_count || 0}</span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Day Streak</p>
                  </div>
                  <div className="w-px h-8 bg-border/50 hidden md:block" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-blue-500">
                      <Calendar size={20} />
                      <span className="text-sm font-bold">
                        {userProfile.last_checkin 
                          ? new Date(userProfile.last_checkin).toLocaleDateString() 
                          : 'Today'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Check-in</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-primary border border-border/40'}`}>
                  {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                  m.role === 'user' 
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-none' 
                  : 'bg-card text-foreground rounded-tl-none border border-border/40'
                }`}>
                  <div className={`prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/40 prose-table:border prose-table:border-border/40 prose-th:bg-muted/50 prose-th:p-2 prose-td:p-2 ${
                    m.role === 'user' ? 'prose-strong:text-white prose-p:text-white' : 'prose-strong:text-primary'
                  }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  {m.role === 'assistant' && (
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-t border-border/40 pt-3">
                        <Button size="sm" variant="ghost" onClick={() => copyText(m.content)} className="h-7 px-2 text-xs"><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
                        <Button size="sm" variant="ghost" onClick={() => speakText(m.content)} className="h-7 px-2 text-xs"><Volume2 className="w-3.5 h-3.5 mr-1" />Speak</Button>
                        {i === messages.length - 1 && (
                          <Button size="sm" variant="ghost" onClick={regenerateLast} className="h-7 px-2 text-xs"><RotateCw className="w-3.5 h-3.5 mr-1" />Regenerate</Button>
                        )}
                      </div>
                      
                      {m.id && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Rate Session:</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleRate(m.id!, star)}
                                className={`p-1 transition-colors ${
                                  (m.rating || 0) >= star ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-200'
                                }`}
                              >
                                <Star size={14} fill={(m.rating || 0) >= star ? "currentColor" : "none"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-9 h-9 rounded-xl bg-card text-primary border border-border/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="p-4 rounded-2xl bg-card text-foreground rounded-tl-none border border-border/40 shadow-sm flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground italic">AROMI is thinking...</span>
                  <Button size="sm" variant="ghost" onClick={stopGeneration} className="h-7 px-2"><Square className="w-3.5 h-3.5 mr-1" />Stop</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 md:p-6 bg-gradient-to-t from-background/60 via-background/40 to-transparent">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-4 animate-in fade-in zoom-in-95 duration-500">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-card hover:bg-primary/5 hover:border-primary/30 border border-border/40 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <Sparkles size={12} className="text-primary group-hover:scale-110 transition-transform" />
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="relative group">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-muted-foreground hover:text-primary transition-colors h-12 w-12 border border-border/40"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Attach file"
              >
                <Paperclip size={20} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-muted-foreground hover:text-primary transition-colors h-12 w-12 border border-border/40"
                onClick={startVoiceToText}
                disabled={loading}
                aria-label="Start voice input"
              >
                <Mic size={20} />
              </Button>
              <div className="relative flex-1">
                <Textarea
                  placeholder="Ask AROMI anything about your health…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                  autoFocus
                  rows={3}
                  className="pr-14 py-4 rounded-2xl border-border/40 focus:ring-primary/20 shadow-xl bg-card text-base placeholder:text-muted-foreground/60 transition-all focus:border-primary/40 resize-none"
                />
                <Button 
                  type="submit" 
                  disabled={loading || !input.trim()} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  aria-label="Send message"
                >
                  <Send size={20} />
                </Button>
              </div>
            </form>
            <div className="mt-2 text-[10px] text-muted-foreground/80 text-right pr-1">
              Press Enter to send • Shift+Enter for a new line
            </div>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Info size={10} />
            AROMI provides general wellness guidance. Always seek professional medical advice for specific concerns.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
