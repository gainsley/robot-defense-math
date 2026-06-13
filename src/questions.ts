import type { LevelQuestions } from './types';

export const LEVEL_QUESTIONS: LevelQuestions[] = [
  {
    level: 1,
    questions: [
      { prompt: 'Addition', choices: ['2 + 3 = 5', '2 + 3 = 6', '2 + 3 = 4'], correctIndex: 0 },
      { prompt: 'Multiplication', choices: ['4 x 3 = 9', '4 x 3 = 12', '4 x 3 = 14'], correctIndex: 1 },
      { prompt: 'Subtraction', choices: ['10 - 4 = 8', '10 - 4 = 5', '10 - 4 = 6'], correctIndex: 2 },
      { prompt: 'Division', choices: ['18 / 3 = 6', '18 / 3 = 7', '18 / 3 = 9'], correctIndex: 0 },
    ],
  },
  {
    level: 2,
    questions: [
      { prompt: 'Fractions', choices: ['\\frac{1}{2} = 0.25', '\\frac{1}{2} = 0.5', '\\frac{1}{2} = 0.75'], correctIndex: 1 },
      { prompt: 'Order', choices: ['6 x 4 = 20', '6 x 4 = 28', '6 x 4 = 24'], correctIndex: 2 },
    ],
  },
];
