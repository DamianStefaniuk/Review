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
  task: { one: 'zadanie', few: 'zadania', many: 'zadan' },
  goal: { one: 'cel', few: 'cele', many: 'celow' },
  sideGoal: { one: 'cel poboczny', few: 'cele poboczne', many: 'celow pobocznych' },
  achievement: { one: 'osiagniecie', few: 'osiagniecia', many: 'osiagniec' },
  comment: { one: 'komentarz', few: 'komentarze', many: 'komentarzy' },
  client: { one: 'klient', few: 'klientow', many: 'klientow' },
  completed: { one: 'ukonczony', few: 'ukonczone', many: 'ukonczonych' },
} as const;

export function pluralizeWithCount(count: number, forms: PluralForms): string {
  return `${count} ${pluralize(count, forms)}`;
}
