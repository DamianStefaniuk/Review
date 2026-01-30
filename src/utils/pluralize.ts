type PluralForms = {
  one: string;    // 1 zadanie
  few: string;    // 2-4 zadania
  many: string;   // 0, 5-21 zadań
};

export function pluralize(count: number, forms: PluralForms): string {
  const absCount = Math.abs(count);

  if (absCount === 1) {
    return forms.one;
  }

  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return forms.few;
  }

  return forms.many;
}

export const POLISH_NOUNS = {
  task: { one: 'zadanie', few: 'zadania', many: 'zadań' },
  goal: { one: 'cel główny', few: 'cele główne', many: 'celów głównych' },
  sideGoal: { one: 'cel poboczny', few: 'cele poboczne', many: 'celów pobocznych' },
  sprintGoal: { one: 'cel sprintu', few: 'cele sprintu', many: 'celów sprintu' },
  achievement: { one: 'osiągnięcie', few: 'osiągnięcia', many: 'osiągnięć' },
  comment: { one: 'komentarz', few: 'komentarze', many: 'komentarzy' },
  client: { one: 'klient', few: 'klientów', many: 'klientów' },
  completed: { one: 'ukończony', few: 'ukończone', many: 'ukończonych' },
} as const;

export function pluralizeWithCount(count: number, forms: PluralForms): string {
  return `${count} ${pluralize(count, forms)}`;
}
