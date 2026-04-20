import { motion } from "framer-motion";
import { Brain, ScanLine, MessageCircle, Pill, Accessibility, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { icon: Brain, label: "AI Diagnosis", path: "/diagnosis", color: "bg-primary/10 text-primary hover:bg-primary/20" },
  { icon: ScanLine, label: "Body Scan", path: "/diagnosis", color: "bg-info/10 text-info hover:bg-info/20" },
  { icon: MessageCircle, label: "AI Hub", path: "/coach", color: "bg-success/10 text-success hover:bg-success/20" },
  { icon: Accessibility, label: "SahayakAI", path: "/sahayak", color: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20" },
  { icon: Zap, label: "ManasMitra", path: "/manasmitra", color: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" },
  { icon: Pill, label: "Medications", path: "/activity", color: "bg-primary/10 text-primary hover:bg-primary/20" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border transition-all hover:scale-105 hover:shadow-md ${action.color}`}
        >
          <action.icon className="h-5 w-5" />
          <span className="text-xs font-medium">{action.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
