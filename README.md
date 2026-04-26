# SkillPath AI: Bridging the Gap Between Your Resume and Your Next Role

SkillPath AI is a professional career development platform that leverages the power of Google's Gemini AI to analyze the alignment between a candidate's resume and a specific job description. It provides actionable insights, a structured learning roadmap, and a real-time AI mentor to help users bridge critical skill gaps.

![SkillPath AI Preview](https://img.icons8.com/color/144/brain--v1.png)

## 🚀 Key Features

- **Intelligent Gap Analysis**: Upload your resume and paste a job description to see a precise match percentage and a list of missing technical or soft skills.
- **Personalized Learning Path**: Generates a 3-step actionable roadmap with estimated timelines and high-quality learning resources (documentation, courses, tutorials).
- **Interactive AI Mentor**: A real-time chat interface where you can ask follow-up questions, get interview tips, or clarify technical concepts from your roadmap.
- **Skills Visualization**: A data-driven dashboard showing your proficiency levels (Expert, Intermediate, Novice) across the core requirements of the role.
- **Professional PDF Export**: Generate a clean, branded PDF report of your career assessment and learning plan to track your progress offline.
- **Secure Authentication**: Built-in Google Auth via Firebase for a personalized and secure experience.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4.0, Framer Motion (for fluid animations)
- **AI Engine**: Google Gemini API (Pro/Flash models)
- **Backend Services**: Firebase (Authentication & Firestore)
- **Data Visualization**: Recharts
- **Document Processing**: 
  - `pdfjs-dist` (PDF parsing)
  - `mammoth` (DOCX to HTML/Text conversion)
- **Reporting**: `jsPDF` & `jspdf-autotable`

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- A Google AI Studio API Key (for Gemini)
- A Firebase Project

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/skill-path-ai.git
   cd skill-path-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root and add your keys:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the dev server**:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture Overview

- **`/src/lib/gemini.ts`**: The core logic for interacting with the Gemini API, including structured output parsing for assessments and learning plans.
- **`/src/components/AssessmentDashboard.tsx`**: The main interface managing the dashboard state, charts, and the AI chat integration.
- **`/src/lib/pdfUtils.ts`**: (Integrated within components) Handles the complex logic of redrawing links and styling for high-quality PDF exports.
- **`/src/App.tsx`**: Manages the application lifecycle, authentication state, and initial file processing (PDF/DOCX extraction).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
*Built with ❤️ using Google AI Studio and Firebase.*
