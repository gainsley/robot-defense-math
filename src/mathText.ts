import { Container, Graphics, Text } from 'pixi.js';

type MathPart =
  | { kind: 'text'; value: string }
  | { kind: 'fraction'; numerator: string; denominator: string };

const MathFont = "Zekton"

export function renderMathText(target: Container, expression: string, maxWidth: number, fontSize: number): void {
  target.removeChildren().forEach((child) => child.destroy());

  const parts = parseMathParts(expression);
  const partViews = parts.map((part) => (part.kind === 'fraction' ? createFraction(part, fontSize) : createText(part.value, fontSize)));
  const gap = 4;
  const totalWidth = partViews.reduce((sum, view, index) => sum + view.width + (index > 0 ? gap : 0), 0);
  const rowHeight = Math.max(...partViews.map((view) => view.height), 1);
  let x = 0;

  partViews.forEach((view, index) => {
    if (index > 0) {
      x += gap;
    }

    view.x = x;
    view.y = (rowHeight - view.height) / 2;
    target.addChild(view);
    x += view.width;
  });

  target.pivot.set(totalWidth / 2, rowHeight / 2);
  target.scale.set(Math.min(1, maxWidth / Math.max(1, totalWidth)));
}

function parseMathParts(expression: string): MathPart[] {
  const parts: MathPart[] = [];
  const pattern = /\\frac\{([^{}]+)\}\{([^{}]+)\}|(\b\d+)\/(\d+\b)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(expression)) !== null) {
    if (match.index > cursor) {
      parts.push({ kind: 'text', value: expression.slice(cursor, match.index) });
    }

    parts.push({
      kind: 'fraction',
      numerator: match[1] ?? match[3],
      denominator: match[2] ?? match[4],
    });
    cursor = pattern.lastIndex;
  }

  if (cursor < expression.length) {
    parts.push({ kind: 'text', value: expression.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: expression }];
}

function createText(value: string, fontSize: number): Text {
  return new Text({
    text: value,
    style: {
      fontFamily: MathFont,
      fontSize,
      fill: 0xb7f9ff,
      fontWeight: '700',
      letterSpacing: 1,
    },
  });
}

function createFraction(part: Extract<MathPart, { kind: 'fraction' }>, fontSize: number): Container {
  const container = new Container();
  const numerator = createText(part.numerator, Math.round(fontSize * 0.78));
  const denominator = createText(part.denominator, Math.round(fontSize * 0.78));
  const bar = new Graphics();
  const width = Math.max(numerator.width, denominator.width) + 10;

  numerator.x = (width - numerator.width) / 2;
  numerator.y = 0;
  bar.rect(0, numerator.height + 3, width, 2).fill(0xb7f9ff);
  denominator.x = (width - denominator.width) / 2;
  denominator.y = numerator.height + 7;

  container.addChild(numerator, bar, denominator);
  return container;
}
