import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Activity, ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/forgot-password', { email });
      setSent(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.detail || "Could not send reset link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-medical">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-medical-btn flex items-center justify-center pulse-glow">
            <Activity className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Reset Password
          </h1>
          <p className="text-primary-foreground/70 text-center text-sm">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <Card className="glass-card shadow-2xl border-0">
          {sent ? (
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-medical-btn mx-auto flex items-center justify-center pulse-glow">
                <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Check your email
              </h3>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4 gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 h-12 bg-background/60 border-border focus:ring-2 focus:ring-ring"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pb-6">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold gradient-medical-btn text-primary-foreground hover:opacity-90 transition-all duration-200 pulse-glow"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                </Button>

                <Link to="/login" className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
