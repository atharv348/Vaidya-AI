import { useMemo, useState } from "react";
import {
  Dumbbell,
  UtensilsCrossed,
  Lightbulb,
  Copy,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SummaryStat {
  value: string;
  label: string;
}

interface WorkoutExercise {
  name: string;
  note?: string;
  sets?: string;
}

interface WorkoutDay {
  day: string;
  focus?: string;
  isRest?: boolean;
  rest?: string;
  exercises?: WorkoutExercise[];
}

interface WorkoutSectionData {
  days?: WorkoutDay[];
}

interface MealMacros {
  protein?: string;
  carbs?: string;
  fats?: string;
}

interface MealEntry {
  label: string;
  food: string;
  qty?: string;
  calories?: string;
  protein?: string;
}

interface MealSectionData {
  totalCalories?: string;
  macros?: MealMacros;
  meals?: MealEntry[];
}

interface ParsedPlan {
  type?: string;
  summary?: SummaryStat[];
  workout?: WorkoutSectionData;
  meal?: MealSectionData;
  coachNote?: string[];
  answer?: string;
  question?: string;
  tips?: string[];
  followUp?: string;
}

export interface PlanRendererUserProfile {
  age?: number;
  gender?: string;
  current_weight?: number;
  fitness_level?: string;
  fitness_goal?: string;
  dietary_restrictions?: string | string[];
}

interface PlanOutputRendererProps {
  content: string;
  userProfile?: PlanRendererUserProfile | null;
  onRegenerate?: () => void;
}

function parsePlanJSON(content: string): ParsedPlan | null {
  try {
    const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim()) as ParsedPlan;
    }

    const trimmed = content.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed) as ParsedPlan;
    }

    return null;
  } catch {
    return null;
  }
}

function MacroPill({ label, value, color = "green" }: { label: string; value: string; color?: "green" | "amber" | "blue" | "purple" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
    purple: "bg-violet-50 text-violet-800",
  };

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${colors[color]}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

function SummaryBar({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="grid border-b border-emerald-100" style={{ gridTemplateColumns: `repeat(${Math.max(stats.length, 1)}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={`${s.label}-${i}`} className={`py-3 px-4 text-center ${i < stats.length - 1 ? "border-r border-emerald-100" : ""}`}>
          <div className="text-lg font-bold text-emerald-700">{s.value}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function WorkoutSection({ days }: { days: WorkoutDay[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-emerald-50">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-emerald-50/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Dumbbell size={12} className="text-emerald-700" />
        </div>
        <span className="text-sm font-bold text-gray-900 flex-1 text-left">Part 1 — Weekly Workout Plan</span>
        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{days.length} days</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            {days.map((day, i) => (
              <div
                key={`${day.day}-${i}`}
                className={`grid gap-2 items-start px-3 py-2 rounded-lg border text-xs ${
                  day.isRest ? "bg-gray-50 border-gray-200 text-gray-400" : "bg-emerald-50/40 border-emerald-100"
                }`}
                style={{ gridTemplateColumns: "58px 82px 1fr auto" }}
              >
                <span className={`font-bold text-[11px] ${day.isRest ? "text-gray-400" : "text-emerald-700"}`}>{day.day}</span>
                <span className="text-gray-500 text-[11px] pt-px">{day.focus || "-"}</span>
                <div className="flex flex-col gap-0.5">
                  {(day.exercises || []).map((ex, idx) => (
                    <div key={`${ex.name}-${idx}`} className="text-gray-800 leading-snug">
                      <strong>{ex.name}</strong>
                      {ex.note ? <span className="text-gray-400 text-[10px]"> ({ex.note})</span> : null}
                    </div>
                  ))}
                  {day.isRest ? <div className="text-gray-400">Light walk · Stretching · Mobility</div> : null}
                </div>
                <div className="text-right text-[10px] text-gray-500 whitespace-nowrap leading-relaxed">
                  {(day.exercises || []).map((ex, idx) => (
                    <div key={`${day.day}-sets-${idx}`}>{ex.sets || "-"}</div>
                  ))}
                  {!day.isRest && day.rest ? <div className="text-emerald-600 font-medium">{day.rest}</div> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 px-3 py-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 leading-relaxed">
            Warm up 5–10 min before each session. Cool down with static stretches. Keep sleep and hydration consistent for recovery.
          </div>
        </div>
      )}
    </div>
  );
}

function MealSection({ meals, macros, totalCalories }: { meals: MealEntry[]; macros?: MealMacros; totalCalories?: string }) {
  const [expanded, setExpanded] = useState(true);

  const totalProtein = meals.reduce((acc, meal) => {
    const parsed = Number((meal.protein || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? acc + parsed : acc;
  }, 0);

  return (
    <div className="border-b border-emerald-50">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-amber-50/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed size={12} className="text-amber-700" />
        </div>
        <span className="text-sm font-bold text-gray-900 flex-1 text-left">Part 2 — Daily Meal Plan</span>
        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{totalCalories || "-"} kcal</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div
            className="grid gap-2 px-3 py-2 rounded-lg bg-amber-100 text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1.5"
            style={{ gridTemplateColumns: "72px 1fr 52px 60px 52px" }}
          >
            <div>Meal</div>
            <div>Food Item</div>
            <div>Qty</div>
            <div>Cal</div>
            <div>Protein</div>
          </div>

          <div className="flex flex-col gap-1">
            {meals.map((meal, i) => (
              <div
                key={`${meal.label}-${i}`}
                className="grid gap-2 px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs items-center"
                style={{ gridTemplateColumns: "72px 1fr 52px 60px 52px" }}
              >
                <span className="font-semibold text-amber-800 text-[11px]">{meal.label}</span>
                <span className="text-gray-800 leading-snug"><strong>{meal.food}</strong></span>
                <span className="text-gray-500 text-right text-[11px]">{meal.qty || "-"}</span>
                <span className="text-gray-700 text-right font-medium text-[11px]">{meal.calories || "-"}</span>
                <span className="text-emerald-700 text-right font-semibold text-[11px]">{meal.protein || "-"}</span>
              </div>
            ))}

            <div
              className="grid gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs items-center mt-1"
              style={{ gridTemplateColumns: "72px 1fr 52px 60px 52px" }}
            >
              <span className="font-bold text-emerald-800 text-[11px]">Daily Total</span>
              <div />
              <div />
              <span className="text-emerald-800 font-bold text-right text-[11px]">{totalCalories || "-"}</span>
              <span className="text-emerald-800 font-bold text-right text-[11px]">{Math.round(totalProtein)}g</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {macros?.protein ? <MacroPill label="Protein" value={macros.protein} color="green" /> : null}
            {macros?.carbs ? <MacroPill label="Carbs" value={macros.carbs} color="amber" /> : null}
            {macros?.fats ? <MacroPill label="Fats" value={macros.fats} color="amber" /> : null}
            <MacroPill label="Water" value="8 glasses/day" color="blue" />
          </div>
        </div>
      )}
    </div>
  );
}

function CoachNote({ tips }: { tips: string[] }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={12} className="text-violet-700" />
        </div>
        <span className="text-sm font-bold text-gray-900 flex-1">Part 3 — Coach Note</span>
        <span className="text-[10px] font-semibold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">Synergy tips</span>
      </div>
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex flex-col gap-1.5">
        {tips.map((tip, i) => (
          <div key={`tip-${i}`} className="text-xs text-violet-900 leading-relaxed pl-3 relative">
            <span className="absolute left-0 text-violet-400 font-bold">·</span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRating() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1 ml-auto">
      <span className="text-[10px] text-gray-400 mr-1">Rate:</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => setRating(n)}
          className={`text-lg leading-none transition-colors ${n <= (hover || rating) ? "text-amber-400" : "text-gray-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function PlainTextMessage({ content }: { content: string }) {
  return (
    <div className="px-4 py-3 text-sm text-gray-800 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function PlanOutputRenderer({ content, userProfile, onRegenerate }: PlanOutputRendererProps) {
  const plan = useMemo(() => parsePlanJSON(content), [content]);

  const profileSubtitle = userProfile
    ? `${userProfile.age || "-"} yrs · ${userProfile.gender || "-"} · ${
        Array.isArray(userProfile.dietary_restrictions)
          ? userProfile.dietary_restrictions.join(", ")
          : userProfile.dietary_restrictions || "Standard"
      } · ${userProfile.current_weight || "-"}kg · ${userProfile.fitness_level || "-"} · ${userProfile.fitness_goal || "-"}`
    : "Personalized plan";

  const planTypeLabel = plan?.type === "meal"
    ? "Meal Plan"
    : plan?.type === "workout"
      ? "Workout Plan"
      : plan?.type === "answer" || plan?.type === "question"
        ? "Health Answer"
        : "Combined Plan";

  const answerText = plan?.answer || plan?.question || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // no-op
    }
  };

  const handleSave = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-hub-plan-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-emerald-200 bg-white text-sm shadow-sm w-full max-w-[680px]">
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-700">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
          AI
        </div>
        <div>
          <div className="text-white font-semibold text-sm">AI Hub — {planTypeLabel}</div>
          <div className="text-emerald-200 text-[11px]">{profileSubtitle}</div>
        </div>
      </div>

      {plan ? (
        <>
          {plan.summary && plan.summary.length > 0 ? <SummaryBar stats={plan.summary} /> : null}

          {plan.type === "answer" || plan.type === "question" ? (
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-emerald-700" />
                <span className="text-sm font-semibold text-gray-900">AI Answer</span>
              </div>
              {answerText ? <p className="text-sm text-gray-800 leading-relaxed">{answerText}</p> : null}
              {(plan.tips || []).length > 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1.5">
                  {(plan.tips || []).slice(0, 3).map((tip, i) => (
                    <p key={`answer-tip-${i}`} className="text-xs text-emerald-900">• {tip}</p>
                  ))}
                </div>
              ) : null}
              {plan.followUp ? <p className="text-xs text-gray-500 italic">{plan.followUp}</p> : null}
            </div>
          ) : null}

          {plan.workout?.days && plan.workout.days.length > 0 ? <WorkoutSection days={plan.workout.days} /> : null}

          {plan.meal?.meals && plan.meal.meals.length > 0 ? (
            <MealSection meals={plan.meal.meals} macros={plan.meal.macros} totalCalories={plan.meal.totalCalories} />
          ) : null}

          {plan.coachNote && plan.coachNote.length > 0 ? <CoachNote tips={plan.coachNote} /> : null}
        </>
      ) : (
        <PlainTextMessage content={content} />
      )}

      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50/60 border-t border-emerald-100">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <Copy size={11} /> Copy
        </button>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <RefreshCw size={11} /> Regenerate
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <Download size={11} /> Save Plan
        </button>
        <StarRating />
      </div>
    </div>
  );
}

export default PlanOutputRenderer;
