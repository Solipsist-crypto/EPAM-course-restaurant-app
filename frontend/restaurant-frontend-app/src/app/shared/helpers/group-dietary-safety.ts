export function matchingAllergens(
  allergies: readonly string[] = [],
  allergens: readonly string[] = []
): string[] {
  const allergySet = new Set(allergies.map((allergy) => allergy.trim().toLowerCase()));
  return allergens.filter((allergen) => allergySet.has(allergen.trim().toLowerCase()));
}

export function formatAllergen(allergen: string): string {
  const labels: Record<string, string> = {
    eggs: 'Eggs',
    peanuts: 'Peanuts',
    soy: 'Soy',
    seafood: 'Seafood',
    berries: 'Berries',
    dairy: 'Dairy',
    gluten: 'Gluten',
  };
  const normalized = allergen.trim().toLowerCase();
  return labels[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
