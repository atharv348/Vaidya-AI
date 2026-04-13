import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Activity, Loader2, Lock, User, Heart, Shield, Eye, EyeOff, Stethoscope, Brain, MapPin } from "lucide-react";
import api from '../services/api';
import medicalBg from '@/assets/medical-bg.jpg';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post('/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      localStorage.setItem('token', response.data.access_token);
      toast({
        title: "Login successful",
        description: "Welcome back to VaidyaAI!",
      });
      navigate('/');
    } catch (err: any) {
      const isNetworkError = !err.response;
      const errorMessage = isNetworkError
        ? "Unable to reach the server. Check your API URL or Netlify proxy configuration."
        : (err.response?.data?.detail || "Invalid credentials. Please try again.");

      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Stethoscope, title: "Multi-organ Diagnostics", text: "AI-powered analysis for skin, eye, oral, bone & lung conditions" },
    { icon: Shield, title: "Risk Prediction", text: "Early detection for diabetes, hypertension & anemia" },
    { icon: Heart, title: "Wellness Dashboard", text: "Growth tracking, vitals monitoring & activity logging" },
    { icon: Brain, title: "AROMI AI Coach", text: "Personalized health guidance powered by advanced AI" },
    { icon: MapPin, title: "Nearby Hospitals", text: "Find healthcare facilities and specialists near you" },
  ];

  return (
    <div className="min-h-screen relative flex">
      {/* Full-page background image */}
      <img
        src={medicalBg}
        alt="Medical stethoscope on ECG background"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsla(170,60%,5%,0.92)] via-[hsla(170,50%,8%,0.88)] to-[hsla(170,40%,10%,0.75)]" />

      {/* Left Panel – Login Form */}
      <div className="relative z-10 w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl gradient-medical-btn flex items-center justify-center pulse-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-2xl font-bold text-primary-foreground block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                VaidyaAI
              </span>
              <span className="text-xs text-primary-foreground/50">AI Health Platform</span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-primary-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome back
            </h2>
            <p className="text-primary-foreground/60 text-sm">Sign in to your personal Health OS</p>
          </div>

          <Card className="border-0 shadow-2xl" style={{ background: 'hsla(0,0%,100%,0.08)', backdropFilter: 'blur(24px)', border: '1px solid hsla(168,40%,60%,0.15)' }}>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-primary-foreground/80 font-medium text-sm">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      className="pl-10 h-12 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary/50"
                      style={{ background: 'hsla(0,0%,100%,0.06)' }}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-primary-foreground/80 font-medium text-sm">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-accent hover:text-primary-foreground transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-12 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary/50"
                      style={{ background: 'hsla(0,0%,100%,0.06)' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/40 hover:text-primary-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pb-6">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold gradient-medical-btn text-primary-foreground hover:opacity-90 transition-all duration-200 pulse-glow"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                </Button>

                <p className="text-sm text-center text-primary-foreground/50">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-semibold text-accent hover:text-primary-foreground transition-colors">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          <p className="text-xs text-primary-foreground/30 text-center">© 2026 VaidyaAI. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel – Description */}
      <div className="relative z-10 hidden lg:flex lg:w-[55%] items-center justify-center p-12">
        <div className="max-w-lg space-y-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-primary-foreground leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Personal<br />
              <span className="text-gradient-medical">Health Operating System</span>
            </h1>
            <p className="text-lg text-primary-foreground/65 leading-relaxed">
              Track your health, analyze clinical scans, and get personalized guidance with AROMI — your AI-powered health coach built for the future of medicine.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'hsla(0,0%,100%,0.05)', border: '1px solid hsla(168,40%,60%,0.1)' }}
              >
                <div className="w-10 h-10 rounded-xl gradient-medical-btn flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary-foreground">{f.title}</h3>
                  <p className="text-xs text-primary-foreground/55 mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
