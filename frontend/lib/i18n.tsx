"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "hi";

const translations = {
  en: {
    dashboard: "Dashboard", officers: "Officers", materials: "Materials", quizzes: "Quizzes", logout: "Logout", admin: "Admin",
    language: "Language", english: "English", hindi: "हिन्दी", government: "Government of India",
    platform: "AI Competency Platform", signIn: "Sign in", signingIn: "Signing in...", email: "Email", password: "Password",
    officerSignIn: "Officer Sign In", welcomeBack: "Welcome back", loginPrompt: "Sign in to your MoSPI learning dashboard",
    demoAccounts: "Demo accounts", officerDemo: "Officer Demo", adminDemo: "Admin Demo", learnerRole: "Learner role", adminRole: "Admin role",
    welcome: "Welcome", yearsExperience: "years experience", domainCompetency: "Domain Competency", topSkillGaps: "Top 10 Skill Gaps",
    competencyGaps: "Competency Gaps", courseRecommendations: "Course Recommendations", refresh: "Refresh", enroll: "Enroll", enrolled: "Enrolled",
    availableQuizzes: "Available Quizzes", viewAllQuizzes: "View all quizzes", loadingDashboard: "Loading your dashboard...",
    statistical: "Statistical", technical: "Technical", digitalGov: "Digital Gov.", behavioural: "Behavioural",
    competencyGapAnalysis: "Competency Gap Analysis", personalisedRecommendations: "Personalized Recommendations", aiQuizzes: "AI-Generated Quizzes", adminAnalytics: "Admin Analytics",
    gapAnalysisDesc: "AI-powered skill profiling across 4 domains", recommendationsDesc: "Semantic course matching via iGOT catalog", quizDesc: "LLM-based MCQ generation from training materials", analyticsDesc: "Org-wide gap heatmap and predictive insights",
  },
  hi: {
    dashboard: "डैशबोर्ड", officers: "अधिकारी", materials: "सामग्री", quizzes: "प्रश्नोत्तरी", logout: "लॉग आउट", admin: "प्रशासक",
    language: "भाषा", english: "English", hindi: "हिन्दी", government: "भारत सरकार",
    platform: "एआई दक्षता मंच", signIn: "साइन इन", signingIn: "साइन इन हो रहा है...", email: "ईमेल", password: "पासवर्ड",
    officerSignIn: "अधिकारी साइन इन", welcomeBack: "फिर से स्वागत है", loginPrompt: "अपने MoSPI लर्निंग डैशबोर्ड में साइन इन करें",
    demoAccounts: "डेमो खाते", officerDemo: "अधिकारी डेमो", adminDemo: "प्रशासक डेमो", learnerRole: "शिक्षार्थी भूमिका", adminRole: "प्रशासक भूमिका",
    welcome: "स्वागत है", yearsExperience: "वर्ष का अनुभव", domainCompetency: "क्षेत्रीय दक्षता", topSkillGaps: "शीर्ष 10 कौशल अंतर",
    competencyGaps: "दक्षता अंतर", courseRecommendations: "पाठ्यक्रम सुझाव", refresh: "रीफ्रेश", enroll: "नामांकन", enrolled: "नामांकित",
    availableQuizzes: "उपलब्ध प्रश्नोत्तरी", viewAllQuizzes: "सभी प्रश्नोत्तरी देखें", loadingDashboard: "आपका डैशबोर्ड लोड हो रहा है...",
    statistical: "सांख्यिकीय", technical: "तकनीकी", digitalGov: "डिजिटल शासन", behavioural: "व्यवहारिक",
    competencyGapAnalysis: "दक्षता अंतर विश्लेषण", personalisedRecommendations: "व्यक्तिगत सुझाव", aiQuizzes: "एआई से बनी प्रश्नोत्तरी", adminAnalytics: "प्रशासक विश्लेषण",
    gapAnalysisDesc: "चार क्षेत्रों में एआई-आधारित कौशल प्रोफाइलिंग", recommendationsDesc: "iGOT कैटलॉग से अर्थपूर्ण पाठ्यक्रम मिलान", quizDesc: "प्रशिक्षण सामग्री से LLM-आधारित MCQ निर्माण", analyticsDesc: "संगठन-स्तरीय अंतर मानचित्र और पूर्वानुमान",
  },
} as const;

type TranslationKey = keyof typeof translations.en;
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("mospi-language");
    if (saved === "hi" || saved === "en") setLanguage(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi" : "en";
    window.localStorage.setItem("mospi-language", language);
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

const hindiEntities: Record<string, string> = {
  "Priya Sharma": "प्रिया शर्मा", "Rajesh Kumar": "राजेश कुमार", "Ananya Iyer": "अनन्या अय्यर", "Vikram Patel": "विक्रम पटेल", "Sneha Nair": "स्नेहा नायर", "Amit Verma": "अमित वर्मा", "Deepa Rao": "दीपा राव", "Admin DIID": "प्रशासक DIID",
  "Statistical Officer": "सांख्यिकीय अधिकारी", "Senior Statistical Officer": "वरिष्ठ सांख्यिकीय अधिकारी", "Data Analyst": "डेटा विश्लेषक", "DIID Administrator": "DIID प्रशासक",
  "Price Statistics Division": "मूल्य सांख्यिकी प्रभाग", "National Accounts Division": "राष्ट्रीय लेखा प्रभाग", "Labour and Employment Division": "श्रम एवं रोजगार प्रभाग", "Agricultural Statistics Division": "कृषि सांख्यिकी प्रभाग", "Survey Coordination Division": "सर्वेक्षण समन्वय प्रभाग", "IT and Data Management Division": "आईटी एवं डेटा प्रबंधन प्रभाग", "Social Statistics Division": "सामाजिक सांख्यिकी प्रभाग", "Data Informatics and Innovation Division": "डेटा सूचना विज्ञान एवं नवाचार प्रभाग",
};

export function localizeEntity(value: string | null | undefined, language: Language) {
  if (!value || language === "en") return value || "";
  return hindiEntities[value] || value;
}
