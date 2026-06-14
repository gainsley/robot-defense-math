import type { LevelQuestions, Question } from './types';

export const UPGRADES_TO_NEXT_LEVEL = 10;

export const LEVEL_QUESTIONS: LevelQuestions[] = [
  {
    level: 1,
    generators: [genAddSingleDigit, genSubSingleDigit],
  },
  {
    level: 2,
    generators: [genAddSingleDigit, genSubSingleDigit, genAddDoubleDigit, genSubDoubleDigit],
  },
  /*
  {
    level: 2,
    questions: [
      { prompt: 'Fractions', choices: ['\\frac{1}{2} = 0.25', '\\frac{1}{2} = 0.5', '\\frac{1}{2} = 0.75'], correctIndex: 1 },
      { prompt: 'Order', choices: ['6 x 4 = 20', '6 x 4 = 28', '6 x 4 = 24'], correctIndex: 2 },
    ],
  },*/
];

export function getQuestion(level: number): Question {
  let index = Math.min(level, LEVEL_QUESTIONS.length) - 1;
  let levelQuestions = LEVEL_QUESTIONS[index];
  const randomGenerator = Math.floor(Math.random() * levelQuestions.generators.length);
  return levelQuestions.generators[randomGenerator]();
}

export const QUESTION_GENS = {}

function genAddSingleDigit(): Question {
  return genAddSubQ(false, 9);
}

function genSubSingleDigit(): Question {
  return genAddSubQ(true, 9);
}

function genAddDoubleDigit(): Question {
  return genAddSubQ(false, 30);
}

function genSubDoubleDigit(): Question {
  return genAddSubQ(true, 30);
}

function genMult(): Question {
  return genMultDivQ(false, 13);
}

function genDiv(): Question {
  return genMultDivQ(true, 13);
}

function genAddSubQ(subtract: boolean = false, range: number = 10): Question {
  let op1 = Math.floor(Math.random() * range);
  let op2 = Math.floor(Math.random() * range);
  if (op2 > op1) {
    let temp = op1;
    op1 = op2;
    op2 = temp;
  }
  const correctIndex = Math.floor(Math.random() * 3);
  let choices: string[] = [];
  const prompt = subtract ? 'Subtraction' : 'Addition';
  const oper = subtract ? '-' : '+';
  for (let i = 0; i < 3; i += 1) {
    let answer = op1 + op2;
    if (subtract) {
      answer = op1 - op2;
    }
    if (i != correctIndex) {
      // we want to give wrong answers that are +/-3 of the correct
      // answer, but we don't want to go negative.
      let offset = Math.floor(Math.random() * 7) - 3;
      // if offset is 0, we won't get a wrong answer
      offset = offset === 0 ? 1 : offset;
      answer += offset;
    }
    choices.push(`${op1} ${oper} ${op2} = ${answer}`);
  }
  return { prompt, choices, correctIndex };
}

function genMultDivQ(divide: boolean = false, range: number = 13): Question {
  let op1 = Math.floor(Math.random() * range);
  let op2 = Math.floor(Math.random() * range);
  if (divide) {
    op1 = op1 === 0 ? 1 : op1;
    op2 = op2 === 0 ? 1 : op2;
  }
  let correctIndex = Math.floor(Math.random() * 3);
  let mult = op1 * op2;
  let choices: string[] = [];
  let prompt = divide ? 'Division' : 'Multiplication';
  for (let i = 0; i < 3; i += 1) {
    let op2x = op2;
    if (i != correctIndex) {
      op2x = Math.floor(op2 + (Math.random() * 2 - 1));
    }
    if (divide) {
      choices.push(`${mult} / ${op1} = ${op2x}`);
    } else {
      choices.push(`${op1} x ${op2x} = ${mult}`);
    }
  }
  return { prompt, choices, correctIndex };
}
