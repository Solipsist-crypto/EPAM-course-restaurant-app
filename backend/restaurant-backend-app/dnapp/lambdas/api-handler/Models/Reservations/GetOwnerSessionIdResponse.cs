using System.Text.Json.Serialization;

namespace APIHandler.Models.Reservations;

public record GetOwnerSessionIdResponse(
    [property: JsonPropertyName("guestSessionId")] string GuestSessionId);
