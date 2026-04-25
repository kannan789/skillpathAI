import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { 
  Briefcase, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  LogOut, 
  User as UserIcon,
  CirclePlay,
  Github,
  Loader2,
  Target
} from 'lucide-react';
import { cn } from './lib/utils';
import { parseResumeAndJD } from './lib/gemini';
import AssessmentDashboard from './components/AssessmentDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        fetchAssessments(u.uid);
      }
    });
    return unsub;
  }, []);

  const fetchAssessments = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'assessments'), 
        // where('userId', '==', uid), // Using a general collection for demo, simple rules
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const assessments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentAssessments(assessments);
    } catch (err) {
      console.error("Error fetching assessments:", err);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleStartAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume.trim() || !jobDesc.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const data = await parseResumeAndJD(resume, jobDesc);
      
      const docRef = await addDoc(collection(db, 'assessments'), {
        ...data,
        candidateName: user?.displayName || "Elena Vance",
        targetJobTitle: "Senior Role", // AI can extract this better later
        resumeText: resume,
        jobDescription: jobDesc,
        userId: user?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Initial AI message
      await addDoc(collection(db, 'assessments', docRef.id, 'messages'), {
        sender: 'ai',
        text: `Hello ${user?.displayName || "there"}! I've analyzed your resume against the job description. I've identified a ${data.matchPercentage}% match. Let's dive into your core skills and bridge any gaps.`,
        timestamp: new Date()
      });

      setActiveAssessmentId(docRef.id);
    } catch (err) {
      console.error("Assessment failed:", err);
      alert("Failed to analyze. Please check your text inputs.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-100 rotate-6">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">SkillPath AI</h1>
          <p className="text-slate-500 mb-8 font-medium">Verify your skills, bridge the gaps, land the job.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <CirclePlay className="w-5 h-5 text-indigo-400" />
            Continue with Google
          </button>
          
          <div className="mt-8 pt-8 border-t border-slate-50 flex justify-center gap-6 opacity-30">
            <Github className="w-5 h-5" />
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  if (activeAssessmentId) {
    return <AssessmentDashboard assessmentId={activeAssessmentId} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dynamic Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl text-slate-900 tracking-tighter">SkillPath AI</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-100 rounded-full">
            <UserIcon className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-700">{user.displayName}</span>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto pt-32 px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form Section */}
          <section className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Assess your Fit.</h2>
              <p className="text-slate-500 text-lg">Upload your current resume and the target job description to begin.</p>
            </div>

            <form onSubmit={handleStartAssessment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest">
                    <FileText className="w-4 h-4" />
                    Your Resume
                  </label>
                  <textarea 
                    placeholder="Paste resume text here..."
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    className="w-full h-80 p-6 bg-white rounded-3xl border border-slate-200 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all resize-none text-sm leading-relaxed"
                  />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest">
                    <Target className="w-4 h-4" />
                    Job Description
                  </label>
                  <textarea 
                    placeholder="Paste job requirements here..."
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    className="w-full h-80 p-6 bg-white rounded-3xl border border-slate-200 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all resize-none text-sm leading-relaxed"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="group w-full py-5 px-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Analyzing Proficiency...
                  </>
                ) : (
                  <>
                    Launch Assessment
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* History / Stats Section */}
          <aside className="lg:col-span-5 space-y-8">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Professional Context</p>
                  <h3 className="text-2xl font-bold">Why Skill Assessment?</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Resumes are static. SkillPath uses Gemini AI to conversationally verify what you know, identifying the specific sub-skills that move the needle for recruiters.
                </p>
                <div className="flex gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1">
                    <p className="text-2xl font-black text-indigo-400">92%</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Accuracy</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex-1">
                    <p className="text-2xl font-black text-indigo-400">10ms</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Latency</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2">Recent Reports</h4>
              <div className="space-y-3">
                {recentAssessments.length > 0 ? recentAssessments.map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveAssessmentId(item.id)}
                    className="w-full bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-indigo-200 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{item.candidateName}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">{item.targetJobTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-600">{item.matchPercentage}%</p>
                      <ArrowRight className="w-4 h-4 text-slate-200 ml-auto" />
                    </div>
                  </button>
                )) : (
                  <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center">
                    <Briefcase className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-slate-400 text-xs font-medium">No previous assessments found.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
