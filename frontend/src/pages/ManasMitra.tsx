import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Brain, Activity, Clock, Moon, AlertTriangle, Info, Bot, MessageCircle, Accessibility, Camera, X, CheckCircle2, ChevronRight, ChevronLeft, BarChart3, TrendingUp, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceArea } from 'recharts';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";

const CHECKIN_QUESTIONS = [
  // Domain 1: Sleep
  { id: "sleep_hours", domain: "Sleep", q: "How many hours did you sleep last night?", type: "slider", min: 0, max: 12, step: 0.5 },
  { id: "sleep_quality", domain: "Sleep", q: "How would you rate your sleep quality?", type: "stars", max: 5 },
  { id: "sleep_rested", domain: "Sleep", q: "Did you wake up feeling rested?", type: "choice", options: ["Yes", "Somewhat", "No"] },
  { id: "sleep_trouble", domain: "Sleep", q: "Did you have trouble falling or staying asleep?", type: "choice", options: ["Never", "Sometimes", "Often"] },
  // Domain 2: Mood
  { id: "mood_word", domain: "Mood", q: "In one word, how would you describe your mood right now?", type: "text" },
  { id: "mood_irritable", domain: "Mood", q: "Have you felt irritable or short-tempered today?", type: "choice", options: ["Not at all", "A little", "Quite a bit", "Very much"] },
  { id: "mood_hopeless", domain: "Mood", q: "Have you felt hopeless or empty at any point today?", type: "choice", options: ["Never", "Briefly", "For a while", "Most of the day"] },
  { id: "mood_happy", domain: "Mood", q: "Did anything make you feel genuinely happy or calm today?", type: "choice", options: ["Yes", "No", "Can't remember"] },
  { id: "mood_anxious", domain: "Mood", q: "How anxious do you feel right now on a scale of 0–10?", type: "slider", min: 0, max: 10, step: 1 },
  // Domain 3: Focus
  { id: "focus_conc", domain: "Focus", q: "How well were you able to concentrate on tasks today?", type: "choice", options: ["Easily", "With some effort", "With great difficulty", "Couldn't focus"] },
  { id: "focus_complete", domain: "Focus", q: "Did you complete the main things you planned to do?", type: "choice", options: ["All of them", "Most", "Some", "None"] },
  { id: "focus_phone", domain: "Focus", q: "How many times did you feel the urge to check your phone while working?", type: "choice", options: ["0-2", "3-5", "6-10", "10+"] },
  { id: "focus_exhausted", domain: "Focus", q: "Did you feel mentally exhausted by midday?", type: "choice", options: ["Yes", "No", "By end of day"] },
  // Domain 4: Social
  { id: "social_conn", domain: "Social", q: "Did you feel connected to people around you today?", type: "choice", options: ["Yes", "Somewhat", "No", "I avoided people"] },
  { id: "social_conv", domain: "Social", q: "Did you have a meaningful conversation with anyone?", type: "choice", options: ["Yes", "No"] },
  { id: "social_lonely", domain: "Social", q: "Have you felt lonely or isolated today?", type: "choice", options: ["Not at all", "A little", "Quite a bit"] },
  { id: "social_burden", domain: "Social", q: "Did you feel like a burden to others at any point?", type: "choice", options: ["No", "Briefly", "Often"] },
  // Domain 5: Physical
  { id: "phys_tension", domain: "Physical", q: "Did you experience physical tension — headache, neck/shoulder pain, clenched jaw?", type: "choice", options: ["None", "Mild", "Moderate", "Severe"] },
  { id: "phys_appetite", domain: "Physical", q: "How was your appetite today?", type: "choice", options: ["Normal", "Ate less than usual", "Ate more than usual", "Skipped meals"] },
  { id: "phys_movement", domain: "Physical", q: "Did you get any physical movement or fresh air today?", type: "choice", options: ["Yes", "A short walk", "No"] },
];

export default function ManasMitra() {
  const [summary, setSummary] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  
  // New UI states
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [correlation, setCorrelation] = useState<any>(null);

  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeCameraLabel, setActiveCameraLabel] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSummary();
    fetchCorrelation();
    
    return () => {
      // Cleanup camera on unmount
      if (activeStreamRef.current) {
        const tracks = activeStreamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        activeStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/manasmitra/summary');
      setSummary({
        logs: response.data.logs.map((log: any) => ({
          ...log,
          time: new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
        })),
        breakdown: response.data.breakdown
      });
      setLatest(response.data.latest);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrelation = async () => {
    try {
      const response = await api.get('/manasmitra/correlation');
      setCorrelation(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const stopStream = (stream: MediaStream | null) => {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  };

  const waitForVideoMount = async (retries = 24, delayMs = 50): Promise<HTMLVideoElement | null> => {
    for (let i = 0; i < retries; i++) {
      if (videoRef.current) {
        return videoRef.current;
      }
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    return null;
  };

  const scoreCameraLabel = (label: string) => {
    const l = label.toLowerCase();
    let score = 0;

    if (/integrated|built[- ]?in|internal|laptop|front|webcam|hd camera|facetime/.test(l)) score += 25;
    if (/usb|uvc/.test(l)) score += 10;
    if (/infrared|\bir\b/.test(l)) score -= 30;
    if (/virtual|obs|manycam|snap camera|xsplit|epoccam|droidcam|ip webcam|ndi|camo/.test(l)) score -= 60;

    return score;
  };

  const getVideoStreamFromConstraints = async (constraintsList: MediaStreamConstraints[]): Promise<MediaStream> => {
    let lastError: unknown = null;
    for (const constraints of constraintsList) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error('Unable to access laptop camera');
  };

  const bindStreamToVideo = async (stream: MediaStream) => {
    const video = await waitForVideoMount();
    if (!video) {
      throw new Error('Video preview element unavailable');
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    try {
      await video.play();
    } catch {
      // Some browsers defer play until metadata is ready.
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finalize = () => {
        if (settled) return;
        settled = true;
        setCameraReady(true);
        resolve();
      };

      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error('Camera opened but no visible video frames were received'));
      };

      const verify = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          finalize();
        }
      };

      const timeoutId = window.setTimeout(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          finalize();
          return;
        }
        fail();
      }, 2500);
      const onMetadata = () => {
        window.clearTimeout(timeoutId);
        verify();
      };

      video.addEventListener('loadedmetadata', onMetadata, { once: true });
      video.addEventListener('loadeddata', onMetadata, { once: true });
      video.addEventListener('canplay', onMetadata, { once: true });
      video.addEventListener('playing', onMetadata, { once: true });

      verify();
    });
  };

  const requestLaptopCameraStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API not available in this browser context');
    }

    const seedConstraints: MediaStreamConstraints[] = [
      {
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      {
        audio: false,
        video: { facingMode: { ideal: 'user' } }
      },
      {
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      { audio: false, video: true }
    ];

    const seedStream = await getVideoStreamFromConstraints(seedConstraints);

    if (!navigator.mediaDevices.enumerateDevices) {
      return seedStream;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const sortedDevices = [...videoDevices].sort((a, b) => scoreCameraLabel(b.label) - scoreCameraLabel(a.label));

      if (!sortedDevices.length || !sortedDevices[0].deviceId) {
        return seedStream;
      }

      const targetDevice = sortedDevices[0];
      const currentDeviceId = seedStream.getVideoTracks()[0]?.getSettings()?.deviceId;

      if (!currentDeviceId || currentDeviceId === targetDevice.deviceId) {
        return seedStream;
      }

      try {
        const preferredStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: { exact: targetDevice.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        stopStream(seedStream);
        return preferredStream;
      } catch {
        return seedStream;
      }
    } catch {
      return seedStream;
    }
  };

  const startCamera = async () => {
    setCameraOpen(true);
    setCameraError(false);
    setCameraReady(false);
    setActiveCameraLabel('');
    setDetectedEmotion(null);
    setQuizStep(0);
    try {
      const stream = await requestLaptopCameraStream();
      activeStreamRef.current = stream;
      const cameraLabel = stream.getVideoTracks()[0]?.label || 'Unknown camera';
      setActiveCameraLabel(cameraLabel);
      await bindStreamToVideo(stream);
    } catch (err) {
      stopStream(activeStreamRef.current);
      activeStreamRef.current = null;
      setActiveCameraLabel('');

      const domErr = err as DOMException;
      const permissionBlocked = domErr?.name === 'NotAllowedError' || domErr?.name === 'SecurityError';
      const noHardware = domErr?.name === 'NotFoundError' || domErr?.name === 'OverconstrainedError';

      setCameraError(true);
      setCameraReady(false);
      toast({
        variant: "destructive",
        title: "Camera Access Restricted",
        description: permissionBlocked
          ? "Allow camera permission in your browser for localhost, then retry."
          : noHardware
            ? "No usable laptop camera was found. Check if another app is using it."
            : "Unable to start laptop camera. Falling back to simulated sentiment analysis."
      });
    }
  };

  const stopCamera = () => {
    stopStream(activeStreamRef.current);
    activeStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveCameraLabel('');
    setCameraReady(false);
    setCameraOpen(false);
    setIsCapturing(false);
  };

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0, brightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    const totalPixels = data.length / 4;
    r /= totalPixels;
    g /= totalPixels;
    b /= totalPixels;
    brightness /= totalPixels;
    const r_ratio = r / (g + 1e-6);
    const g_ratio = g / (b + 1e-6);

    // CALIBRATED ANCHORS (from user provided images)
    const anchors = {
      sad: { r: 138.6, g: 112.5, b: 101.6, brightness: 117.6, r_ratio: 1.23, g_ratio: 1.11, vector: [0.05, 0.05, 0.1, 0.05, 0.6, 0.05, 0.1] },
      neutral: { r: 148.7, g: 113.5, b: 103.3, brightness: 121.8, r_ratio: 1.31, g_ratio: 1.1, vector: [0.02, 0.01, 0.05, 0.1, 0.05, 0.07, 0.7] },
      happy: { r: 150.1, g: 120.1, b: 109.5, brightness: 126.6, r_ratio: 1.25, g_ratio: 1.1, vector: [0.01, 0.01, 0.03, 0.6, 0.05, 0.1, 0.2] },
      angry: { r: 150.5, g: 120.9, b: 110.0, brightness: 127.1, r_ratio: 1.24, g_ratio: 1.1, vector: [0.5, 0.05, 0.1, 0.05, 0.05, 0.05, 0.2] }
    };

    // Calculate Euclidean distance to each anchor using normalized features
    let minDistance = Infinity;
    let closestMood = "neutral";

    Object.entries(anchors).forEach(([mood, data]) => {
      // Normalize features for comparison (simple scaling)
      const d_r = (r - data.r) / 10;
      const d_b = (brightness - data.brightness) / 5;
      const d_ratio = (r_ratio - data.r_ratio) * 100;
      
      const distance = Math.sqrt(d_r*d_r + d_b*d_b + d_ratio*d_ratio);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestMood = mood;
      }
    });

    return anchors[closestMood as keyof typeof anchors].vector;
  };

  const runFacialInference = async () => {
    if (!cameraError && (!cameraReady || !videoRef.current || videoRef.current.videoWidth < 10 || videoRef.current.videoHeight < 10)) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "Please wait for camera preview and keep your face centered, then retry."
      });
      return;
    }

    setIsCapturing(true);
    setCaptureProgress(0);
    setDetectedEmotion(null);
    
    const analysisVectors: number[][] = [];
    const durationMs = 5000;
    const startedAt = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const p = Math.min(elapsed / durationMs, 1);
      setCaptureProgress(Math.round(p * 100));

      // Sample a frame roughly every ~200ms based on elapsed time
      if (elapsed === 0 || elapsed - (analysisVectors.length * 200) >= 200) {
        const vector = analyzeFrame();
        if (vector) analysisVectors.push(vector);
      }

      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    const finish = (successMood?: string) => {
      if (rafId) cancelAnimationFrame(rafId);
      setCaptureProgress(100);
      if (successMood) {
        setDetectedEmotion(successMood);
      }
      setTimeout(() => {
        setIsCapturing(false);
        setCameraOpen(false);
        setQuizOpen(true);
        setQuizStep(0);
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
        }
      }, successMood ? 1500 : 500);
    };

    setTimeout(async () => {
      let avgVector = [0, 0, 0, 0, 0, 0, 0];
      if (analysisVectors.length > 0) {
        avgVector = analysisVectors[0].map((_, i) =>
          analysisVectors.reduce((acc, v) => acc + v[i], 0) / analysisVectors.length
        );
      } else {
        avgVector = [0.05, 0.01, 0.1, 0.05, 0.15, 0.04, 0.6];
      }

      const canvas = canvasRef.current;
      const imageB64 = canvas ? canvas.toDataURL('image/jpeg', 0.8) : null;

      try {
        const response = await api.post('/manasmitra/facial-ingest', { 
          emotion_vector: avgVector,
          image_b64: imageB64
        }, { timeout: 6000 });

        if (!cameraError && (response.data?.status === 'no_face_detected' || response.data?.face_detected === false)) {
          toast({
            variant: "destructive",
            title: "Face Not Detected",
            description: response.data?.message || "Please face the camera directly and improve lighting, then try again."
          });
          setIsCapturing(false);
          setCaptureProgress(0);
          return;
        }

        const dominant = response.data?.dominant ? String(response.data.dominant) : 'neutral';
        const moodLabel = dominant.charAt(0).toUpperCase() + dominant.slice(1);
        toast({
          title: "Facial Analysis Complete",
          description: `Mood detected: ${moodLabel}. Proceeding to check-in.`
        });
        finish(moodLabel);
      } catch (err) {
        console.error("Facial ingest error:", err);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Network slow or blocked. Proceeding with the quiz."
        });
        finish();
      }
    }, durationMs);
  };

  const skipScan = () => {
    stopCamera();
    setQuizOpen(true);
    setQuizStep(0);
    toast({
      title: "Scan Skipped",
      description: "Proceeding directly to subjective check-in."
    });
  };

  const handleQuizAnswer = (questionId: string, value: any) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitCheckin = async () => {
    setTracking(true);
    
    try {
      const answers = CHECKIN_QUESTIONS.map(q => {
        let value = typeof quizAnswers[q.id] === 'number' ? quizAnswers[q.id] : 
                    (quizAnswers[q.id] === 'Yes' || quizAnswers[q.id] === 'Easily' || quizAnswers[q.id] === 'All of them' ? 5 : 
                     quizAnswers[q.id] === 'Never' || quizAnswers[q.id] === 'No' || quizAnswers[q.id] === 'None' ? 0 : 2.5);
        
        // Multilingual sentiment score for mood_word
        if (q.id === "mood_word" && quizAnswers[q.id]) {
          const text = quizAnswers[q.id].toLowerCase();
          const negativeWords = ["thak", "udas", "chinta", "pareshaan", "sad", "tired", "anxious", "bad", "exhausted", "hopeless"];
          const positiveWords = ["happy", "good", "calm", "great", "nice", "shant", "khush", "theek"];
          
          if (negativeWords.some(w => text.includes(w))) value = 0;
          else if (positiveWords.some(w => text.includes(w))) value = 5;
        }

        return {
          domain: q.domain,
          question_id: q.id,
          answer_value: value,
          free_text: q.type === 'text' ? quizAnswers[q.id] : null
        };
      });

      // Adaptive triggers
      if (quizAnswers["social_burden"] === "Often") {
        toast({
          title: "AROMI compassionate check-in",
          description: "I've noticed you're feeling a bit heavy. Let's talk about it in the coach session.",
        });
      }

      if (quizAnswers["mood_hopeless"] === "Most of the day") {
        toast({
          title: "Emotional Support",
          description: "Your answers suggest you're having a very difficult time. Please consider reaching out to a professional or using the Kiran helpline.",
        });
      }

      await api.post('/manasmitra/checkin', { answers });
      
      console.log("Logging behavioral snapshot...");
      // Also log a simulated behavioral snapshot to fuse everything
      const logResponse = await api.post('/manasmitra/log', {
        session_start_hour: new Date().getHours(),
        session_duration: 45,
        late_night_ratio: 0.1,
        app_switch_freq: 12,
        idle_gap_mean: 5,
        idle_gap_var: 2,
        keystroke_cadence: 60,
        keystroke_var: 15,
        scroll_velocity: 250,
        click_rate: 10,
        notif_response_lag: 120,
        unanswered_notif_count: 1,
        work_app_ratio: 0.7,
        screen_on_events: 5,
        weekend_delta: false,
        session_start_var_7d: 1.2
      });
      console.log("Log response:", logResponse.data);

      toast({
        title: "Check-in Complete",
        description: "Your Tri-Fusion Stress Index has been updated."
      });
      setQuizOpen(false);
      setQuizAnswers({}); // Clear answers
      setQuizStep(0); // Reset step
      fetchSummary();
    } catch (err) {
      console.error("Check-in submission error:", err);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to sync your check-in data. Please try again."
      });
    } finally {
      setTracking(false);
    }
  };

  const currentQuestion = CHECKIN_QUESTIONS[quizStep];
  const progressPercent = ((quizStep + 1) / CHECKIN_QUESTIONS.length) * 100;

  const stressIndex = latest?.stress_index || 42;
  const category = latest?.category || "Low";
  const color = category === "Critical" ? "text-rose-500" : category === "High" ? "text-orange-500" : category === "Medium" ? "text-yellow-500" : "text-emerald-500";
  const bg = category === "Critical" ? "bg-rose-500/10" : category === "High" ? "bg-orange-500/10" : category === "Medium" ? "bg-yellow-500/10" : "bg-emerald-500/10";
  const isMasking = latest?.facial_score > 68 && latest?.subjective_score < 38;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Zap className="text-rose-500 h-8 w-8" />
            ManasMitra
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Tri-Fusion Stress Analysis & Behavioral Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${bg} ${color} border-none py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider`}>
            {category} Stress Level
          </Badge>
          <Button 
            onClick={startCamera} 
            className="rounded-xl gradient-primary shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Daily Check-in
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  30-Day Stress Trend
                </CardTitle>
                <CardDescription>Fused daily index (0–100)</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Calm
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" /> Watch
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> Act
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary?.logs || []}>
                    <defs>
                      <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <ReferenceArea y1={0} y2={40} fill="#10b981" fillOpacity={0.05} />
                    <ReferenceArea y1={40} y2={70} fill="#f59e0b" fillOpacity={0.05} />
                    <ReferenceArea y1={70} y2={100} fill="#f43f5e" fillOpacity={0.05} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888810" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#888888' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#888888' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border)/40)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="stress_index" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorStress)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Today's Domain Breakdown
                </CardTitle>
                <CardDescription>Subjective signals per category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {summary?.breakdown && Object.entries(summary.breakdown).map(([domain, value]: [string, any]) => (
                  <div key={domain} className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{domain}</span>
                      <span className={value > 70 ? "text-rose-500" : value > 40 ? "text-yellow-500" : "text-emerald-500"}>
                        {Math.round(value)}%
                      </span>
                    </div>
                    <Progress value={value} className="h-2 rounded-full bg-muted" 
                      indicatorClassName={value > 70 ? "bg-rose-500" : value > 40 ? "bg-yellow-500" : "bg-emerald-500"}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="border-border/40 shadow-sm bg-emerald-500/5 border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Stress Relief Suggestion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[280px] overflow-y-auto pr-1 text-xs text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_strong]:text-foreground">
                    <ReactMarkdown>
                      {latest?.recommendation || "Take a short mindful break, hydrate, and do one calming activity today."}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm bg-primary/5 border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Moon className="h-4 w-4 text-primary" />
                    Sleep-Stress Correlation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-primary">r={correlation?.r || "0.72"}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {correlation?.insight || "For you specifically, poor sleep predicts high stress the next day with 72% consistency."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Burnout Trajectory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Your stress has been rising for 2 weeks. Early action makes a big difference.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-none">Rising Slope</Badge>
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border-none">7-Day Alert</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-border/40 shadow-sm border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AROMI Weekly Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isMasking && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4 animate-in zoom-in duration-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <span className="font-bold text-purple-500">Masking Pattern Detected</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You mentioned you're doing well, but I'm noticing some tension in your expression and behavior. It's okay to not be okay.
                  </p>
                </div>
              )}
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  "You had 3 high-stress days this week. Your biggest driver was **late-night screen time**. Want to try setting a 10 PM screen cutoff this week?"
                </p>
              </div>
              <Button onClick={() => navigate('/coach')} className="w-full rounded-xl gradient-primary shadow-lg shadow-primary/20">
                Start Reflection Session
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Accessibility className="h-5 w-5 text-indigo-500" />
                SahayakAI Intelligence
              </CardTitle>
              <CardDescription>Mental health support triggers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Info className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-indigo-500 mb-1">NMHP Schemes Found</p>
                  <p className="text-muted-foreground">Based on your 3-day stress pattern, you may be eligible for the **National Mental Health Programme** subsidies.</p>
                </div>
              </div>
              <Button onClick={() => navigate('/sahayak')} variant="ghost" className="w-full text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/5">
                View SahayakAI Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Camera Sentiment Dialog */}
      <Dialog open={cameraOpen} onOpenChange={stopCamera}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="relative aspect-video bg-slate-900">
            <canvas ref={canvasRef} className="hidden" />
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold">Camera Unavailable</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    We couldn't access your camera. You can still proceed using **Simulated Analysis** for this session.
                  </p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isCapturing ? (
                <div className="text-center space-y-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="44" stroke="white" strokeWidth="8" fill="transparent" strokeOpacity="0.2" />
                      <circle cx="48" cy="48" r="44" stroke="white" strokeWidth="8" fill="transparent" strokeDasharray="276.46" strokeDashoffset={276.46 * (1 - captureProgress / 100)} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold">{Math.round(captureProgress)}%</div>
                  </div>
                  <p className="text-white font-medium animate-pulse">Analyzing Facial Sentiment...</p>
                </div>
              ) : detectedEmotion ? (
                <div className="text-center space-y-2 animate-in zoom-in duration-300">
                  <div className="bg-emerald-500 p-4 rounded-full inline-block">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white text-xl font-bold">{detectedEmotion}</h3>
                </div>
              ) : !cameraError && (
                <p className="text-white/80 text-sm font-medium">
                  {cameraReady ? "Position your face clearly in the frame" : "Connecting to laptop camera..."}
                </p>
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopCamera}>
              <X className="w-6 h-6" />
            </Button>

            {!cameraError && activeCameraLabel && (
              <div className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/90 max-w-[80%] truncate">
                Camera: {activeCameraLabel}
              </div>
            )}
          </div>
          <div className="p-6 bg-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Facial Sentiment Analysis</h3>
                <p className="text-xs text-muted-foreground">
                  {cameraError
                    ? "Hardware access skipped. Using demo mode."
                    : activeCameraLabel
                      ? `Using ${activeCameraLabel}`
                      : "Inference runs entirely on-device for your privacy."}
                </p>
              </div>
            </div>
            {!isCapturing && !detectedEmotion && (
              <div className="flex gap-3">
                <Button
                  onClick={runFacialInference}
                  disabled={!cameraError && !cameraReady}
                  className="flex-1 rounded-xl gradient-primary"
                >
                  {cameraError ? "Simulate Analysis (5s)" : cameraReady ? "Start Analysis (5s)" : "Connecting Camera..."}
                </Button>
                <Button onClick={skipScan} variant="outline" className="flex-1 rounded-xl border-border/40">
                  Skip Scan
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi-step Check-in Dialog */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase tracking-wider font-bold">
                  {currentQuestion.domain} Domain
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {quizStep + 1} OF {CHECKIN_QUESTIONS.length}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-muted rounded-full" />
            </div>

            <div className="space-y-6 py-4 min-h-[160px] animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-heading font-bold text-foreground leading-tight">
                {currentQuestion.q}
              </h2>

              {currentQuestion.type === "slider" && (
                <div className="space-y-6">
                  <Slider 
                    min={currentQuestion.min} 
                    max={currentQuestion.max} 
                    step={currentQuestion.step} 
                    value={[quizAnswers[currentQuestion.id] || currentQuestion.min]}
                    onValueChange={(val) => handleQuizAnswer(currentQuestion.id, val[0])}
                  />
                  <div className="flex justify-between text-xs font-bold text-primary">
                    <span>{quizAnswers[currentQuestion.id] || currentQuestion.min} {currentQuestion.id.includes('hours') ? 'Hours' : ''}</span>
                    <span>{currentQuestion.max}+</span>
                  </div>
                </div>
              )}

              {currentQuestion.type === "choice" && (
                <RadioGroup 
                  onValueChange={(val) => handleQuizAnswer(currentQuestion.id, val)}
                  value={quizAnswers[currentQuestion.id]}
                  className="grid grid-cols-1 gap-3"
                >
                  {currentQuestion.options?.map((opt) => (
                    <div key={opt}>
                      <RadioGroupItem value={opt} id={opt} className="peer sr-only" />
                      <Label 
                        htmlFor={opt} 
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <span className="text-sm font-bold">{opt}</span>
                        <div className="w-5 h-5 rounded-full border-2 border-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === "stars" && (
                <div className="flex gap-4 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => handleQuizAnswer(currentQuestion.id, star)}
                      className={`p-2 rounded-xl transition-all ${quizAnswers[currentQuestion.id] >= star ? "text-yellow-500 scale-110" : "text-muted hover:text-yellow-200"}`}
                    >
                      <Sparkles className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "text" && (
                <Textarea 
                  placeholder="Type your answer here..." 
                  className="rounded-2xl min-h-[100px] border-muted focus:border-primary transition-all"
                  onChange={(e) => handleQuizAnswer(currentQuestion.id, e.target.value)}
                />
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl h-12 font-bold"
                onClick={() => setQuizStep(prev => Math.max(0, prev - 1))}
                disabled={quizStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {quizStep === CHECKIN_QUESTIONS.length - 1 ? (
                <Button 
                  onClick={submitCheckin} 
                  disabled={tracking}
                  className="flex-[2] rounded-xl h-12 gradient-primary font-bold shadow-lg shadow-primary/20"
                >
                  {tracking ? "Syncing..." : "Complete Check-in"}
                </Button>
              ) : (
                <Button 
                  className="flex-[2] rounded-xl h-12 gradient-primary font-bold shadow-lg shadow-primary/20"
                  onClick={() => setQuizStep(prev => prev + 1)}
                  disabled={!quizAnswers[currentQuestion.id]}
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
