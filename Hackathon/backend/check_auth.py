from database import SessionLocal, User
from services.auth import verify_password, get_password_hash

def check():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "admin").first()
    if user:
        print(f"Checking user: {user.username}")
        is_correct = verify_password("admin123", user.hashed_password)
        print(f"Password 'admin123' correct? {is_correct}")
        
        # If not correct, reset it here
        if not is_correct:
            print("Resetting password to 'admin123'...")
            user.hashed_password = get_password_hash("admin123")
            db.commit()
            print("Reset successful.")
    else:
        print("User admin not found.")
    db.close()

if __name__ == "__main__":
    check()
