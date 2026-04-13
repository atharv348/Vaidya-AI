import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Bot, FileText, Info, Loader2, Mic, Paperclip, Send, Sparkles, Trash2, User, X } from "lucide-react";
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

type PlanIntent = 'meal' | 'workout' | 'both';

const mealKeywords = [
  'meal', 'diet', 'nutrition', 'food', 'calorie', 'protein', 'carb', 'fat', 'breakfast', 'lunch', 'dinner', 'snack', 'keto', 'vegetarian'
];

const workoutKeywords = [
  'workout', 'exercise', 'fitness', 'training', 'gym', 'cardio', 'strength', 'sets', 'reps', 'yoga', 'mobility', 'run', 'fat loss', 'muscle'
];

const introMessage = "Hello! I can create meal plans, workout plans, or combined plans in one chat. Ask naturally, for example: 'meal plan for weight loss', 'home workout plan', or 'meal plan based on my workout routine'.";

const suggestedPrompts = [
  'Create a 7-day high-protein meal plan for fat loss',
  'Create a 7-day beginner home workout plan (no equipment)',
  'Create both meal and workout plan together for fat loss',
  'Create a meal plan based on a 5-day strength training split',
  'Create a workout plan based on a vegetarian high-protein diet',
];

const helperText = 'VaidyaAI can provide guidance but always consult a professional for medical or training decisions.';

function inferIntent(prompt: string): PlanIntent {
  const lower = prompt.toLowerCase();
  const hasMeal = mealKeywords.some((keyword) => lower.includes(keyword));
  const hasWorkout = workoutKeywords.some((keyword) => lower.includes(keyword));

  if (hasMeal && hasWorkout) return 'both';
  if (hasMeal) return 'meal';
  if (hasWorkout) return 'workout';
  return 'both';
}

function formatCombinedResponse(mealPlan?: string, workoutPlan?: string): string {
  if (mealPlan && workoutPlan) {
    return `## Meal Plan\n\n${mealPlan}\n\n---\n\n## Workout Plan\n\n${workoutPlan}`;
  }

  if (mealPlan) {
    return `## Meal Plan\n\n${mealPlan}\n\n> Workout plan could not be generated this time.`;
  }

  if (workoutPlan) {
    return `## Workout Plan\n\n${workoutPlan}\n\n> Meal plan could not be generated this time.`;
  }

  return 'Sorry, I encountered an error while generating your plan. Please try again.';
}

export default function PlanStudio() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: introMessage }]);
  const [input, setInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchChatHistory = async () => {
    try {
      const [mealHistoryResult, workoutHistoryResult] = await Promise.allSettled([
        api.get('/meals/history/chat'),
        api.get('/workout/history/chat'),
      ]);

      const combinedHistory: ApiMessage[] = [];

      if (mealHistoryResult.status === 'fulfilled' && Array.isArray(mealHistoryResult.value.data)) {
        combinedHistory.push(...mealHistoryResult.value.data);
      }

      if (workoutHistoryResult.status === 'fulfilled' && Array.isArray(workoutHistoryResult.value.data)) {
        combinedHistory.push(...workoutHistoryResult.value.data);
      }

      if (combinedHistory.length > 0) {
        combinedHistory.sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return aTime - bTime;
        });

        setMessages(combinedHistory.map((message) => ({ role: message.role, content: message.content })));
      }
    } catch (error) {
      console.error('Failed to fetch plan chat history:', error);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = async () => {
    if (!confirm('Are you sure you want to clear your plan chat history?')) return;

    const [mealClearResult, workoutClearResult] = await Promise.allSettled([
      api.delete('/meals/history/chat'),
      api.delete('/workout/history/chat'),
    ]);

    const atLeastOneSuccess = mealClearResult.status === 'fulfilled' || workoutClearResult.status === 'fulfilled';

    if (!atLeastOneSuccess) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: 'Could not clear history. Please try again.',
      });
      return;
    }

    setMessages([{ role: 'assistant', content: introMessage }]);
    toast({
      title: 'History Cleared',
      description: 'Your plan chat history has been deleted.',
    });
  };

  const startVoiceToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Your browser does not support voice recognition.',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    toast({
      title: 'Listening...',
      description: 'Speak your plan request now.',
    });

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Voice recognition failed. Please try again.',
      });
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'Please choose a file under 10 MB.',
      });
      e.target.value = '';
      return;
    }

    setSelectedFileName(file.name);
    toast({
      title: 'Attachment Added',
      description: `${file.name} is attached to your next request.`,
    });
  };

  const clearAttachment = () => {
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || loading) return;

    const finalPrompt = selectedFileName
      ? `${promptToSend}\n\nAttached file context: ${selectedFileName}`
      : promptToSend;

    if (!customPrompt) {
      setInput('');
    }

    if (selectedFileName) {
      clearAttachment();
    }

    setMessages((prev) => [...prev, { role: 'user', content: finalPrompt }]);
    setLoading(true);

    const intent = inferIntent(finalPrompt);

    try {
      if (intent === 'meal') {
        const response = await api.post('/meals/generate', { prompt: finalPrompt });
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.plan_content }]);
        toast({ title: 'Meal Plan Generated', description: 'Your meal plan is ready below.' });
        return;
      }

      if (intent === 'workout') {
        const response = await api.post('/workout/generate', { prompt: finalPrompt });
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.plan_content }]);
        toast({ title: 'Workout Plan Generated', description: 'Your workout plan is ready below.' });
        return;
      }

      const [mealResult, workoutResult] = await Promise.allSettled([
        api.post('/meals/generate', { prompt: finalPrompt }),
        api.post('/workout/generate', { prompt: finalPrompt }),
      ]);

      const mealPlan = mealResult.status === 'fulfilled' ? mealResult.value.data?.plan_content : undefined;
      const workoutPlan = workoutResult.status === 'fulfilled' ? workoutResult.value.data?.plan_content : undefined;

      if (!mealPlan && !workoutPlan) {
        throw new Error('Both plan requests failed');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: formatCombinedResponse(mealPlan, workoutPlan) }]);
      toast({ title: 'Combined Plan Generated', description: 'Meal and workout output has been prepared.' });
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while generating your plan. Please try again.' }]);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/50 overflow-hidden">
      <header className="px-6 py-4 bg-card border-b border-border/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold shadow-sm shrink-0">
            AI
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-heading font-bold text-foreground truncate">AI Plan Studio</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium truncate">Single prompt for meal, workout, or both</p>
          </div>
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
      </header>

      <ScrollArea className="flex-1 p-4 md:p-6" viewportRef={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-4 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-primary border border-border/40'}`}>
                  {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-none'
                    : 'bg-card text-foreground rounded-tl-none border border-border/40'
                }`}>
                  <div className={`prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/40 prose-table:border prose-table:border-border/40 prose-th:bg-muted/50 prose-th:p-2 prose-td:p-2 ${
                    message.role === 'user' ? 'prose-strong:text-white prose-p:text-white' : 'prose-strong:text-primary'
                  }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
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
                <div className="p-4 rounded-2xl bg-card text-foreground rounded-tl-none border border-border/40 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground italic">Generating plan response...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-4 animate-in fade-in zoom-in-95 duration-500">
              {suggestedPrompts.map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleSend(goal)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-card hover:bg-primary/5 hover:border-primary/30 border border-border/40 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <Sparkles size={12} className="text-primary group-hover:scale-110 transition-transform" />
                  {goal}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-primary transition-colors h-12 w-12 border border-border/40"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Attach file"
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
            >
              <Mic size={20} />
            </Button>
            <div className="relative flex-1">
              <Input
                placeholder="Ask for meal, workout, or combined plan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="pr-14 py-7 rounded-2xl border-border/40 focus:ring-primary/20 shadow-xl bg-card text-base placeholder:text-muted-foreground/60 transition-all focus:border-primary/40"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Send size={20} />
              </Button>
            </div>
          </form>

          {selectedFileName && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-primary shrink-0" />
                <span className="truncate text-foreground">{selectedFileName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                onClick={clearAttachment}
                title="Remove attachment"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Info size={10} />
            {selectedFileName ? 'Attachment is used as context text in your prompt.' : helperText}
          </p>
        </div>
      </div>
    </div>
  );
}
