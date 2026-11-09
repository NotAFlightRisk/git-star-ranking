/** The three biggest languages get a colour each, and the rest share grey */
export function tones(languages: { language: string | null }[]) {
  const named = languages.flatMap(({ language }) => (language ? [language] : [])).slice(0, 3);
  return (language: string | null) => {
    const slot = language ? named.indexOf(language) : -1;
    return slot < 0 ? 'var(--series-other)' : `var(--series-${slot + 1})`;
  };
}
