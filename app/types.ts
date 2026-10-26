export interface Question {
  id: string;
  question: string;
  choices: Record<string, string>;
  correctAnswer: string;
  rationale: string;
  domain: string;
  skill: string;
  difficulty: string;
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, string>;
  score: number;
  startTime: number;
  questionTimes: Record<number, number>;
}

export interface AnalyticsData {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  averageTimePerQuestion: number;
  domainPerformance: Record<string, { correct: number; total: number }>;
  skillPerformance: Record<string, { correct: number; total: number }>;
  timeTaken: number;
}

export interface SavedProgress {
  currentQuestionIndex: number;
  answers: Record<number, string>;
  score: number;
  startTime: number;
  questionTimes: Record<number, number>;
  lastSaved: number;
}