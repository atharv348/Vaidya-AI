# VaidyaAI - AI Health Platform

VaidyaAI is a sophisticated health-tracking and multi-organ diagnostic application designed to provide a futuristic "Health OS" experience. It leverages Deep Learning and Artificial Intelligence to analyze clinical scans, track vitals, and provide personalized wellness advice.

🚀 **Key Features**

### **Main Services**
- **Wellness Dashboard**: Holistic overview of health metrics, vitals tracking, and recent activity at a glance.
- **AROMI AI Coach**: Personalized multilingual health guidance (English, Hindi, Marathi), meal planning, and workout routines powered by **Llama 3.3 Versatile**.
- **Multi-Organ AI Diagnostics**: Real-time clinical scan analysis for **Skin, Eye, Oral, Bone, and Lungs** using advanced image processing.
- **Meal Plan**: AI-generated nutrition plans tailored to your health goals and dietary preferences.
- **Workout Plan**: Customized fitness routines with exercise tracking and progress monitoring.

### **Specialized Support**
- **SahayakAI Assistant**: A dedicated navigator for Indian government disability schemes (ADIP, UDID, etc.) featuring **real-time web search**, eligibility matching, and automated guidance.
- **ManasMitra**: Mental health and mood tracking with AI-driven emotional support and stress management tools.

### **Health Management**
- **Achievements**: Gamified health journey with badges and milestones to keep you motivated.
- **Find Hospital**: Intelligent hospital and clinic finder with **manual location override** and interactive map integration.
- **Activity Log**: Detailed history of your health scans, vitals, and AI interactions for long-term tracking.
- **Settings**: Personalized profile management with language and notification preferences.

🛠️ **Technical Stack**

- **Frontend**: React.js, Vite, Tailwind CSS, Shadcn UI, Framer Motion, TanStack Query.
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite, Pydantic.
- **AI/ML**: Groq Cloud (Llama 3.3), OpenCV, PyTorch, DuckDuckGo Search API.

📦 **Installation & Setup**

### Prerequisites
- Python 3.8+
- Node.js 18+
- Groq API Key (Set in `.env`)

### Quick Start
1. **Backend**:
   ```bash
   cd Hackathon/backend
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8001 --host 0.0.0.0
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

🚀 **Deployment**

- **AWS EC2**: Fully Dockerized for seamless deployment. Use the provided Dockerfiles to build and push images to your registry.
- **Netlify**: Frontend is optimized for manual or CI/CD deployment via the `dist` folder.

---
© 2026 VaidyaAI. 
