'use client';

import { useState, useEffect, useCallback } from 'react';
import { Question, QuizState, AnalyticsData, SavedProgress } from './types';

const QUESTIONS_PER_BATCH = 10;

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    score: 0,
    startTime: Date.now(),
    questionTimes: {},
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetch('/questions.json')
      .then(res => res.json())
      .then((data: Question[]) => {
        setQuestions(data);
        setLoading(false);
        loadProgress();
      });
  }, []);

  useEffect(() => {
    if (!quizStarted || quizCompleted) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - quizState.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizStarted, quizCompleted, quizState.startTime]);

  const loadProgress = () => {
    const saved = localStorage.getItem('quizProgress');
    if (saved) {
      const progress: SavedProgress = JSON.parse(saved);
      setQuizState({
        currentQuestionIndex: progress.currentQuestionIndex,
        answers: progress.answers,
        score: progress.score,
        startTime: progress.startTime,
        questionTimes: progress.questionTimes,
      });
      setQuizStarted(true);
    }
  };

  const saveProgress = useCallback((state: QuizState) => {
    const progress: SavedProgress = {
      ...state,
      lastSaved: Date.now(),
    };
    localStorage.setItem('quizProgress', JSON.stringify(progress));
  }, []);

  useEffect(() => {
    if (quizStarted && !quizCompleted) {
      saveProgress(quizState);
    }
  }, [quizStarted, quizCompleted, quizState, saveProgress]);

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizState({
      currentQuestionIndex: 0,
      answers: {},
      score: 0,
      startTime: Date.now(),
      questionTimes: {},
    });
  };

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    if (!selectedAnswer) return;

    const currentQuestion = questions[quizState.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeTaken = Date.now() - quizState.startTime;

    const newAnswers = {
      ...quizState.answers,
      [quizState.currentQuestionIndex]: selectedAnswer,
    };

    const newScore = isCorrect ? quizState.score + 1 : quizState.score;

    const newQuestionTimes = {
      ...quizState.questionTimes,
      [quizState.currentQuestionIndex]: timeTaken,
    };

    const newState: QuizState = {
      ...quizState,
      currentQuestionIndex: quizState.currentQuestionIndex + 1,
      answers: newAnswers,
      score: newScore,
      startTime: Date.now(),
      questionTimes: newQuestionTimes,
    };

    setQuizState(newState);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setElapsedTime(0);

    const nextIndex = quizState.currentQuestionIndex + 1;
    if (nextIndex % QUESTIONS_PER_BATCH === 0 && nextIndex < questions.length) {
      setShowAnalytics(true);
    }

    if (nextIndex >= questions.length) {
      setQuizCompleted(true);
      localStorage.removeItem('quizProgress');
    }
  };

  const showAnswerFeedback = () => {
    setShowFeedback(true);
  };

  const continueFromAnalytics = () => {
    setShowAnalytics(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateAnalytics = (): AnalyticsData => {
    const answeredQuestions = Object.keys(quizState.answers).length;
    const correctAnswers = Object.entries(quizState.answers).filter(
      ([index, answer]) => questions[parseInt(index)]?.correctAnswer === answer
    ).length;

    const domainPerformance: Record<string, { correct: number; total: number }> = {};
    const skillPerformance: Record<string, { correct: number; total: number }> = {};

    Object.entries(quizState.answers).forEach(([index, answer]) => {
      const question = questions[parseInt(index)];
      if (question) {
        if (!domainPerformance[question.domain]) {
          domainPerformance[question.domain] = { correct: 0, total: 0 };
        }
        domainPerformance[question.domain].total++;
        if (question.correctAnswer === answer) {
          domainPerformance[question.domain].correct++;
        }

        if (!skillPerformance[question.skill]) {
          skillPerformance[question.skill] = { correct: 0, total: 0 };
        }
        skillPerformance[question.skill].total++;
        if (question.correctAnswer === answer) {
          skillPerformance[question.skill].correct++;
        }
      }
    });

    const totalTime = Object.values(quizState.questionTimes).reduce((a, b) => a + b, 0);
    const averageTime = answeredQuestions > 0 ? totalTime / answeredQuestions : 0;

    return {
      totalQuestions: questions.length,
      answeredQuestions,
      correctAnswers,
      incorrectAnswers: answeredQuestions - correctAnswers,
      accuracy: answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0,
      averageTimePerQuestion: averageTime,
      domainPerformance,
      skillPerformance,
      timeTaken: totalTime,
    };
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}>
        <div style={{ fontSize: '20px', color: '#303030' }}>Loading questions...</div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}>
        <div style={{ textAlign: 'center', padding: '60px', borderRadius: '16px', background: '#ffffff', maxWidth: '600px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, marginBottom: '16px', color: '#252525' }}>
            PSAT Quiz
          </h1>
          <p style={{ fontSize: '20px', marginBottom: '48px', color: '#555' }}>
            {questions.length} questions total
          </p>
          <button
            onClick={startQuiz}
            style={{ padding: '18px 64px', background: '#365bd8', color: '#ffffff', fontWeight: 700, fontSize: '20px', borderRadius: '32px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (showAnalytics) {
    const analytics = calculateAnalytics();
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}>
        <header style={{ height: '105px', background: '#eaf2fb', borderBottom: '1px solid #cfd6df', display: 'flex', alignItems: 'center', padding: '0 54px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#252525' }}>
              Analytics Dashboard
            </div>
            <div style={{ fontSize: '16px', color: '#555', marginTop: '4px' }}>
              Questions {quizState.currentQuestionIndex - QUESTIONS_PER_BATCH + 1} to {quizState.currentQuestionIndex}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '40px 54px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
              {[
                { label: 'Questions Answered', value: analytics.answeredQuestions, bg: '#eaf2fb' },
                { label: 'Correct', value: analytics.correctAnswers, bg: '#e6f4ea' },
                { label: 'Incorrect', value: analytics.incorrectAnswers, bg: '#fce8e6' },
                { label: 'Accuracy', value: `${analytics.accuracy.toFixed(1)}%`, bg: '#f3e8fd' },
              ].map((stat) => (
                <div key={stat.label} style={{ padding: '32px', borderRadius: '12px', textAlign: 'center', background: stat.bg }}>
                  <div style={{ fontSize: '48px', fontWeight: 700, marginBottom: '8px', color: '#252525' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '16px', color: '#555' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: '#252525' }}>
                Performance by Domain
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(analytics.domainPerformance).map(([domain, data]) => (
                  <div key={domain} style={{ padding: '24px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#303030', fontSize: '16px' }}>{domain}</span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {data.correct}/{data.total} ({((data.correct / data.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', borderRadius: '8px', height: '12px', background: '#e0e0e0' }}>
                      <div style={{ height: '12px', borderRadius: '8px', width: `${(data.correct / data.total) * 100}%`, background: '#365bd8' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: '#252525' }}>
                Performance by Skill
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(analytics.skillPerformance).map(([skill, data]) => (
                  <div key={skill} style={{ padding: '24px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#303030', fontSize: '16px' }}>{skill}</span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {data.correct}/{data.total} ({((data.correct / data.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', borderRadius: '8px', height: '12px', background: '#e0e0e0' }}>
                      <div style={{ height: '12px', borderRadius: '8px', width: `${(data.correct / data.total) * 100}%`, background: '#34a853' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: '#252525' }}>
              Review Last 10 Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Array.from({ length: QUESTIONS_PER_BATCH }, (_, i) => {
                const qIndex = quizState.currentQuestionIndex - QUESTIONS_PER_BATCH + i;
                if (qIndex < 0 || qIndex >= questions.length) return null;
                const q = questions[qIndex];
                const userAnswer = quizState.answers[qIndex];
                const isCorrect = userAnswer === q.correctAnswer;
                return (
                  <div key={q.id} style={{ padding: '24px', borderRadius: '12px', background: '#ffffff', border: `1px solid ${isCorrect ? '#34a853' : '#ea4335'}`, borderLeft: `4px solid ${isCorrect ? '#34a853' : '#ea4335'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#555' }}>Q{qIndex + 1}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: isCorrect ? '#1a7431' : '#c5221f', background: isCorrect ? '#e6f4ea' : '#fce8e6', padding: '4px 12px', borderRadius: '16px' }}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <div style={{ fontSize: '15px', lineHeight: '1.5', color: '#303030', marginBottom: '12px' }}>
                      {q.question}
                    </div>
                    <div style={{ fontSize: '14px', color: '#555', marginBottom: '4px' }}>
                      Your answer: <span style={{ fontWeight: 600, color: isCorrect ? '#1a7431' : '#c5221f' }}>{userAnswer}</span>
                    </div>
                    {!isCorrect && (
                      <div style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>
                        Correct answer: <span style={{ fontWeight: 600, color: '#1a7431' }}>{q.correctAnswer}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                      {q.rationale}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={continueFromAnalytics}
              style={{ padding: '18px 64px', background: '#365bd8', color: '#ffffff', fontWeight: 700, fontSize: '20px', borderRadius: '32px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}
            >
              Continue Quiz
            </button>
          </div>
          </div>
        </main>
      </div>
    );
  }

  if (quizCompleted) {
    const analytics = calculateAnalytics();
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}>
        <div style={{ textAlign: 'center', padding: '60px', borderRadius: '16px', background: '#ffffff', maxWidth: '600px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '32px', color: '#252525' }}>
            Quiz Completed!
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
            <div style={{ padding: '32px', borderRadius: '12px', background: '#e6f4ea' }}>
              <div style={{ fontSize: '56px', fontWeight: 700, color: '#252525' }}>
                {analytics.correctAnswers}
              </div>
              <div style={{ fontSize: '18px', color: '#555' }}>Correct</div>
            </div>
            <div style={{ padding: '32px', borderRadius: '12px', background: '#eaf2fb' }}>
              <div style={{ fontSize: '56px', fontWeight: 700, color: '#252525' }}>
                {analytics.accuracy.toFixed(1)}%
              </div>
              <div style={{ fontSize: '18px', color: '#555' }}>Accuracy</div>
            </div>
          </div>
          <button
            onClick={() => {
              setQuizStarted(false);
              setQuizCompleted(false);
              setQuizState({
                currentQuestionIndex: 0,
                answers: {},
                score: 0,
                startTime: Date.now(),
                questionTimes: {},
              });
            }}
            style={{ padding: '18px 64px', background: '#365bd8', color: '#ffffff', fontWeight: 700, fontSize: '20px', borderRadius: '32px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}
          >
            Start New Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[quizState.currentQuestionIndex];
  if (!currentQuestion) return null;

  const progress = ((quizState.currentQuestionIndex) / questions.length) * 100;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}>
      {/* Header */}
      <header style={{ height: '72px', background: '#eaf2fb', borderBottom: '1px solid #cfd6df', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#252525' }}>
            Section 1: Reading and Writing
          </div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '2px', fontWeight: 500 }}>
            Directions
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#303030' }}>
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>
            {quizState.currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
      </header>



      {/* Progress Bar */}
      <div style={{ height: '4px', background: '#e0e0e0', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#365bd8', transition: 'width 0.3s' }} />
      </div>

      {/* Main Content - Split Screen */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Question Content */}
        <section style={{ flex: 1, overflow: 'auto', padding: '32px 40px', borderRight: '3px solid #8a8a8a' }}>
          <div style={{ fontSize: '17px', lineHeight: '1.55', color: '#303030', whiteSpace: 'pre-wrap' }}>
            {currentQuestion.question}
          </div>
        </section>

        {/* Right Panel - Answer Choices */}
        <section style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
          {/* Question Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', background: '#252525', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '16px', fontWeight: 700 }}>
              {quizState.currentQuestionIndex + 1}
            </div>
            <span style={{ fontSize: '13px', color: '#444' }}>
              Mark for Review
            </span>
          </div>

          {/* Separator */}
          <div style={{ borderTop: '2px dashed #333', marginBottom: '20px' }} />

          {/* Question Prompt */}
          <p style={{ marginBottom: '20px', fontSize: '14px', lineHeight: '1.4', color: '#303030' }}>
            Which choice completes the text with the most logical and precise word or phrase?
          </p>

          {/* Answer Choices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(currentQuestion.choices).map(([letter, choice]) => {
              const isSelected = selectedAnswer === letter;
              const isCorrect = currentQuestion.correctAnswer === letter;
              const showCorrectHighlight = showFeedback && isCorrect;
              const showIncorrectHighlight = showFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={letter}
                  onClick={() => handleAnswerSelect(letter)}
                  disabled={showFeedback}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '44px',
                    background: showCorrectHighlight ? '#e6f4ea' : showIncorrectHighlight ? '#fce8e6' : '#ffffff',
                    border: `1px solid ${showCorrectHighlight ? '#34a853' : showIncorrectHighlight ? '#ea4335' : isSelected ? '#365bd8' : '#b8b8b8'}`,
                    borderRadius: '10px',
                    padding: '10px 16px',
                    cursor: showFeedback ? 'default' : 'pointer',
                    opacity: showFeedback && !showCorrectHighlight && !showIncorrectHighlight ? 0.6 : 1,
                    fontFamily: 'var(--font-noto-serif), Georgia, serif',
                  }}
                >
                  {/* Letter Circle */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      border: `2px solid ${showCorrectHighlight ? '#34a853' : showIncorrectHighlight ? '#ea4335' : isSelected ? '#365bd8' : '#888'}`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: showCorrectHighlight ? '#34a853' : showIncorrectHighlight ? '#ea4335' : isSelected ? '#365bd8' : '#333',
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </div>

                  {/* Choice Text */}
                  <span style={{ marginLeft: '16px', fontSize: '14px', color: '#303030', lineHeight: '1.3' }}>
                    {choice}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback Section */}
          {showFeedback && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: selectedAnswer === currentQuestion.correctAnswer ? '#e6f4ea' : '#fce8e6', border: `1px solid ${selectedAnswer === currentQuestion.correctAnswer ? '#34a853' : '#ea4335'}` }}>
              <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px', color: selectedAnswer === currentQuestion.correctAnswer ? '#1a7431' : '#c5221f' }}>
                {selectedAnswer === currentQuestion.correctAnswer
                  ? 'Correct!'
                  : `Incorrect. The correct answer is ${currentQuestion.correctAnswer}.`}
              </div>
              <div style={{ color: '#303030', fontSize: '13px', lineHeight: '1.5' }}>
                {currentQuestion.rationale}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            {!showFeedback && selectedAnswer && (
              <button
                onClick={showAnswerFeedback}
                style={{ padding: '10px 24px', background: '#5f6368', color: '#ffffff', fontWeight: 700, fontSize: '13px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}
              >
                Check Answer
              </button>
            )}
            {showFeedback && (
              <button
                onClick={handleNextQuestion}
                style={{ padding: '12px 40px', background: '#365bd8', color: '#ffffff', fontWeight: 700, fontSize: '14px', borderRadius: '24px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-noto-serif), Georgia, serif' }}
              >
                {quizState.currentQuestionIndex + 1 >= questions.length ? 'Finish' : 'Next'}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ height: '56px', background: '#eaf2fb', borderTop: '1px solid #cfd6df', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: '#303030', fontSize: '14px' }}>
          Aditya Kashyap
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: '#252525', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>
          Question {quizState.currentQuestionIndex + 1} of {questions.length}
        </div>

        <div style={{ width: '100px' }} />
      </footer>
    </div>
  );
}
