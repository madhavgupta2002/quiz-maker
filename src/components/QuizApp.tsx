import React, { useState } from 'react';
import QuizQuestion from './QuizQuestion';
import QuizStats from './QuizStats';
import { ArrowRight, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { Question } from '../types';

interface QuizAppProps {
  questions: Question[];
  onBack: () => void;
}

const getStatus = (answered: string | null, correct: string, current: boolean) => {
  if (current) return 'current';
  if (answered === null) return 'unanswered';
  if (answered === correct) return 'correct';
  return 'incorrect';
};

const QuizApp: React.FC<QuizAppProps> = ({ questions, onBack }) => {
  const { isDarkMode } = useDarkMode();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<(string | null)[]>(Array(questions.length).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (answer: string) => {
    if (answeredQuestions[currentQuestionIndex] !== null) return;
    const isCorrect = answer === questions[currentQuestionIndex].answer;
    setAnsweredQuestions(prev => {
      const updated = [...prev];
      updated[currentQuestionIndex] = answer;
      return updated;
    });
    setScore(prev => isCorrect ? prev + 1 : prev);
    setShowResult(true);
  };

  const moveQuestion = (direction: 'next' | 'prev') => {
    setCurrentQuestionIndex(idx => {
      const newIndex = direction === 'next'
        ? Math.min(idx + 1, questions.length - 1)
        : Math.max(idx - 1, 0);
      setShowResult(answeredQuestions[newIndex] !== null);
      return newIndex;
    });
  };

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowResult(answeredQuestions[index] !== null);
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnsweredQuestions(Array(questions.length).fill(null));
    setShowResult(false);
    setQuizCompleted(false);
    setScore(0);
  };

  const finishQuiz = () => {
    setQuizCompleted(true);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = answeredQuestions[currentQuestionIndex];

  // Color classes for status
  const getButtonClass = (status: string) => {
    if (status === 'current') return `${isDarkMode ? 'border-blue-400' : 'border-blue-600'} ring-2 ring-blue-400 bg-gray-200 text-blue-700`;
    if (status === 'correct') return `${isDarkMode ? 'bg-green-600 text-white border-green-500' : 'bg-green-400 text-white border-green-500'}`;
    if (status === 'incorrect') return `${isDarkMode ? 'bg-red-600 text-white border-red-500' : 'bg-red-400 text-white border-red-500'}`;
    if (status === 'unanswered') return `${isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-200 text-gray-600 border-gray-300'}`;
    return '';
  };

  if (quizCompleted) {
    return (
      <div className="max-w-5xl mx-auto py-8 w-full">
        <QuizStats score={score} totalQuestions={questions.length} answeredQuestions={answeredQuestions} />
        <div className="flex gap-4 mt-8 mb-8">
          <button onClick={resetQuiz} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
            <RefreshCw size={20} /> Restart Quiz
          </button>
          <button onClick={onBack} className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition flex items-center gap-2">
            <Home size={20} /> Back to Quiz Maker
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
          <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Review Your Answers</h2>
          <div className="space-y-8">
            {questions.map((q, idx) => {
              const userAns = answeredQuestions[idx];
              const isCorrect = userAns === q.answer;
              const wasAttempted = userAns !== null;
              return (
                <div key={idx} className={`p-4 rounded-lg ${isCorrect ? (isDarkMode ? 'bg-green-900/30' : 'bg-green-100') : (wasAttempted ? (isDarkMode ? 'bg-red-900/30' : 'bg-red-100') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-50'))}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-bold text-lg text-indigo-700 dark:text-indigo-300">Q{idx + 1}:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{q.q}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Your answer: </span>
                    {wasAttempted ? (
                      <span className={`font-bold ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {q.options[userAns as keyof typeof q.options] || userAns} {isCorrect ? '(Correct)' : '(Wrong)'}
                      </span>
                    ) : (
                      <span className="text-gray-500">Not answered</span>
                    )}
                  </div>
                  {(!isCorrect || !wasAttempted) && (
                    <div className="mb-2">
                      <span className="font-semibold">Correct answer: </span>
                      <span className="font-bold text-green-700 dark:text-green-300">{q.options[q.answer as keyof typeof q.options]}</span>
                    </div>
                  )}
                  {(!isCorrect || !wasAttempted) && (
                    <div className="mb-2">
                      <span className="font-semibold">Explanation: </span>
                      <span className="text-gray-800 dark:text-gray-200">{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-5xl mx-auto py-8 w-full">
      {/* Main Quiz Content */}
      <main className="flex-1 pr-0 sm:pr-8">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-indigo-600 hover:underline font-semibold">← Back</button>
          <div className="text-lg font-semibold">Question {currentQuestionIndex + 1} / {questions.length}</div>
          <button onClick={finishQuiz} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Finish Quiz</button>
        </div>
        <QuizQuestion
          question={currentQuestion}
          onAnswer={handleAnswer}
          selectedAnswer={selectedAnswer}
          showResult={showResult}
        />
        <div className="flex justify-between mt-8">
          <button
            onClick={() => moveQuestion('prev')}
            disabled={currentQuestionIndex === 0}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${currentQuestionIndex === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            <ArrowLeft size={20} /> Previous
          </button>
          <button
            onClick={() => moveQuestion('next')}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${currentQuestionIndex === questions.length - 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            Next <ArrowRight size={20} />
          </button>
        </div>
      </main>
      {/* Sidebar Navigator on the right */}
      <aside className={`w-32 sm:w-40 md:w-48 flex-shrink-0 pl-4 border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="sticky top-24">
          <h3 className={`text-center font-bold mb-4 ${isDarkMode ? 'text-blue-300' : 'text-indigo-800'}`}>Answer Status</h3>
          <div className="grid grid-cols-5 gap-3 items-center justify-center">
            {questions.map((q, idx) => {
              const status = getStatus(answeredQuestions[idx], q.answer, idx === currentQuestionIndex);
              return (
                <button
                  key={idx}
                  onClick={() => jumpToQuestion(idx)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold border-2 flex items-center justify-center transition text-base sm:text-lg focus:outline-none ${getButtonClass(status)}`}
                  aria-label={`Go to question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default QuizApp;