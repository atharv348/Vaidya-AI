from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from services.groq_service import get_meal_plan
from .users import get_current_user
from database import get_db, MealPlan, User, ChatMessage
from schemas import MealPlanCreate, MealPlanResponse, ChatMessageResponse

router = APIRouter()

@router.post("/meals/generate", response_model=MealPlanResponse)
def generate_meals(
    request: MealPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new AI meal plan"""
    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        chat_type="meal_plan",
        role="user",
        content=request.prompt
    )
    db.add(user_message)

    # Parse dietary restrictions if exists
    dietary_restrictions = []
    if current_user.dietary_restrictions:
        try:
            dietary_restrictions = json.loads(current_user.dietary_restrictions)
        except:
            pass
    
    # Enhanced prompt with user profile context
    enhanced_prompt = f"""User Profile:
- Goal: {current_user.fitness_goal or 'general health'}
- Current Weight: {current_user.current_weight or 'Not specified'} kg
- Target Weight: {current_user.target_weight or 'Not specified'} kg
- Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- Preferred Language: {current_user.preferred_language or 'English'}

User Request: {request.prompt}

Please create a detailed 7-day meal plan including:
1. Daily meal structure (Breakfast, Lunch, Dinner, Snacks)
2. Specific recipes with ingredients and preparation instructions
3. Macro breakdown for each meal (Calories, Protein, Carbs, Fats)
4. Total daily macros
5. Indian cuisine focus with local ingredients
6. Allergen information and substitution options
7. Meal prep tips
8. If the user mentions workout/exercise context, align pre-workout and post-workout meal timing, carb placement, hydration, and recovery protein targets

If the user asks for both meal and workout together, return ONLY the meal section here and include assumptions that the workout plan should follow.
Output in clean markdown with clear day-wise structure and at least one table.

IMPORTANT: Respond ONLY in the user's preferred language ({current_user.preferred_language or 'English'}). If the user speaks in another language, respond in that language but keep the persona. Be professional, friendly, and user-friendly."""

    plan_content = get_meal_plan(enhanced_prompt)
    
    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        chat_type="meal_plan",
        role="assistant",
        content=plan_content
    )
    db.add(assistant_message)

    # Save to database                                    
    meal_plan = MealPlan(
        user_id=current_user.id,
        title=f"Meal Plan - {request.prompt[:50]}...",
        prompt=request.prompt,
        plan_content=plan_content,
        is_active=True
    )
    
    # Deactivate other plans
    db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.is_active == True
    ).update({"is_active": False})
    
    db.add(meal_plan)
    db.commit()
    db.refresh(meal_plan)
    
    return meal_plan


@router.get("/meals/history/chat", response_model=List[ChatMessageResponse])
def get_meal_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get meal plan chat history"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "meal_plan"
    ).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    
    return list(reversed(messages))


@router.delete("/meals/history/chat")
def clear_meal_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear meal plan chat history"""
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "meal_plan"
    ).delete()
    db.commit()
    return {"message": "Meal plan chat history cleared"}


@router.get("/meals/history", response_model=List[MealPlanResponse])
def get_meal_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's meal plan history"""
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id
    ).order_by(MealPlan.created_at.desc()).all()
    
    return plans


@router.get("/meals/{plan_id}", response_model=MealPlanResponse)
def get_meal_plan_by_id(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific meal plan"""
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    return plan


@router.delete("/meals/{plan_id}")
def delete_meal_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a meal plan"""
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Meal plan deleted successfully"}


@router.delete("/meals/history/all")
def clear_meal_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all meal plan history for the user"""
    db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All meal plans deleted successfully"}
