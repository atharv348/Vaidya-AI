import os
import sys
from pathlib import Path
# Add current directory to sys.path to allow imports from local files
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
# Always load backend-local .env so launches from repo root still pick up API keys.
load_dotenv(dotenv_path=BACKEND_DIR / ".env", override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, token, workout, meals, coach, progress, predictions, sahayak, manasmitra
from database import init_db, SessionLocal, User
from services.auth import get_password_hash
import json
# Updated VaidyaAI Backend
app = FastAPI(title="VaidyaAI API")

# Initialize database immediately
init_db()

# CORS - Allow frontend from any origin for deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Create default admin user if not exists"""
    # Create default admin user if not exists
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin_user = User(
                username="admin",
                email="admin@sehatsaathi.com",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                fitness_level="intermediate",
                fitness_goal="maintenance"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created successfully")
    finally:
        db.close()


app.include_router(users.router)
app.include_router(token.router)
app.include_router(workout.router)
app.include_router(meals.router)
app.include_router(coach.router)
app.include_router(progress.router)
app.include_router(predictions.router)
app.include_router(sahayak.router)
app.include_router(manasmitra.router)

# Print all registered routes for debugging
for route in app.routes:
    print(f"Route: {route.path} - Methods: {route.methods}")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "VaidyaAI Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="127.0.0.1", port=port)
