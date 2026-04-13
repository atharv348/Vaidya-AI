import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Award, Zap, Heart, Target } from "lucide-react";

const achievements = [
  { title: "Early Bird", description: "Logged a workout before 6 AM", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", points: 50 },
  { title: "Hydration Hero", description: "Drank 8 glasses of water for 7 days", icon: Heart, color: "text-blue-500", bg: "bg-blue-500/10", points: 100 },
  { title: "Goal Getter", description: "Reached your first weight goal", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10", points: 200 },
  { title: "Consistent", description: "Logged progress for 30 days straight", icon: Award, color: "text-purple-500", bg: "bg-purple-500/10", points: 500 },
];

export default function Achievements() {
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Achievements</h1>
        <p className="text-sm text-muted-foreground">Track your progress and rewards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {achievements.map((a, i) => (
          <Card key={i} className="border-border/40 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardHeader className="pb-2">
              <div className={`w-12 h-12 rounded-xl ${a.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <a.icon className={a.color} size={24} />
              </div>
              <CardTitle className="text-lg">{a.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{a.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">+{a.points} pts</span>
                <Star className="text-amber-400 fill-amber-400" size={14} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/40">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-primary" size={20} />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {[
              { name: "You", rank: 1, points: 2450 },
              { name: "User 2", rank: 2, points: 2100 },
              { name: "User 3", rank: 3, points: 1850 },
              { name: "User 4", rank: 4, points: 1600 },
            ].map((u, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {u.rank}
                  </span>
                  <span className="font-medium">{u.name}</span>
                </div>
                <span className="font-bold">{u.points} pts</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
