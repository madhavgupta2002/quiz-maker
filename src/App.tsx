import React, { useState, useRef } from 'react';
import QuizApp from './components/QuizApp';
import { useDarkMode } from './contexts/DarkModeContext';
import { Question, QuestionType } from './types';

const GEMINI_API_KEY = 'AIzaSyBgnA_BgnoYZY9IJl3LQ_LK1nbCeU18w24'; // <-- Place your Gemini API key here

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'MCQ (Single Correct)',
  msq: 'MSQ (Multiple Correct)',
  truefalse: 'True/False',
  fillblank: 'Fill in the Blanks',
};
const QUESTION_TYPE_SCHEMA: Record<QuestionType, string> = {
  mcq: `{
    "type": "mcq",
    "q": "Question text",
    "options": { "a": "Option A", "b": "Option B", ... },
    "answer": "correct option letter",
    "explanation": "One-sentence explanation."
  }`,
  msq: `{
    "type": "msq",
    "q": "Question text",
    "options": { "a": "Option A", "b": "Option B", ... },
    "answer": ["a", "c"],
    "explanation": "One-sentence explanation."
  }`,
  truefalse: `{
    "type": "truefalse",
    "q": "Question text",
    "options": { "a": "True", "b": "False" },
    "answer": "a",
    "explanation": "One-sentence explanation."
  }`,
  fillblank: `{
    "type": "fillblank",
    "q": "Question with a blank (use ____ for blank)",
    "answer": "correct answer",
    "explanation": "One-sentence explanation."
  }`,
};

function getSchemaForTypes(types: QuestionType[]): string {
  return types.map(t => QUESTION_TYPE_SCHEMA[t]).join(',\n');
}

const AI_PROMPT = (material: string, numQuestions: number, customInstructions: string, types: QuestionType[]) => {
  const typeList = types.map(t => QUESTION_TYPE_LABELS[t]).join(', ');
  return `
You are an expert quiz maker. Based on the following study material, generate ${numQuestions} high-quality, diverse, and challenging questions. Allowed question types: ${typeList}.

For each question, use the following JSON schema (choose the correct type for each question):
[SCHEMA_START]
[
${getSchemaForTypes(types)}
]
[SCHEMA_END]

${customInstructions && customInstructions.trim() ? `\n\nFollow these additional instructions from the user:\n${customInstructions.trim()}\n` : ''}
Return ONLY a JSON array in this format (no extra text):
[START_JSON]
[
  ...
]
[END_JSON]

Material:
${material}
`;
};

const DEFAULT_TYPES: QuestionType[] = ['mcq'];

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
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(DEFAULT_TYPES);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Improved JSON extraction: Try to extract JSON array even if [START_JSON]/[END_JSON] are missing
  function extractJsonFromResponse(text: string): string | null {
    // Try to extract between [START_JSON] and [END_JSON] first
    const start = text.indexOf('[START_JSON]');
    const end = text.indexOf('[END_JSON]');
    if (start !== -1 && end !== -1 && end > start) {
      let jsonStr = text.substring(start + 12, end).trim();
      // Remove all occurrences of ``` and ```json (case-insensitive)
      jsonStr = jsonStr.replace(/```json|```/gi, '');
      return jsonStr.trim();
    }

    // Fallback: Try to find the first JSON array in the text
    // This will match the first [...] block, even if there is text before/after
    const arrayMatch = text.match(/\[\s*{[\s\S]*?}\s*\]/m);
    if (arrayMatch) {
      let jsonStr = arrayMatch[0];
      // Remove all occurrences of ``` and ```json (case-insensitive)
      jsonStr = jsonStr.replace(/```json|```/gi, '');
      return jsonStr.trim();
    }

    // Fallback: Try to find a code block with JSON
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      let jsonStr = codeBlockMatch[1];
      return jsonStr.trim();
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
      const prompt = AI_PROMPT(aiInput, aiNumQuestions, customInstructions, selectedTypes);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`, {
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

      // Try to extract JSON
      const jsonStr = extractJsonFromResponse(text);
      if (!jsonStr) throw new Error('Could not find JSON in AI response.');

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        // Try to fix common JSON issues (e.g., trailing commas)
        // Remove trailing commas before } or ]
        const fixed = jsonStr.replace(/,\s*([}\]])/g, '$1');
        parsed = JSON.parse(fixed);
      }

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

  const handleTypeChange = (type: QuestionType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.length === 1 ? prev : prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100'}`}>
      <nav className={`${isDarkMode ? 'bg-gray-800/70' : 'bg-indigo-50/70'} backdrop-blur-md shadow-md sticky top-0 z-10`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>QuizCraft</span>
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
          <div className="flex gap-4 mb-8 flex-wrap">
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
          <div className="mb-6">
            <label className="font-semibold block mb-2">Question Types:</label>
            <div className="flex flex-wrap gap-4">
              {(['mcq', 'msq', 'truefalse', 'fillblank'] as QuestionType[]).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeChange(type)}
                    className="accent-indigo-600 w-5 h-5"
                  />
                  <span className="font-medium">{QUESTION_TYPE_LABELS[type]}</span>
                </label>
              ))}
            </div>
            <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">
              <b>Note:</b> When entering JSON manually, add a <code>type</code> field to each question (e.g. <code>"type": "mcq"</code>). If omitted, MCQ is assumed. See schema below for each type.
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer underline text-sm">Show JSON schema for selected types</summary>
              <pre className={`mt-2 p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs overflow-x-auto`}>
                {getSchemaForTypes(selectedTypes)}
              </pre>
            </details>
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