using APIHandler.Constants.Dishes;
using APIHandler.Models.Dishes;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace APIHandler.Models.GuestSessions;

public record GuestMenuResponse(
    Dictionary<DishType, IEnumerable<GuestMenuDish>> Dishes,
    [property: JsonPropertyName("allergies")] IEnumerable<string> Allergies);