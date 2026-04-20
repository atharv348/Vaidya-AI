from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, List
import json
import re

from services.groq_service import generate_ai_content, get_groq_client
from database import get_db, ChatMessage, User, ClinicalPrediction, GrowthRecord, Prediction
from schemas import ChatRequest, ChatMessageResponse
from .users import get_current_user

router = APIRouter(tags=["coach"])


AI_HUB_SYSTEM_PROMPT_TEMPLATE = """
You are AI Hub, the unified health and fitness assistant inside VaidyaAI.

## User Profile
- Name: {user_name}
- Age: {age} | Gender: {gender}
- Weight: {current_weight} kg | Target: {target_weight} kg | Height: {height} cm
- Fitness Level: {fitness_level} | Goal: {fitness_goal}
- Diet: {dietary_restrictions} | Health: {health_conditions}
- Equipment: {equipment} | Language: {preferred_language}

## Output Format — CRITICAL
You MUST respond in valid JSON wrapped in ```json ``` fences.
The frontend renders this as structured cards. Plain markdown output is not acceptable.

### For COMBINED intent (workout + meal)
```json
{
  "type": "combined",
  "summary": [
    {"value": "2500", "label": "kcal / day"},
    {"value": "25%", "label": "Protein"},
    {"value": "6", "label": "Workout days"},
    {"value": "7", "label": "Day plan"}
  ],
  "workout": {
    "days": [
      {
        "day": "Mon",
        "focus": "Upper Body",
        "isRest": false,
        "rest": "60-90s",
        "exercises": [
          {"name": "Push-ups", "note": "Chest", "sets": "3x10"},
          {"name": "Rows", "note": "Back", "sets": "3x12"}
        ]
      }
    ]
  },
  "meal": {
    "totalCalories": "2500",
    "macros": {"protein": "25%", "carbs": "40%", "fats": "35%"},
    "meals": [
      {"label": "Breakfast", "food": "Oats + milk + nuts", "qty": "1 bowl", "calories": "400", "protein": "20"}
    ]
  },
  "coachNote": [
    "One short recovery walk daily",
    "Hydrate consistently",
    "Sleep 7-9 hours"
  ]
}
```

### For MEAL_ONLY intent
```json
{
  "type": "meal",
  "summary": [
    {"value": "2200", "label": "kcal / day"},
    {"value": "30%", "label": "Protein"},
    {"value": "40%", "label": "Carbs"},
    {"value": "30%", "label": "Fats"}
  ],
  "meal": {
    "totalCalories": "2200",
    "macros": {"protein": "30%", "carbs": "40%", "fats": "30%"},
    "meals": []
  },
  "coachNote": ["Prep meals in advance", "Track portions", "Keep hydration high"]
}
```

### For WORKOUT_ONLY intent
```json
{
  "type": "workout",
  "summary": [
    {"value": "5", "label": "Training days"},
    {"value": "45min", "label": "Per session"},
    {"value": "7", "label": "Day plan"},
    {"value": "2", "label": "Rest day"}
  ],
  "workout": {"days": []},
  "coachNote": ["Warm up first", "Use progressive overload", "Recover well"]
}
```

### For QUESTION intent (general query)
```json
{
  "type": "answer",
  "answer": "Plain language answer.",
  "tips": ["tip 1", "tip 2"],
  "followUp": "Would you like me to generate a personalized plan now?"
}
```

## Intent Detection
- MEAL_ONLY: meal plan, nutrition, diet, food, calories, macros
- WORKOUT_ONLY: workout, exercise, training, gym, routine
- COMBINED: full plan, complete plan, both meal and workout, transformation, fat loss
- QUESTION: everything else

## Rules
- ALWAYS return valid JSON in fenced block.
- Respect dietary restrictions and health conditions.
- Use Indian-friendly meal options where possible.
- Respond in preferred language.
- Keep all JSON values as strings.
"""


MEAL_KEYWORDS = [
    "meal", "diet", "nutrition", "food", "calorie", "protein", "carb", "fat", "breakfast", "lunch", "dinner", "snack"
]

WORKOUT_KEYWORDS = [
    "workout", "exercise", "fitness", "training", "gym", "cardio", "strength", "sets", "reps", "yoga", "mobility", "run"
]


def _safe_text(value: Any, fallback: str = "Unknown") -> str:
    if value is None:
        return fallback
    value_str = str(value).strip()
    return value_str if value_str else fallback


def _parse_json_list(raw_value: Any) -> List[str]:
    if raw_value is None:
        return []
    if isinstance(raw_value, list):
        return [str(v) for v in raw_value if str(v).strip()]

    value_str = str(raw_value).strip()
    if not value_str:
        return []

    try:
        parsed = json.loads(value_str)
        if isinstance(parsed, list):
            return [str(v) for v in parsed if str(v).strip()]
    except Exception:
        pass

    if "," in value_str:
        return [part.strip() for part in value_str.split(",") if part.strip()]

    return [value_str]


def _infer_intent(prompt: str) -> str:
    lowered = prompt.lower()
    has_meal = any(keyword in lowered for keyword in MEAL_KEYWORDS)
    has_workout = any(keyword in lowered for keyword in WORKOUT_KEYWORDS)

    if has_meal and has_workout:
        return "COMBINED"
    if has_meal:
        return "MEAL_ONLY"
    if has_workout:
        return "WORKOUT_ONLY"
    return "QUESTION"


def _fenced_json(payload: Dict[str, Any]) -> str:
    return f"```json\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n```"


def _mock_ai_hub_payload(intent: str, user_prompt: str) -> Dict[str, Any]:
    if intent == "QUESTION":
        return {
            "type": "answer",
            "answer": "I can help with fitness, nutrition, and daily coaching. Ask for a meal plan, workout plan, or both.",
            "tips": [
                "Share your goal and activity level",
                "Mention dietary preference",
                "Tell me how many workout days you can do"
            ],
            "followUp": "Would you like a personalized workout, meal, or combined plan?"
        }

    workout_days = [
        {"day": "Mon", "focus": "Upper Body", "isRest": False, "rest": "60-90s", "exercises": [{"name": "Push-ups", "note": "Chest", "sets": "3x10"}, {"name": "Rows", "note": "Back", "sets": "3x12"}]},
        {"day": "Tue", "focus": "Lower Body", "isRest": False, "rest": "60-90s", "exercises": [{"name": "Squats", "note": "Quads", "sets": "3x12"}, {"name": "Glute Bridges", "note": "Glutes", "sets": "3x15"}]},
        {"day": "Wed", "focus": "Recovery", "isRest": True, "exercises": []},
        {"day": "Thu", "focus": "Pull + Core", "isRest": False, "rest": "60s", "exercises": [{"name": "Band Rows", "note": "Back", "sets": "3x15"}, {"name": "Plank", "note": "Core", "sets": "3x40s"}]},
        {"day": "Fri", "focus": "Conditioning", "isRest": False, "rest": "45s", "exercises": [{"name": "Brisk Walk", "note": "Cardio", "sets": "30 min"}]},
        {"day": "Sat", "focus": "Mobility", "isRest": False, "rest": "30s", "exercises": [{"name": "Yoga Flow", "note": "Mobility", "sets": "25 min"}]},
        {"day": "Sun", "focus": "Rest", "isRest": True, "exercises": []}
    ]

    meal_entries = [
        {"label": "Breakfast", "food": "Poha + curd", "qty": "1 bowl", "calories": "380", "protein": "14"},
        {"label": "Snack", "food": "Roasted chana", "qty": "40 g", "calories": "150", "protein": "8"},
        {"label": "Lunch", "food": "Dal + rice + salad", "qty": "1 plate", "calories": "560", "protein": "22"},
        {"label": "Evening", "food": "Fruit + buttermilk", "qty": "1 serving", "calories": "180", "protein": "6"},
        {"label": "Dinner", "food": "Paneer bhurji + chapati", "qty": "2 chapati", "calories": "620", "protein": "32"}
    ]

    if intent == "MEAL_ONLY":
        return {
            "type": "meal",
            "summary": [
                {"value": "2200", "label": "kcal / day"},
                {"value": "30%", "label": "Protein"},
                {"value": "40%", "label": "Carbs"},
                {"value": "30%", "label": "Fats"}
            ],
            "meal": {
                "totalCalories": "2200",
                "macros": {"protein": "30%", "carbs": "40%", "fats": "30%"},
                "meals": meal_entries
            },
            "coachNote": [
                "Keep protein in every meal",
                "Hydrate well through the day",
                "Prep lunch and dinner in advance"
            ]
        }

    if intent == "WORKOUT_ONLY":
        return {
            "type": "workout",
            "summary": [
                {"value": "5", "label": "Training days"},
                {"value": "45min", "label": "Per session"},
                {"value": "7", "label": "Day plan"},
                {"value": "2", "label": "Rest day"}
            ],
            "workout": {"days": workout_days},
            "coachNote": [
                "Prioritize form over speed",
                "Progress reps weekly",
                "Sleep 7-9 hours for recovery"
            ]
        }

    return {
        "type": "combined",
        "summary": [
            {"value": "2200", "label": "kcal / day"},
            {"value": "30%", "label": "Protein"},
            {"value": "5", "label": "Workout days"},
            {"value": "7", "label": "Day plan"}
        ],
        "workout": {"days": workout_days},
        "meal": {
            "totalCalories": "2200",
            "macros": {"protein": "30%", "carbs": "40%", "fats": "30%"},
            "meals": meal_entries
        },
        "coachNote": [
            "Match protein intake with workout days",
            "Track steps and hydration daily",
            "Review progress every 7 days"
        ]
    }


def _normalize_ai_hub_response(raw_response: str, intent: str) -> str:
    fenced_match = re.search(r"```json\s*([\s\S]*?)```", raw_response, re.IGNORECASE)
    candidate = fenced_match.group(1).strip() if fenced_match else raw_response.strip()

    try:
        payload = json.loads(candidate)
        if isinstance(payload, dict):
            normalized_type = str(payload.get("type", "")).strip().lower()
            if not normalized_type:
                normalized_type = {
                    "MEAL_ONLY": "meal",
                    "WORKOUT_ONLY": "workout",
                    "COMBINED": "combined",
                }.get(intent, "answer")

            if normalized_type in ["question", "qa", "text"]:
                normalized_type = "answer"

            if normalized_type not in ["meal", "workout", "combined", "answer"]:
                normalized_type = "answer"

            payload["type"] = normalized_type

            if normalized_type == "answer" and not payload.get("answer"):
                payload["answer"] = str(payload.get("question") or payload.get("message") or "")

            if normalized_type == "answer" and not isinstance(payload.get("tips"), list):
                payload["tips"] = [
                    "Share your profile details for better personalization",
                    "Ask for meal, workout, or combined plan"
                ]

            if normalized_type == "answer" and not payload.get("followUp"):
                payload["followUp"] = "Would you like me to generate a structured plan now?"

            return _fenced_json(payload)
    except Exception:
        pass

    payload = {
        "type": "answer",
        "answer": raw_response.strip(),
        "tips": [
            "Ask for a meal plan, workout plan, or both",
            "Share your goal and schedule for personalization"
        ],
        "followUp": "Would you like me to generate a structured plan now?"
    }
    return _fenced_json(payload)


def _build_ai_hub_system_prompt(profile_tokens: Dict[str, str]) -> str:
    prompt = AI_HUB_SYSTEM_PROMPT_TEMPLATE
    for key, value in profile_tokens.items():
        prompt = prompt.replace(f"{{{key}}}", _safe_text(value, "Unknown"))
    return prompt


@router.post("/coach/chat")
def chat_with_coach(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chat with AROMI AI Coach"""
    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        chat_type="coach",
        role="user",
        content=request.prompt
    )
    db.add(user_message)

    # Get recent chat history for context
    recent_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "coach"
    ).order_by(ChatMessage.timestamp.desc()).limit(10).all()
    
    # Build context from user profile
    health_conditions = []
    if current_user.health_conditions:
        try:
            health_conditions = json.loads(current_user.health_conditions)
        except:
            pass
            
    # Get latest clinical prediction
    latest_clinical = db.query(ClinicalPrediction).filter(
        ClinicalPrediction.user_id == current_user.id
    ).order_by(ClinicalPrediction.created_at.desc()).first()
    
    clinical_context = "No clinical data available."
    if latest_clinical:
        risks = json.loads(latest_clinical.risks_json)
        clinical_context = ", ".join([f"{r['disease']}: {r['risk_percentage']}% ({r['status']})" for r in risks])
        clinical_context += f" (BMI: {latest_clinical.bmi:.1f})"

    # Get latest scan prediction
    latest_scan = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.created_at.desc()).first()
    
    scan_context = "No recent scan data available."
    if latest_scan:
        scan_context = f"Body Part: {latest_scan.body_part}, Diagnosis: {latest_scan.predicted_name}, Confidence: {latest_scan.confidence*100:.1f}%, Priority: {latest_scan.priority}"

    # Get latest growth record
    latest_growth = db.query(GrowthRecord).filter(
        GrowthRecord.user_id == current_user.id
    ).order_by(GrowthRecord.created_at.desc()).first()
    
    growth_context = "No growth record available."
    if latest_growth:
        growth_context = f"Status: {latest_growth.status}, WAZ: {latest_growth.waz:.2f}, HAZ: {latest_growth.haz:.2f}, WHZ: {latest_growth.whz:.2f}"
    
    # Construct Unified Health Report
    unified_report = f"""
    === UNIFIED HEALTH REPORT ===
    1. CLINICAL RISKS: {clinical_context}
    2. DIAGNOSTIC SCAN: {scan_context}
    3. CHILD GROWTH: {growth_context}
    ==============================
    """

    health_conditions = _parse_json_list(current_user.health_conditions)
    dietary_restrictions = _parse_json_list(current_user.dietary_restrictions)

    # Build short conversation memory from latest messages.
    conversation: List[str] = []
    for msg in reversed(recent_messages):
        role = "User" if str(msg.role) == "user" else "AI Hub"
        conversation.append(f"{role}: {msg.content}")
    conversation_context = "\n".join(conversation[-8:]) if conversation else "No prior messages."

    missing_profile_fields: List[str] = []
    if current_user.age is None:
        missing_profile_fields.append("age")
    if not _safe_text(current_user.gender, ""):
        missing_profile_fields.append("gender")
    if current_user.current_weight is None:
        missing_profile_fields.append("weight")
    if current_user.height is None:
        missing_profile_fields.append("height")
    if not _safe_text(current_user.fitness_goal, ""):
        missing_profile_fields.append("goal")
    if not _safe_text(current_user.fitness_level, ""):
        missing_profile_fields.append("activity level")
    if len(dietary_restrictions) == 0:
        missing_profile_fields.append("food preference")

    intent = _infer_intent(request.prompt)

    profile_tokens = {
        "user_name": _safe_text(current_user.full_name, _safe_text(current_user.username, "User")),
        "age": _safe_text(current_user.age),
        "gender": _safe_text(current_user.gender),
        "current_weight": _safe_text(current_user.current_weight),
        "target_weight": _safe_text(current_user.target_weight),
        "height": _safe_text(current_user.height),
        "fitness_level": _safe_text(current_user.fitness_level),
        "fitness_goal": _safe_text(current_user.fitness_goal),
        "dietary_restrictions": ", ".join(dietary_restrictions) if dietary_restrictions else "None",
        "health_conditions": ", ".join(health_conditions) if health_conditions else "None",
        "equipment": "Bodyweight / Basic dumbbells",
        "preferred_language": _safe_text(current_user.preferred_language, "English"),
    }

    ai_hub_system_prompt = _build_ai_hub_system_prompt(profile_tokens)

    coach_input = f"""Intent: {intent}
Current user message:
{request.prompt}

Latest Unified Health Report:
{unified_report}

Recent conversation context:
{conversation_context}

Missing profile fields for full planning:
{', '.join(missing_profile_fields) if missing_profile_fields else 'None'}

Execution notes:
- If intent is MEAL_ONLY, WORKOUT_ONLY, or COMBINED and profile fields are missing, ask max 2-3 concise profile questions first.
- If enough profile is available, generate full structured plan JSON.
- If intent is QUESTION, answer directly using type=answer JSON shape.
- Always keep output parseable JSON in fenced block."""

    if get_groq_client() is None:
        response = _fenced_json(_mock_ai_hub_payload(intent, request.prompt))
    else:
        raw_response = generate_ai_content(coach_input, system_prompt=ai_hub_system_prompt)
        response = _normalize_ai_hub_response(raw_response, intent)
    
    # Save assistant response
    assistant_message = ChatMessage(
        user_id=current_user.id,
        chat_type="coach",
        role="assistant",
        content=response
    )
    db.add(assistant_message)
    
    db.commit()
    
    return {"response": response}


@router.get("/coach/history", response_model=List[ChatMessageResponse])
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get chat history with AROMI"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "coach"
    ).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    
    return list(reversed(messages))


@router.delete("/coach/history")
def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear chat history"""
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "coach"
    ).delete()
    db.commit()
    
    return {"message": "Chat history cleared successfully"}


@router.post("/coach/rate/{message_id}")
def rate_chat_message(
    message_id: int,
    rating: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rate a chat message (1-5 stars)"""
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    message.rating = rating
    db.commit()
    
    return {"message": "Rating updated successfully"}
