import { formatAllergen, matchingAllergens } from './group-dietary-safety';

describe('group dietary safety helpers', () => {
  it('matches allergens case-insensitively without marking safe dishes', () => {
    expect(matchingAllergens(['Dairy', 'peanuts'], ['dairy', 'gluten'])).toEqual(['dairy']);
  });

  it('formats known and unknown allergens for display', () => {
    expect(formatAllergen('seafood')).toBe('Seafood');
    expect(formatAllergen('sesame')).toBe('Sesame');
  });
});
