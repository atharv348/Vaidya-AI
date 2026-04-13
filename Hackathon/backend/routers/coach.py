from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from services.groq_service import generate_ai_content
from database import get_db, ChatMessage, User, ClinicalPrediction, GrowthRecord, Prediction
from schemas import ChatRequest, ChatMessageResponse
from .users import get_current_user

router = APIRouter(tags=["coach"])


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

    context = f"""You are a professional AI coach. Your role is to help users achieve goals through structured guidance, accountability, and actionable advice. 

User Context:
- Name: {current_user.full_name or current_user.username}
- Fitness Level: {current_user.fitness_level or 'Not specified'}
- Goal: {current_user.fitness_goal or 'general wellness'}
- Health Conditions: {', '.join(health_conditions) if health_conditions else 'None reported'}
- Preferred Language: {current_user.preferred_language or 'English'}

Latest Unified Health Report:
{unified_report}

COACHING STYLE:
- Ask clarifying questions before giving advice. Never assume the user's context.
- Use the Socratic method: ask what the user has already tried.
- Give 1–3 concrete action steps per response. Never overwhelm.
- Celebrate small wins. Acknowledge struggles without toxic positivity.

RESPONSE STRUCTURE:
1. Reflect back what you heard (1 sentence).
2. Ask 1 clarifying question OR provide your insight.
3. Give numbered action steps (max 3).
4. End with an accountability prompt: "What will you do first?"

FORMATTING RULES:
- Numbered lists for action steps. Bullets for options or examples.
- Bold the most important action step.
- Keep responses under 200 words unless a detailed plan is requested.
- Never use headers for short coaching replies — use bold labels inline.

MEMORY:
- Reference past sessions: "Last time you mentioned X — how did that go?"
- Track goals across sessions and remind users of their own stated priorities.

TONE:
- Direct, warm, non-judgmental. Think: brilliant friend who happens to be an expert.
- Never lecture. Guide through questions and reflection.

IMPORTANT: 
- Respond ONLY in the user's preferred language ({current_user.preferred_language or 'English'}).
- If the user speaks in another language, respond in that language but keep the persona.
- Explain the full Unified Health Report in simple terms if it's the start of the conversation or relevant.
- If there are any High or Critical risks in the report, strongly recommend the appropriate specialist (e.g., Endocrinologist, Dermatologist, Pediatrician)."""
    
    # Combine context with user message
    full_prompt = f"{context}\n\nUser: {request.prompt}"
    
    # Get AI response
    response = generate_ai_content(full_prompt)
    
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
