from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from services.groq_service import get_workout_plan
from .users import get_current_user
from database import get_db, WorkoutPlan, User, ChatMessage
from schemas import WorkoutPlanCreate, WorkoutPlanResponse, ChatMessageResponse

router = APIRouter()

@router.post("/workout/generate", response_model=WorkoutPlanResponse)
def generate_workout(
    request: WorkoutPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new AI workout plan"""
    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        chat_type="workout_plan",
        role="user",
        content=request.prompt
    )
    db.add(user_message)

    # Enhanced prompt with user profile context
    enhanced_prompt = f"""User Profile:
- Fitness Level: {current_user.fitness_level or 'Not specified'}
- Goal: {current_user.fitness_goal or 'general fitness'}
- Current Weight: {current_user.current_weight or 'Not specified'} kg
- Target Weight: {current_user.target_weight or 'Not specified'} kg
- Preferred Language: {current_user.preferred_language or 'English'}

User Request: {request.prompt}

Please create a detailed 7-day workout plan including:
1. Daily workout structure with warm-up, main exercises, and cool-down
2. Specific exercises with sets, reps, and rest periods
3. Modifications for different fitness levels
4. Safety tips and form guidance
5. Suggest relevant YouTube video keywords for demonstrations
6. Daily fitness tips
7. If the user mentions meal/nutrition context, align workout volume/intensity, recovery days, and session timing with likely energy and protein availability

If the user asks for both meal and workout together, return ONLY the workout section here and include assumptions that the meal plan should support.
Output in clean markdown with clear day-wise structure and at least one table.

IMPORTANT: Respond ONLY in the user's preferred language ({current_user.preferred_language or 'English'}). If the user speaks in another language, respond in that language but keep the persona. Be professional, friendly, and user-friendly."""

    plan_content = get_workout_plan(enhanced_prompt)
    
    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        chat_type="workout_plan",
        role="assistant",
        content=plan_content
    )
    db.add(assistant_message)

    # Save to database
    workout_plan = WorkoutPlan(
        user_id=current_user.id,
        title=f"Workout Plan - {request.prompt[:50]}...",
        prompt=request.prompt,
        plan_content=plan_content,
        is_active=True
    )
    
    # Deactivate other plans
    db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id,
        WorkoutPlan.is_active == True
    ).update({"is_active": False})
    
    db.add(workout_plan)
    db.commit()
    db.refresh(workout_plan)
    
    return workout_plan


@router.get("/workout/history/chat", response_model=List[ChatMessageResponse])
def get_workout_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get workout plan chat history"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "workout_plan"
    ).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    
    return list(reversed(messages))


@router.delete("/workout/history/chat")
def clear_workout_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear workout plan chat history"""
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "workout_plan"
    ).delete()
    db.commit()
    return {"message": "Workout plan chat history cleared"}


@router.get("/workout/history", response_model=List[WorkoutPlanResponse])
def get_workout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's workout plan history"""
    plans = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id
    ).order_by(WorkoutPlan.created_at.desc()).all()
    
    return plans


@router.get("/workout/{plan_id}", response_model=WorkoutPlanResponse)
def get_workout_plan_by_id(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workout plan"""
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    return plan


@router.delete("/workout/{plan_id}")
def delete_workout_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workout plan"""
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Workout plan deleted successfully"}


@router.delete("/workout/history/all")
def clear_workout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all workout plan history for the user"""
    db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All workout plans deleted successfully"}
