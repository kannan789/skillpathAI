import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { 
  Send, 
  ChevronUp, 
  MapPin, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  BookOpen, 
  Clock, 
  ExternalLink,
  Brain,
  CheckCircle2,
  Download,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { parseResumeAndJD, generateLearningPlan, getAgentResponse, type AssessmentData, type Skill, type Gap, type LearningStep } from '../lib/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: any;
}

interface AssessmentDashboardProps {
  assessmentId: string;
}

export default function AssessmentDashboard({ assessmentId }: AssessmentDashboardProps) {
  const [assessment, setAssessment] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!assessmentId) return;

    // Load assessment data
    const unsubAssessment = onSnapshot(doc(db, 'assessments', assessmentId), (docSnap) => {
      if (docSnap.exists()) {
        setAssessment({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // Load messages
    const q = query(collection(db, 'assessments', assessmentId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data() as Message);
      setMessages(msgs);
    });

    return () => {
      unsubAssessment();
      unsubMessages();
    };
  }, [assessmentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText;
    setInputText('');
    setIsSending(true);

    try {
      // Create user message object
      const userMessage: Message = {
        sender: 'user',
        text,
        timestamp: new Date()
      };

      // Add user message to DB
      await addDoc(collection(db, 'assessments', assessmentId, 'messages'), userMessage);

      // Get AI response using current messages + new user message
      const currentMessagesPlusNew = [...messages, userMessage];
      const aiResponseText = await getAgentResponse(currentMessagesPlusNew, text, assessment);

      // Add AI message to DB
      await addDoc(collection(db, 'assessments', assessmentId, 'messages'), {
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date()
      });
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!assessment || isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    try {
      const transcript = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const plan = await generateLearningPlan(assessment, transcript);
      await updateDoc(doc(db, 'assessments', assessmentId), {
        learningPlan: plan,
        updatedAt: new Date().toISOString()
      });
      setIsInterviewing(false);
    } catch (err) {
      console.error("Plan generation error:", err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (!assessment) return <div className="flex h-screen items-center justify-center">Loading Assessment...</div>;

  const totalHours = assessment.learningPlan?.length 
    ? assessment.learningPlan.reduce((acc: number, step: any) => {
        const hours = parseInt(step.timeEstimate) || 0;
        return acc + hours;
      }, 0)
    : 18; // Default mock value if not calculated

  return (
    <div className="w-full h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-800">
      {/* Sidebar: AI Agent Chat Interface */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-indigo-500 to-violet-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold tracking-tight">SkillAgent AI</h2>
              <p className="text-indigo-100 text-xs">Assessment Active</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          {messages.map((msg, i) => (
            <div 
              key={i}
              className={cn(
                "rounded-lg p-3 text-sm max-w-[90%]",
                msg.sender === 'ai' 
                  ? "bg-slate-100 text-slate-600 self-start" 
                  : "bg-indigo-50 border border-indigo-100 text-indigo-700 self-end"
              )}
            >
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="relative">
            <div className="group flex items-center bg-slate-100 rounded-full py-1.5 px-4 text-sm border border-slate-200 focus-within:border-indigo-400 transition-colors">
              <input 
                type="text"
                placeholder="Ask follow-up..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
              />
              <button 
                type="submit"
                disabled={isSending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-full p-1.5 ml-2 transition-colors shrink-0"
              >
                <ChevronUp className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header / Profile Summary */}
        <header className="bg-white p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{assessment.candidateName}</h1>
            <p className="text-slate-500 text-sm">Targeting: <span className="font-semibold">{assessment.targetJobTitle}</span></p>
          </div>
          <div className="flex gap-3">
            <span className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2",
              assessment.matchPercentage > 80 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            )}>
              {assessment.matchPercentage}% Match
            </span>
            <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export Plan
            </button>
          </div>
        </header>

        {/* Assessment Dashboard */}
        <div className="p-8 flex flex-col gap-6">
          {/* Top Row: Skill Comparison */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proficiency Analysis</h3>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assessment.skills} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={120} 
                      axisLine={false}
                      tick={{ fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                      {assessment.skills?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#4f46e5' : entry.score > 40 ? '#f97316' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Job Gap Detection</h3>
                <AlertCircle className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex flex-wrap gap-3">
                {assessment.gaps?.map((gap: Gap, i: number) => (
                  <div 
                    key={i}
                    className={cn(
                      "px-4 py-2.5 rounded-xl flex items-center gap-2.5 transition-all hover:scale-105",
                      gap.severity === 'High' 
                        ? "bg-rose-50 border border-rose-100 text-rose-700" 
                        : "bg-slate-50 border border-slate-100 text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      gap.severity === 'High' ? "bg-rose-500" : "bg-slate-400"
                    )} />
                    <span className="text-xs font-medium">{gap.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Row: Learning Plan */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex-1">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Personalised Learning Roadmap</h3>
                <p className="text-slate-900 text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Bridging the Gap (Estimated {totalHours} Hours)
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-indigo-600 font-black text-2xl">
                  {assessment.learningPlan?.length || 0} Steps
                </p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Target Completion: Within 2 Weeks</p>
              </div>
            </div>

            {!assessment.learningPlan ? (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Brain className={cn("w-12 h-12 mb-4", isInterviewing ? "text-indigo-500 animate-pulse" : "text-slate-300")} />
                <p className="text-slate-500 text-sm mb-4">
                  {isInterviewing 
                    ? "Technical assessment in progress. Check the chat to answer questions." 
                    : "Ready to verify your skills?"}
                </p>
                <div className="flex gap-4">
                  {!isInterviewing ? (
                    <button 
                      onClick={() => {
                        setIsInterviewing(true);
                        addDoc(collection(db, 'assessments', assessmentId, 'messages'), {
                          sender: 'ai',
                          text: "Great! Let's start the technical assessment. I'll ask you a few conceptual questions per skill. Ready for the first one?",
                          timestamp: new Date()
                        });
                      }}
                      className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-sm font-bold shadow-lg transition-all active:scale-95"
                    >
                      Start Interview
                    </button>
                  ) : (
                    <button 
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingPlan ? "Evaluating & Building Plan..." : "Finish Interview & Build Plan"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Horizontal Connector Line (desktop only) */}
                <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-px bg-slate-100 -z-0" />
                
                {assessment.learningPlan.map((step: LearningStep, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative z-10 flex flex-col items-center text-center group"
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center font-bold mb-5 transition-all shadow-md group-hover:scale-110",
                      i === 0 
                        ? "bg-indigo-600 text-white shadow-indigo-100" 
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {i === 0 ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">{step.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6 px-4">{step.description}</p>
                    
                    <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 w-full text-left">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{step.timeEstimate}</span>
                      </div>
                      <p className="text-[10px] font-bold text-indigo-600 mb-2 border-b border-indigo-100 pb-1">RESOURCES</p>
                      <div className="space-y-2">
                        {step.resources.map((res: string, j: number) => (
                          <div key={j} className="flex items-center gap-2 group/link">
                            <ExternalLink className="w-3 h-3 text-indigo-400 group-hover/link:text-indigo-600" />
                            <span className="text-[11px] text-indigo-500 underline truncate font-medium cursor-pointer hover:text-indigo-700">
                              {res}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
