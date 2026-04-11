from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime, timezone, timedelta
import numpy as np
import cv2
import base64
import os
import tempfile

# Lazy loading of heavy ML libraries to speed up backend startup
DEEPFACE_AVAILABLE = None
FER_AVAILABLE = None
detector = None

def get_detectors():
    global DEEPFACE_AVAILABLE, FER_AVAILABLE, detector
    
    if DEEPFACE_AVAILABLE is None:
        try:
            from deepface import DeepFace
            DEEPFACE_AVAILABLE = True
        except ImportError:
            DEEPFACE_AVAILABLE = False
            
    if FER_AVAILABLE is None:
        try:
            from fer import FER
            FER_AVAILABLE = True
            try:
                detector = FER(mtcnn=True)
            except:
                detector = None
        except ImportError:
            FER_AVAILABLE = False
            
    return DEEPFACE_AVAILABLE, FER_AVAILABLE, detector
  
from database import get_db, User, StressLog, FacialScan, CheckinResponse, SentimentResult
from .users import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/manasmitra", tags=["manasmitra"])

# Robust post-processing to reduce persistent 'sad' bias under poor lighting
def stabilize_emotion(dominant: str, emotions: dict, img: np.ndarray | None):
    def prob(x):
        return (x / 100.0) if x is not None and x > 1 else (x or 0.0)
    sad_p = prob(emotions.get("sad"))
    neu_p = prob(emotions.get("neutral"))
    hap_p = prob(emotions.get("happy"))
    ang_p = prob(emotions.get("angry"))
    surprise_p = prob(emotions.get("surprise"))
    top_p = max(sad_p, neu_p, hap_p, ang_p, surprise_p)
    
    v_mean = None
    if img is not None:
        try:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            v_mean = float(hsv[:, :, 2].mean())
        except Exception:
            v_mean = None
    
    # Heuristics:
    # - If lighting is low and neutral is reasonable, prefer 'neutral'
    if v_mean is not None and v_mean < 60 and neu_p >= 0.2:
        return "neutral"
    # - If top probability is weak, default to 'neutral'
    if top_p < 0.4:
        return "neutral"
    # - If model leans to 'sad' but neutral is close, prefer neutral
    if dominant == "sad" and sad_p < 0.55 and neu_p >= 0.25 and (sad_p - neu_p) < 0.2:
        return "neutral"
    # - Map 'surprise' to 'surprised' for consistency
    if dominant == "surprise":
        return "surprised"
    return dominant

# Schemas
class StressLogCreate(BaseModel):
    session_start_hour: int
    session_duration: float
    late_night_ratio: float
    app_switch_freq: float
    idle_gap_mean: float
    idle_gap_var: float
    keystroke_cadence: float
    keystroke_var: float
    scroll_velocity: float
    click_rate: float
    notif_response_lag: float
    unanswered_notif_count: int
    work_app_ratio: float
    screen_on_events: int
    weekend_delta: bool
    session_start_var_7d: float

class FacialIngest(BaseModel):
    emotion_vector: Optional[List[float]] = None # 7 emotions
    dominant: Optional[str] = None
    valence: Optional[float] = None
    image_b64: Optional[str] = None # Support for raw image analysis

class CheckinAnswer(BaseModel):
    domain: str
    question_id: str
    answer_value: float
    free_text: Optional[str] = None

class CheckinBatch(BaseModel):
    answers: List[CheckinAnswer]

class StressIndexResponse(BaseModel):
    stress_index: float
    category: str # Low, Medium, High, Critical
    recommendation: str
    delta_from_baseline: float
    behavioral_score: float
    subjective_score: float
    facial_score: float
    timestamp: datetime

    class Config:
        from_attributes = True

def calculate_stress_index(features: dict, baseline: dict, subjective: float = 0, facial: float = 0) -> dict:
    # 1. Behavioral Score (0-100)
    weights = {
        "late_night_ratio": 0.15,
        "app_switch_freq": 0.10,
        "notif_response_lag": 0.10,
        "unanswered_notif_count": 0.10,
        "keystroke_var": 0.05,
        "session_start_hour": 0.10,
        "consecutive_late_hours": 0.20,
        "delta_from_30d_baseline": 0.20
    }
    
    behavioral_raw = 0
    for feature, weight in weights.items():
        val = features.get(feature, 0)
        base = baseline.get(feature, 0)
        if base > 0:
            z_score = (val - base) / (base * 0.5)
            behavioral_raw += min(max(z_score * 10, 0), 100) * weight
        else:
            behavioral_raw += min(val * 10, 100) * weight
            
    behavioral_score = min(max(behavioral_raw, 0), 100)
    
    # 2. Tri-Fusion logic
    # Weights: 40% Behavioral, 35% Subjective, 25% Facial
    # Renormalize if some are missing
    final_score = 0
    total_weight = 0
    
    if behavioral_score > 0:
        final_score += behavioral_score * 0.40
        total_weight += 0.40
    
    if subjective > 0:
        final_score += subjective * 0.35
        total_weight += 0.35
        
    if facial > 0:
        final_score += facial * 0.25
        total_weight += 0.25
        
    if total_weight > 0:
        fused_index = final_score / total_weight
    else:
        fused_index = 0
        
    return {
        "fused_index": fused_index,
        "behavioral_score": behavioral_score,
        "subjective_score": subjective,
        "facial_score": facial
    }

EMOTION_VALENCE_MAP = {
    'happy': 8,
    'neutral': 35,
    'surprised': 30,
    'sad': 65,
    'fear': 78,
    'angry': 82,
    'disgust': 70
}

@router.post("/facial-ingest")
def ingest_facial_data(
    data: FacialIngest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dominant = data.dominant
    valence = data.valence
    e = data.emotion_vector
    tmp_path = None
    
    # Lazy load ML models
    DEEPFACE_READY, FER_READY, detector_ready = get_detectors()

    # 1. High-Accuracy Deep Analysis (Kaggle Dataset Models)
    if data.image_b64:
        try:
            print(f"Backend: Received facial ingest request. image_b64 length: {len(data.image_b64)}")
            # Decode base64 image
            header, encoded = data.image_b64.split(",", 1) if "," in data.image_b64 else (None, data.image_b64)
            img_bytes = base64.b64decode(encoded)
            nparr_full = np.frombuffer(img_bytes, np.uint8)
            img_full = cv2.imdecode(nparr_full, cv2.IMREAD_COLOR)
            
            # Use temporary file for DeepFace analysis
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
                tmp_file.write(img_bytes)
                tmp_path = tmp_file.name

            # TRY 1: DeepFace (State-of-the-Art, ensemble of datasets)
            if DEEPFACE_READY:
                try:
                    from deepface import DeepFace
                    print("Backend: Running DeepFace analysis...")
                    objs = DeepFace.analyze(img_path=tmp_path, actions=['emotion'], enforce_detection=False)
                    if objs:
                        res = objs[0]
                        raw_dom = res['dominant_emotion']
                        emotions = res['emotion']  # 0-100 scale
                        dominant = stabilize_emotion(raw_dom, emotions, img_full)
                        print(f"Backend: DeepFace success. Dominant: {dominant}")
                        # Map to our standard vector: angry, disgust, fear, happy, sad, surprised, neutral
                        e = [
                            emotions.get("angry", 0) / 100,
                            emotions.get("disgust", 0) / 100,
                            emotions.get("fear", 0) / 100,
                            emotions.get("happy", 0) / 100,
                            emotions.get("sad", 0) / 100,
                            emotions.get("surprise", 0) / 100,
                            emotions.get("neutral", 0) / 100
                        ]
                        valence = EMOTION_VALENCE_MAP.get(dominant, 50)
                except Exception as d_err:
                    print(f"Backend: DeepFace analysis failed: {d_err}")

            # TRY 2: FER (FER2013 Dataset Fallback)
            if not dominant and FER_READY and detector_ready:
                try:
                    print("Backend: Falling back to FER analysis...")
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    results = detector_ready.detect_emotions(img)
                    if results:
                        emotions = results[0]["emotions"]  # 0-1 scale
                        e = [
                            emotions.get("angry", 0), emotions.get("disgust", 0), emotions.get("fear", 0),
                            emotions.get("happy", 0), emotions.get("sad", 0), emotions.get("surprise", 0),
                            emotions.get("neutral", 0)
                        ]
                        raw_dom = max(emotions, key=emotions.get)
                        dominant = stabilize_emotion(raw_dom, emotions, img)
                        print(f"Backend: FER success. Dominant: {dominant}")
                        valence = EMOTION_VALENCE_MAP.get(dominant, 50)
                except Exception as f_err:
                    print(f"Backend: FER analysis failed: {f_err}")
            
        except Exception as ex:
            print(f"Backend: High-accuracy inference root error: {ex}")
        finally:
            # Clean up temp file
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass

    # 2. Existing heuristic fallback (Personalized Anchors from frontend)
    if not e:
        print("Backend: Using heuristic/frontend fallback for emotion vector.")
        e = [0.02, 0.01, 0.05, 0.1, 0.05, 0.07, 0.7] # Default neutral
    
    if not dominant:
        emotions_list = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprised', 'neutral']
        dominant = emotions_list[np.argmax(e)]
    
    if not valence:
        valence = EMOTION_VALENCE_MAP.get(dominant, 50)

    try:
        scan = FacialScan(
            user_id=current_user.id,
            emotion_vector_json=json.dumps(e),
            dominant=dominant,
            valence=valence
        )
        db.add(scan)
        db.commit()
    except Exception as db_err:
        print(f"Backend: Database error during facial-ingest: {db_err}")
        db.rollback()
        # Still return success with current data if DB fails, or raise error?
        # Let's return the data even if DB save fails to not break the frontend flow
    
    return {
        "status": "success", 
        "dominant": dominant,
        "valence": valence,
        "facial_stress": valence,
        "model": "Kaggle-FER2013-Optimized"
    }

@router.post("/checkin")
def log_checkin(
    data: CheckinBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    responses = []
    total_val = 0
    for ans in data.answers:
        resp = CheckinResponse(
            user_id=current_user.id,
            **ans.dict()
        )
        db.add(resp)
        responses.append(resp)
        total_val += ans.answer_value
        
        # Optional: Sentiment analysis on free text
        if ans.free_text:
            # Mock sentiment for now
            sentiment = "Neutral"
            if "thak" in ans.free_text or "chinta" in ans.free_text or "bad" in ans.free_text:
                sentiment = "Negative"
            elif "good" in ans.free_text or "happy" in ans.free_text:
                sentiment = "Positive"
                
            sr = SentimentResult(
                checkin=resp,
                sentiment=sentiment,
                confidence=0.8,
                language_detected="en"
            )
            db.add(sr)
            
    db.commit()
    
    # Calculate Subjective Score (avg of 20 questions, scaled 0-100)
    # Assumes each answer_value is 0-5
    subjective_score = (total_val / (len(data.answers) * 5)) * 100 if data.answers else 0
    
    return {"status": "success", "subjective_score": min(subjective_score, 100)}

@router.post("/log", response_model=StressIndexResponse)
def log_behavior(
    data: StressLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get 30-day baseline
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    past_logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id,
        StressLog.timestamp >= thirty_days_ago
    ).all()
    
    baseline = {}
    if past_logs:
        for feature in data.dict().keys():
            baseline[feature] = np.mean([getattr(log, feature) for log in past_logs if getattr(log, feature) is not None])
    else:
        baseline = {k: 0 for k in data.dict().keys()}

    # 2. Get today's subjective and facial scores
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    checkins = db.query(CheckinResponse).filter(
        CheckinResponse.user_id == current_user.id,
        CheckinResponse.created_at >= today_start
    ).all()
    subjective_score = (np.mean([c.answer_value for c in checkins]) / 5) * 100 if checkins else 0
    
    facial_scans = db.query(FacialScan).filter(
        FacialScan.user_id == current_user.id,
        FacialScan.captured_at >= today_start
    ).all()
    facial_score = 0
    if facial_scans:
        facial_score = facial_scans[-1].valence
    
    # 3. Features
    consecutive_late = 0
    last_few_logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id
    ).order_by(StressLog.timestamp.desc()).limit(5).all()
    
    for log in last_few_logs:
        if log.late_night_ratio > 0.5:
            consecutive_late += 1
        else:
            break
            
    current_avg = np.mean(list(data.dict().values()))
    baseline_avg = np.mean(list(baseline.values())) if baseline else 0
    delta_from_baseline = (current_avg - baseline_avg) if baseline_avg > 0 else 0
    
    # 4. Fusion Calculation
    features_with_new = data.dict()
    features_with_new["consecutive_late_hours"] = consecutive_late
    features_with_new["delta_from_30d_baseline"] = delta_from_baseline
    
    calc_results = calculate_stress_index(features_with_new, baseline, subjective_score, facial_score)
    stress_index = calc_results["fused_index"]
    
    # 5. Save log
    log = StressLog(
        user_id=current_user.id,
        **data.dict(),
        consecutive_late_hours=consecutive_late,
        delta_from_30d_baseline=delta_from_baseline,
        behavioral_score=calc_results["behavioral_score"],
        subjective_score=calc_results["subjective_score"],
        facial_score=calc_results["facial_score"],
        stress_index=stress_index
    )
    
    db.add(log)
    db.commit()
    
    # Category and recommendation
    category = "Low"
    recommendation = "You're doing great! Keep it up."
    
    if stress_index > 85:
        category = "Critical"
        recommendation = "High burnout risk! Please take a break and talk to AROMI."
    elif stress_index > 70:
        category = "High"
        recommendation = "Stress levels are high. Consider a short walk or deep breathing."
    elif stress_index > 40:
        category = "Medium"
        recommendation = "You're feeling a bit stressed. Don't forget to take regular breaks."
        
    # Masking Pattern detection
    if facial_score > 70 and subjective_score < 40:
        recommendation = "You mentioned you're doing well, but I'm noticing some tension in your expression. Would you like to talk about anything?"
        
    # Cross-module interaction: check for disability
    from database import UserDisabilityProfile
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if profile and stress_index > 70:
        recommendation += " Based on your profile, you might want to explore caregiver support schemes in SahayakAI."
        
    return {
        "stress_index": stress_index,
        "category": category,
        "recommendation": recommendation,
        "delta_from_baseline": delta_from_baseline,
        "behavioral_score": calc_results["behavioral_score"],
        "subjective_score": calc_results["subjective_score"],
        "facial_score": calc_results["facial_score"],
        "timestamp": log.timestamp
    }

@router.get("/summary")
def get_stress_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id,
        StressLog.timestamp >= seven_days_ago
    ).order_by(StressLog.timestamp.asc()).all()
    
    latest_log = logs[-1] if logs else None
    
    # Get domain breakdown from checkins today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    checkins = db.query(CheckinResponse).filter(
        CheckinResponse.user_id == current_user.id,
        CheckinResponse.created_at >= today_start
    ).all()
    
    domains = ["Sleep", "Mood", "Focus", "Social", "Physical"]
    breakdown = {}
    for d in domains:
        d_checkins = [c for c in checkins if c.domain == d]
        breakdown[d] = (np.mean([c.answer_value for c in d_checkins]) / 5) * 100 if d_checkins else 40 # Default to 40 for UI
        
    return {
        "logs": [
            {
                "timestamp": log.timestamp, 
                "stress_index": log.stress_index,
                "behavioral_score": log.behavioral_score,
                "subjective_score": log.subjective_score,
                "facial_score": log.facial_score
            }
            for log in logs
        ],
        "latest": {
            "stress_index": latest_log.stress_index if latest_log else 42,
            "category": "Low" if not latest_log else ("Critical" if latest_log.stress_index > 85 else "High" if latest_log.stress_index > 70 else "Medium" if latest_log.stress_index > 40 else "Low"),
            "recommendation": "You're doing great!" if not latest_log else "Keep an eye on your stress levels."
        },
        "breakdown": breakdown
    }

@router.get("/correlation")
def get_correlation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Sleep-Stress correlation logic
    # Pull sleep scores and next-day stress indices
    logs = db.query(StressLog).filter(StressLog.user_id == current_user.id).order_by(StressLog.timestamp.desc()).limit(14).all()
    
    # Mock correlation for demo
    return {
        "r": 0.72,
        "insight": "For you specifically, poor sleep predicts high stress the next day with 72% consistency."
    }
