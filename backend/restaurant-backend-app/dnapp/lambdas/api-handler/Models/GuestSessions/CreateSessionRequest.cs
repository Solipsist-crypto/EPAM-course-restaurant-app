using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace APIHandler.Models.GuestSessions;

public record CreateGuestSessionRequest(
    [property: Required] string GroupReservationId, 
    [property: Required] string GuestName,
    [property: JsonPropertyName("allergies")] List<string>? Allergies = null);