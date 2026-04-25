import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface Skill {
  name: string;
  level: "Novice" | "Intermediate" | "Expert";
  score: number;
}

export interface Gap {
  name: string;
  severity: "Low" | "Medium" | "High";
}

export interface LearningStep {
  step: number;
  title: string;
  description: string;
  resources: string[];
  timeEstimate: string;
}

export interface AssessmentData {
  matchPercentage: number;
  skills: Skill[];
  gaps: Gap[];
}

export async function parseResumeAndJD(resume: string, jd: string): Promise<AssessmentData> {
  const prompt = `
    Analyze the following Resume and Job Description. 
    1. Calculate a match percentage.
    2. Extract core skills from the JD and assess the candidate's proficiency based on the resume (Expert, Intermediate, Novice).
    3. Identify critical skill gaps.

    Resume: ${resume}
    Job Description: ${jd}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchPercentage: { type: Type.NUMBER },
          skills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.STRING, enum: ["Novice", "Intermediate", "Expert"] },
                score: { type: Type.NUMBER, description: "0-100 score" }
              }
            }
          },
          gaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
              }
            }
          }
        },
        required: ["matchPercentage", "skills", "gaps"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function generateLearningPlan(data: AssessmentData): Promise<LearningStep[]> {
  const prompt = `
    Based on the following skill assessment and gaps, generate a personalized 3-step learning plan.
    Focus on "adjacent skills" that are realistically acquirable.
    Provide curated resource links and time estimates.

    Assessment: ${JSON.stringify(data)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.NUMBER },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            resources: { type: Type.ARRAY, items: { type: Type.STRING } },
            timeEstimate: { type: Type.STRING }
          },
          required: ["step", "title", "description", "resources", "timeEstimate"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
}

export async function getAgentResponse(messages: any[], nextInput: string, assessmentData: AssessmentData): Promise<string> {
  const prompt = `
    You are SkillAgent AI, an expert career coach and technical assessor.
    You are currently assessing a candidate. 
    Context: ${JSON.stringify(assessmentData)}
    
    Conversation History:
    ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
    
    User Input: ${nextInput}
    
    Respond helpfully and professionally. Guide them through the assessment or explain the gaps/learning plan.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "I'm sorry, I couldn't process that.";
}
