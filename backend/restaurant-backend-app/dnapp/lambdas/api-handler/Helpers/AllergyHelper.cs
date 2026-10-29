using APIHandler.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace APIHandler.Helpers;

public static class AllergyHelper
{
    private const int MaxSerializedLength = 2048;

    public static List<string> Normalize(IEnumerable<string>? allergies)
    {
        var normalized = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var allergy in allergies ?? [])
        {
            if (string.IsNullOrWhiteSpace(allergy))
                throw new ValidationException("Allergies must not contain empty values.");

            var value = allergy.Trim().ToLowerInvariant();
            if (seen.Add(value))
                normalized.Add(value);
        }

        if (JsonSerializer.Serialize(normalized).Length > MaxSerializedLength)
            throw new ValidationException($"The allergies list must not exceed {MaxSerializedLength} characters.");

        return normalized;
    }

    public static List<string> Parse(string? serializedAllergies)
    {
        if (string.IsNullOrWhiteSpace(serializedAllergies))
            return [];

        return Normalize(JsonSerializer.Deserialize<List<string>>(serializedAllergies));
    }

    public static bool HasConflict(IEnumerable<string> allergies, IEnumerable<string>? allergens)
    {
        var allergySet = new HashSet<string>(allergies, StringComparer.OrdinalIgnoreCase);
        return allergens?.Any(allergen =>
            !string.IsNullOrWhiteSpace(allergen) && allergySet.Contains(allergen.Trim())) ?? false;
    }
}
