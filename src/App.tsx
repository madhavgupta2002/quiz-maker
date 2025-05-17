import React, { useState, useRef } from 'react';
import QuizApp from './components/QuizApp';
import { useDarkMode } from './contexts/DarkModeContext';
import { Question } from './types';

const GEMINI_API_KEY = 'AIzaSyBgnA_BgnoYZY9IJl3LQ_LK1nbCeU18w24'; // <-- Place your Gemini API key here

const AI_PROMPT = (material: string, numQuestions: number, customInstructions?: string) => `
You are an expert quiz maker. Based on the following study material, generate ${numQuestions} high-quality, diverse, and challenging multiple-choice questions. Each question should:
- Be clear and unambiguous
- Have 2-5 options (labeled a, b, c, d, ...)
- Have only one correct answer (use the 'answer' field as the option letter)
- Include a one-sentence explanation for the answer

${customInstructions && customInstructions.trim() ? `\n\nFollow these additional instructions from the user:\n${customInstructions.trim()}\n` : ''}
Return ONLY a JSON array in this format (no extra text):
[START_JSON]
[
  {
    "q": "Question text",
    "options": { "a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D" },
    "answer": "correct option letter",
    "explanation": "One-sentence explanation."
  },
  ...
]
[END_JSON]

Material:
${material}
`;

const App: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'ai' | 'json'>('ai');
  // AI mode state
  const [aiInput, setAiInput] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRawResponse, setAiRawResponse] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse JSON between [START_JSON] and [END_JSON]
  function extractJsonFromResponse(text: string): string | null {
    const start = text.indexOf('[START_JSON]');
    const end = text.indexOf('[END_JSON]');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start + 12, end).trim();
    }
    return null;
  }

  const handleCreateQuiz = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array.');
      setQuizQuestions(parsed);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Invalid JSON');
    }
  };

  const handleBackToMaker = () => {
    setQuizQuestions(null);
  };

  // AI Quiz Generation
  const handleGenerateQuizAI = async () => {
    setError('');
    setAiLoading(true);
    setAiRawResponse(null);
    setShowRawResponse(false);
    try {
      const prompt = AI_PROMPT(aiInput, aiNumQuestions, customInstructions);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      // Find the text response
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setAiRawResponse(text);
      const jsonStr = extractJsonFromResponse(text);
      if (!jsonStr) throw new Error('Could not find JSON in AI response.');
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) throw new Error('AI did not return a JSON array.');
      setQuizQuestions(parsed);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to generate quiz.');
    } finally {
      setAiLoading(false);
    }
  };

  // Download current quiz as JSON
  const handleDownloadQuiz = () => {
    if (!quizQuestions) return;
    const blob = new Blob([JSON.stringify(quizQuestions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import quiz from file
  const handleImportQuizClick = () => {
    fileInputRef.current?.click();
  };
  const handleImportQuiz = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Imported file is not a valid quiz JSON array.');
        setQuizQuestions(parsed);
        setError('');
      } catch (err: any) {
        setError('Failed to import quiz: ' + (err.message || 'Invalid file.'));
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = '';
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100'}`}>
      <nav className={`${isDarkMode ? 'bg-gray-800/70' : 'bg-indigo-50/70'} backdrop-blur-md shadow-md sticky top-0 z-10`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Quiz Maker</span>
          <button
            onClick={toggleDarkMode}
            className={`p-2 ${isDarkMode ? 'text-gray-300 hover:text-indigo-300 hover:bg-gray-700' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-100'} transition-all rounded-full`}
            aria-label="Toggle dark mode"
          >
            <span role="img" aria-label="moon">🌙</span>
          </button>
        </div>
      </nav>
      {!quizQuestions ? (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="flex gap-4 mb-8">
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${mode === 'ai' ? 'bg-indigo-600 text-white' : isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setMode('ai')}
            >
              Generate by AI
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${mode === 'json' ? 'bg-indigo-600 text-white' : isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setMode('json')}
            >
              Enter JSON
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-all bg-green-600 text-white`}
              onClick={handleImportQuizClick}
            >
              Import Quiz
            </button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImportQuiz}
            />
          </div>
          {mode === 'ai' && (
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-indigo-900'}`}>Paste your study material or notes</h2>
              <textarea
                className={`w-full h-40 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} mb-4`}
                placeholder="Paste your study material, notes, or raw content here..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
              />
              <div className="flex items-center gap-4 mb-4">
                <label className="font-semibold">Number of Questions:</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className={`w-20 p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  value={aiNumQuestions}
                  onChange={e => setAiNumQuestions(Number(e.target.value))}
                />
              </div>
              <div className="mb-4">
                <label className="font-semibold block mb-1">Custom Instructions (optional):</label>
                <textarea
                  className={`w-full h-20 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="E.g. Only ask conceptual questions, focus on definitions, make all questions true/false, etc."
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                />
              </div>
              <button
                onClick={handleGenerateQuizAI}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={aiLoading || !aiInput.trim()}
              >
                {aiLoading ? 'Generating...' : 'Generate Quiz'}
              </button>
            </div>
          )}
          {mode === 'json' && (
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-indigo-900'}`}>Paste your questions JSON</h2>
              <textarea
                className={`w-full h-64 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} mb-4`}
                placeholder="Paste your questions JSON here..."
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
              />
              <button
                onClick={handleCreateQuiz}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Create Quiz
              </button>
            </div>
          )}
          {error && (
            <div className="text-red-500 mt-4">
              {error}
              {error.includes('Could not find JSON in AI response.') && aiRawResponse && (
                <>
                  <button
                    className="ml-4 px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-600 font-semibold"
                    onClick={() => setShowRawResponse(v => !v)}
                  >
                    {showRawResponse ? 'Hide AI Response' : 'View AI Response'}
                  </button>
                  {showRawResponse && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-96 text-xs whitespace-pre-wrap break-all border border-gray-300 dark:border-gray-700">
                      {aiRawResponse}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-end max-w-5xl mx-auto pt-8 pr-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              onClick={handleDownloadQuiz}
            >
              Download Quiz
            </button>
          </div>
          <QuizApp questions={quizQuestions} onBack={handleBackToMaker} />
        </div>
      )}
    </div>
  );
};

export default App;