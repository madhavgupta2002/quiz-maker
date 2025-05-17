export type QuestionType = 'mcq' | 'msq' | 'truefalse' | 'fillblank';

export interface Option {
  a: string;
  b: string;
  c?: string;
  d?: string;
  e?: string;
  f?: string;
  [key: string]: string | undefined; // allow dynamic access
}

export interface Question {
  type?: QuestionType; // default 'mcq'
  q: string;
  options?: Option; // not required for fillblank
  answer: string | string[]; // string for mcq/truefalse/fillblank, string[] for msq
  explanation: string;
  year?: number;
  selectedAnswer?: string | string[];
}

export interface Assignment {
  [key: string]: {
    [key: string]: Question[];
  };
}

export type PracticeMode = 'assignment' | 'full';
export type QuestionOrder = 'random' | 'inOrder';

export interface QuizState {
  practiceMode: PracticeMode;
  questionOrder: QuestionOrder;
  currentAssignment: string;
  currentQuestionIndex: number;
  score: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  showResult: boolean;
  questions: Question[];
  incorrectAnswers: Question[];
  answeredQuestions: (string | null)[];
}