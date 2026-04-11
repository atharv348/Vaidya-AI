import { Activity, Heart, Flame, Moon, Plus, Zap, Accessibility } from "lucide-react";
import { VitalCard } from "@/components/dashboard/VitalCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { HeartRateMonitor } from "@/components/dashboard/HeartRateMonitor";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AchievementPanel } from "@/components/dashboard/AchievementPanel";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDownloadReport = () => {
    toast({
      title: "Generating Report",
      description: "Your health overview report is being prepared for download.",
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Health Overview</h1>
          <p className="text-muted-foreground mt-1 font-medium">Welcome back! Here's your status for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
          <Button 
            className="rounded-xl gradient-primary shadow-lg shadow-primary/20"
            onClick={() => navigate("/activity")}
          >
            <Plus className="w-4 h-4 mr-2" /> Log Activity
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <VitalCard
          icon={Heart}
          title="Heart Rate"
          value="72"
          unit="bpm"
          trend="+2%"
          trendUp={true}
          variant="coral"
        />
        <VitalCard
          icon={Activity}
          title="Blood Pressure"
          value="120/80"
          unit="mmHg"
          trend="Normal"
          trendUp={true}
          variant="primary"
        />
        <VitalCard
          icon={Flame}
          title="Calories Burned"
          value="1,240"
          unit="kcal"
          trend="+15%"
          trendUp={true}
          variant="info"
        />
        <VitalCard
          icon={Moon}
          title="Sleep Quality"
          value="7.5"
          unit="hours"
          trend="+5%"
          trendUp={true}
          variant="success"
        />
        <VitalCard
          icon={Zap}
          title="Stress Index"
          value="42"
          unit="/100"
          trend="-8%"
          trendUp={true}
          variant="coral"
        />
        <VitalCard
          icon={Accessibility}
          title="Entitlements"
          value="3"
          unit="Active"
          trend="2 New"
          trendUp={true}
          variant="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <WeeklyChart />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <HeartRateMonitor />
            <ActivityFeed />
          </div>
        </div>
        <div className="space-y-8">
          <ProgressRing value={72} max={100} label="Weekly Goal" sublabel="Activity completion" />
          <QuickActions />
          <AchievementPanel />
          <MotivationalQuote />
        </div>
      </div>
    </div>
  );
}
