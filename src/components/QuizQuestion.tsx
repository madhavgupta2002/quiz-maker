import React, { useState } from 'react';
import { Question, QuestionType } from '../types';
import { CheckCircle, XCircle } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface QuizQuestionProps {
  question: Question;
  onAnswer: (answer: string | string[]) => void;
  selectedAnswer: string | string[] | null;
  showResult: boolean;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswer,
  selectedAnswer,
  showResult,
}) => {
  const { isDarkMode } = useDarkMode();
  const [msqSelection, setMsqSelection] = useState<string[]>([]);
  const [fillInput, setFillInput] = useState('');

  const type: QuestionType = question.type || 'mcq';

  // For MCQ/TrueFalse
  const getButtonClass = (option: string) => {
    let baseClass = "w-full p-4 rounded-lg font-semibold text-left transition duration-300 ease-in-out transform hover:scale-105 ";
    if (!showResult) {
      return baseClass + (isDarkMode
        ? "bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700"
        : "bg-white text-indigo-700 hover:bg-indigo-100");
    }
    if (type === 'mcq' || type === 'truefalse') {
      if (option === question.answer) {
        return baseClass + (isDarkMode
          ? "bg-green-700 text-gray-100"
          : "bg-green-500 text-white");
      }
      if (option === selectedAnswer && option !== question.answer) {
        return baseClass + (isDarkMode
          ? "bg-red-700 text-gray-100"
          : "bg-red-500 text-white");
      }
      return baseClass + (isDarkMode
        ? "bg-gray-700 text-gray-400"
        : "bg-gray-200 text-gray-700");
    }
    // For MSQ, handled below
    return baseClass;
  };

  // For MSQ
  const getMsqOptionClass = (option: string) => {
    let baseClass = "w-full p-4 rounded-lg font-semibold text-left transition duration-300 ease-in-out transform hover:scale-105 flex items-center ";
    if (!showResult) {
      return baseClass + (msqSelection.includes(option)
        ? (isDarkMode ? "bg-indigo-700 text-white border border-indigo-400" : "bg-indigo-200 text-indigo-900 border border-indigo-400")
        : (isDarkMode ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-white text-indigo-700 border border-gray-300"));
    }
    // After submit, show correct/incorrect
    const correctAnswers = Array.isArray(question.answer) ? question.answer : [];
    if (correctAnswers.includes(option)) {
      return baseClass + (isDarkMode ? "bg-green-700 text-gray-100" : "bg-green-500 text-white");
    }
    if (msqSelection.includes(option) && !correctAnswers.includes(option)) {
      return baseClass + (isDarkMode ? "bg-red-700 text-gray-100" : "bg-red-500 text-white");
    }
    return baseClass + (isDarkMode ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-700");
  };

  const formatText = (text: string) => {
    return text.replace(/\n/g, '\n');
  };

  // MSQ submit handler
  const handleMsqSubmit = () => {
    if (!showResult) {
      onAnswer([...msqSelection].sort());
    }
  };

  // Fill in the blank submit handler
  const handleFillSubmit = () => {
    if (!showResult) {
      onAnswer(fillInput.trim());
    }
  };

  // For MSQ, keep selection in sync with selectedAnswer if already answered
  React.useEffect(() => {
    if (type === 'msq' && showResult && Array.isArray(selectedAnswer)) {
      setMsqSelection(selectedAnswer as string[]);
    }
  }, [showResult, selectedAnswer, type]);

  // For Fill in the Blank, set input if already answered
  React.useEffect(() => {
    if (type === 'fillblank' && showResult && typeof selectedAnswer === 'string') {
      setFillInput(selectedAnswer);
    }
  }, [showResult, selectedAnswer, type]);

  // Helper for fillblank correctness
  const isFillCorrect = () => {
    if (type !== 'fillblank' || !showResult) return null;
    if (typeof question.answer !== 'string') return null;
    return fillInput.trim().toLowerCase() === question.answer.trim().toLowerCase();
  };

  // Clear selection/input when question changes and not submitted
  React.useEffect(() => {
    if (!showResult) {
      setMsqSelection([]);
      setFillInput('');
    }
    // eslint-disable-next-line
  }, [question.q]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className={`text-2xl font-bold mb-6 whitespace-pre-line ${isDarkMode ? 'text-gray-100' : 'text-indigo-900'}`}>{formatText(question.q)}</h2>
      {/* MCQ / TrueFalse */}
      {(type === 'mcq' || type === 'truefalse') && question.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(question.options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => !showResult && onAnswer(key)}
              className={getButtonClass(key)}
              disabled={showResult}
            >
              <span className="flex items-center">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-indigo-200 text-indigo-700'}`}>{key.toUpperCase()}</span>
                <span className="whitespace-pre-line">{formatText(value || key)}</span>
              </span>
              {showResult && key === question.answer && (
                <CheckCircle className={`inline-block ml-2 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`} size={24} />
              )}
              {showResult && key === selectedAnswer && key !== question.answer && (
                <XCircle className={`inline-block ml-2 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`} size={24} />
              )}
            </button>
          ))}
        </div>
      )}
      {/* MSQ */}
      {type === 'msq' && question.options && (
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={e => { e.preventDefault(); handleMsqSubmit(); }}
        >
          {Object.entries(question.options).map(([key, value]) => (
            <label key={key} className={getMsqOptionClass(key)}>
              <input
                type="checkbox"
                className="mr-3 accent-indigo-600 w-5 h-5"
                checked={msqSelection.includes(key)}
                disabled={showResult}
                onChange={() => {
                  if (showResult) return;
                  setMsqSelection(sel =>
                    sel.includes(key)
                      ? sel.filter(k => k !== key)
                      : [...sel, key]
                  );
                }}
              />
              <span className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-indigo-200 text-indigo-700">{key.toUpperCase()}</span>
              <span className="whitespace-pre-line">{formatText(value || key)}</span>
            </label>
          ))}
          <div className="col-span-2 flex justify-end mt-4">
            {!showResult && (
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={msqSelection.length === 0}
              >
                Submit
              </button>
            )}
          </div>
        </form>
      )}
      {/* Fill in the Blanks */}
      {type === 'fillblank' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={e => { e.preventDefault(); handleFillSubmit(); }}
        >
          <input
            type="text"
            className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            placeholder="Type your answer..."
            value={fillInput}
            onChange={e => setFillInput(e.target.value)}
            disabled={showResult}
          />
          <div className="flex justify-end">
            {!showResult && (
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={!fillInput.trim()}
              >
                Submit
              </button>
            )}
          </div>
          {/* Show correct/incorrect after submit */}
          {showResult && (
            <div className="flex items-center gap-2 mt-2">
              {isFillCorrect() ? (
                <>
                  <CheckCircle className={`text-green-500`} size={24} />
                  <span className="text-green-600 font-bold">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className={`text-red-500`} size={24} />
                  <span className="text-red-600 font-bold">Wrong!</span>
                </>
              )}
            </div>
          )}
        </form>
      )}
      {showResult && (
        <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-blue-800'}`}>Explanation:</h3>
          <p className={isDarkMode ? 'text-gray-300' : 'text-blue-700'}>{formatText(question.explanation)}</p>
        </div>
      )}
    </div>
  );
};

export default QuizQuestion;