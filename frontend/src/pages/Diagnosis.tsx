import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Upload, Loader2, ScanLine, Info, CheckCircle2, Camera, Smartphone, RefreshCw } from "lucide-react";
import api from '../services/api';

export default function Diagnosis() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [bodyPart, setBodyPart] = useState('skin');
  const [mode, setMode] = useState<'upload' | 'camera' | 'ip_webcam'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [ipUrl, setIpUrl] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [processingImage, setProcessingImage] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  const setPreviewFromBlob = useCallback((blob: Blob) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(blob);
    previewUrlRef.current = nextUrl;
    setCapturedImage(nextUrl);
  }, []);

  const normalizeImageFile = useCallback(async (inputFile: File): Promise<File> => {
    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (supportedTypes.has(inputFile.type)) {
      return inputFile;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(inputFile);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('This image format is not supported. Please use JPG, PNG, or WEBP.'));
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to process image. Please try another file.');
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }
        reject(new Error('Unable to convert image for diagnosis.'));
      }, 'image/jpeg', 0.92);
    });

    const baseName = inputFile.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName || 'diagnosis-image'}.jpg`, { type: 'image/jpeg' });
  }, []);

  const handleSelectedFile = useCallback(async (inputFile: File | null) => {
    if (!inputFile) return;

    setProcessingImage(true);
    try {
      const normalized = await normalizeImageFile(inputFile);
      setFile(normalized);
      setResult(null);
      toast({ title: 'Image Ready', description: 'Image uploaded successfully and is ready for diagnosis.' });
    } catch (err: any) {
      setFile(null);
      toast({
        variant: 'destructive',
        title: 'Unsupported Image',
        description: err?.message || 'Please upload a JPG, PNG, or WEBP image.',
      });
    } finally {
      setProcessingImage(false);
    }
  }, [normalizeImageFile, toast]);

  useEffect(() => {
    console.log('Diagnosis component mounted');
    fetchMetrics();
    return () => {
      console.log('Diagnosis component unmounting');
      stopCamera();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/predictions/metrics');
      setMetrics(response.data);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  };

  useEffect(() => {
    if (mode === 'camera' && cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, cameraActive]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = () => {
    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        if (!video.videoWidth || !video.videoHeight) {
          toast({
            variant: 'destructive',
            title: 'Camera Not Ready',
            description: 'Please wait a moment and try capturing again.',
          });
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setPreviewFromBlob(blob);
            void handleSelectedFile(capturedFile);
            setResult(null);
            setCameraActive(false);
          }
        }, 'image/jpeg', 0.92);
      }
    } catch (err) {
      console.error("Capture error:", err);
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: "An error occurred while taking the picture.",
      });
    }
  };

  const handleIpWebcamCapture = async () => {
    if (!ipUrl) {
      toast({ variant: "destructive", title: "Missing URL", description: "Please enter your IP Webcam URL (e.g., http://192.168.1.5:8080/shot.jpg)" });
      return;
    }
    
    setLoading(true);
    try {
      // We'll try to fetch the image from the IP URL. 
      // Note: This might hit CORS issues if the IP Webcam doesn't have CORS enabled.
      // A workaround is to proxy through backend, but let's try direct first.
      const response = await fetch(ipUrl);
      if (!response.ok) {
        throw new Error(`IP webcam returned HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('image/')) {
        throw new Error('The provided URL did not return an image');
      }
      const blob = await response.blob();
      const capturedFile = new File([blob], "ip_capture.jpg", { type: "image/jpeg" });
      setPreviewFromBlob(blob);
      await handleSelectedFile(capturedFile);
      setResult(null);
      toast({ title: "Image Captured", description: "Successfully retrieved image from IP Webcam." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "IP Webcam Error",
        description: "Could not fetch image from the provided URL. Ensure it's reachable and CORS is allowed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingImage) {
      toast({
        title: 'Preparing image',
        description: 'Please wait for image processing to finish, then submit again.',
      });
      return;
    }
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('body_part', bodyPart);

    try {
      const response = await api.post('/predictions/predict', formData, {
        params: { body_part: bodyPart },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const diagnosisResult = response.data;
      console.log('Diagnosis result received:', diagnosisResult);
      if (!diagnosisResult || (typeof diagnosisResult === 'object' && !diagnosisResult.predicted_name)) {
        throw new Error('Invalid diagnosis response from server.');
      }
      setResult(diagnosisResult);
      toast({
        title: "Analysis Complete",
        description: "AI diagnosis result is ready.",
      });
    } catch (err: any) {
      const serverMessage = err?.response?.data?.detail;
      toast({
        variant: "destructive",
        title: "Prediction Failed",
        description: typeof serverMessage === 'string' ? serverMessage : "Error processing the image. Please try another clear image.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">AI Diagnosis</h1>
          <p className="text-sm text-muted-foreground">Real-time health analysis powered by advanced AI</p>
        </div>
        <div className="flex gap-2 p-1 bg-muted rounded-2xl border border-border/40">
          <Button 
            variant={mode === 'upload' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setMode('upload'); setCameraActive(false); }}
            className="rounded-xl h-9 px-4"
          >
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button 
            variant={mode === 'camera' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setMode('camera'); setCameraActive(true); }}
            className="rounded-xl h-9 px-4"
          >
            <Camera className="w-4 h-4 mr-2" /> Camera
          </Button>
          <Button 
            variant={mode === 'ip_webcam' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setMode('ip_webcam'); setCameraActive(false); }}
            className="rounded-xl h-9 px-4"
          >
            <Smartphone className="w-4 h-4 mr-2" /> IP Webcam
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40 shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/40">
            <CardTitle className="flex items-center gap-2">
              {mode === 'upload' ? <Upload className="text-primary" size={20} /> : 
               mode === 'camera' ? <Camera className="text-primary" size={20} /> : 
               <Smartphone className="text-primary" size={20} />}
              {mode === 'upload' ? 'Upload Scan' : mode === 'camera' ? 'Live Camera' : 'IP Webcam'}
            </CardTitle>
            <CardDescription>Select the body part and provide your image</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handlePredict} className="space-y-6">
              <div className="space-y-3">
                <Label>Select Body Part / Scan Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['skin', 'eye', 'oral', 'bone', 'lungs', 'muac'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBodyPart(p)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                        bodyPart === p 
                        ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                        : 'border-border/50 hover:border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Image Source</Label>
                
                {mode === 'upload' && (
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      file ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files?.[0]) {
                        void handleSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => {
                        void handleSelectedFile(e.target.files?.[0] || null);
                      }}
                      accept="image/*"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <ScanLine className={file ? 'text-primary' : 'text-muted-foreground'} size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{file ? file.name : 'Click or drag image to upload'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, WEBP up to 10MB</p>
                      </div>
                    </label>
                  </div>
                )}

                {mode === 'camera' && (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-border/50">
                    {cameraActive ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                          <Button type="button" onClick={captureFrame} className="rounded-full w-14 h-14 p-0 gradient-primary">
                            <Camera size={24} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                        {capturedImage ? (
                          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={48} className="text-muted-foreground" />
                        )}
                        <Button type="button" variant="secondary" onClick={() => setCameraActive(true)} className="rounded-xl">
                          {capturedImage ? <RefreshCw className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                          {capturedImage ? "Retake Photo" : "Start Camera"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'ip_webcam' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="http://192.168.1.5:8080/shot.jpg" 
                        value={ipUrl} 
                        onChange={(e) => setIpUrl(e.target.value)}
                        className="rounded-xl"
                      />
                      <Button type="button" onClick={handleIpWebcamCapture} disabled={loading} className="rounded-xl">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Tip: Use apps like "IP Webcam" on Android to turn your phone into a medical scanner. Provide the JPG endpoint.</p>
                    
                    {capturedImage && (
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-border/50">
                        <img src={capturedImage} alt="Captured from IP" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <Button type="submit" disabled={loading || processingImage || !file} className="w-full gradient-primary hover:opacity-90 transition-all rounded-xl py-6 shadow-lg shadow-primary/20">
                {loading || processingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run AI Diagnosis"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <div className="space-y-6">
            <Card className="border-border/40 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-muted/20 border-b border-border/40">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary" size={20} />
                  Diagnosis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Predicted Condition</p>
                    <p className="text-xl font-heading font-bold mt-1 text-foreground">{result.predicted_name}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                    result.priority === 'critical' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                    result.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {result.priority.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Confidence Level</span>
                    <span>{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full gradient-primary transition-all duration-1000" 
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <Info className="text-primary mt-1" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-primary">AI Recommendation</p>
                      <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                        {result.ai_advice || "The AI model has detected potential indicators of this condition. Please consult a qualified medical professional for a formal diagnosis and treatment plan."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {metrics && metrics[bodyPart] && (
              <Card className="border-border/40 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="py-4 border-b border-border/40 bg-muted/10">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Brain size={16} className="text-primary" />
                    {bodyPart?.toUpperCase() || ''} Model Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Accuracy</p>
                      <p className="text-lg font-bold text-primary">{((metrics[bodyPart]?.accuracy || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">F1-Score</p>
                      <p className="text-lg font-bold text-foreground">{((metrics[bodyPart]?.f1 || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Precision</p>
                      <p className="text-lg font-bold text-foreground">{((metrics[bodyPart]?.precision || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Training Samples</p>
                      <p className="text-lg font-bold text-foreground">{(metrics[bodyPart]?.samples || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border/40 rounded-3xl bg-muted/10 opacity-60">
            <Brain size={48} className="text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Analysis results will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
