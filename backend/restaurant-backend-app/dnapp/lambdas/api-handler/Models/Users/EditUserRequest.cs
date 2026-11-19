using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace APIHandler.Models.Users;

public class EditUserRequest
{
    [JsonPropertyName("firstName")]
    public required string FirstName { get; set; }

    [JsonPropertyName("lastName")]
    public required string LastName { get; set; }

    [JsonPropertyName("allergies")]
    public List<string>? Allergies { get; set; }
}