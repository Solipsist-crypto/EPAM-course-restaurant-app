using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Constants;
using APIHandler.Entities;
using APIHandler.Helpers;
using APIHandler.Mappers;
using APIHandler.Repositories.Dishes;
using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace APIHandler.Handlers.Dishes;

public class GetDishesByLocationIdHandler : IApiRequestHandler
{
    private static readonly string LocationsTableName = ResourceNames.LocationsTableName;
    private readonly IDynamoDBContext _dbContext;
    private readonly IDishRepository _dishRepository;

    public GetDishesByLocationIdHandler(IDynamoDBContext dbContext, IDishRepository dishRepository)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _dishRepository = dishRepository ?? throw new ArgumentNullException(nameof(dishRepository));
    }

    public async Task<APIGatewayProxyResponse> HandleRequest(APIGatewayProxyRequest request, ILambdaContext context)
    {
        if (request.PathParameters == null ||
            !request.PathParameters.TryGetValue("id", out var locationId) ||
            string.IsNullOrWhiteSpace(locationId))
        {
            return ResponseBuilder.CreateErrorResponse(400, "No location id was found in request.", context.Logger);
        }

        // getting location
        var location = await _dbContext.LoadAsync<Location>(
            locationId,
            DynamoConfig.LoadConfig(LocationsTableName));

        if (location == null)
        {
            return ResponseBuilder.CreateErrorResponse(
                (int)HttpStatusCode.NotFound,
                $"Location with id '{locationId}' was not found.",
                context.Logger);
        }

        var dishes = await _dishRepository.GetDishesByLocationIdAsync(locationId);
        var dishesListResponse = dishes.Select(DishMapper.ToDishListResponse).ToList();

        return ResponseBuilder.CreateSuccessResponse(dishesListResponse);
    }
}