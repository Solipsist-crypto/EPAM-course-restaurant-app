using APIHandler.Constants;
using APIHandler.Constants.Orders;
using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Models.GroupReservation;
using APIHandler.Repositories.GroupReservations;
using APIHandler.Repositories.GuestSessions;
using APIHandler.Repositories.Orders;
using APIHandler.Repositories.Reservations;
using APIHandler.Repositories.Tables;
using APIHandler.Services.Auth;
using APIHandler.Services.GroupReservations;
using APIHandler.Services.GuestSessions;
using APIHandler.Services.Locations;
using AutoFixture.Xunit2;
using Moq;

namespace APIHandler.Tests.Services;

public class GroupReservationServiceTests
{
    private readonly Mock<IGroupReservationRepository> _groupReservationRepositoryMock = new();
    private readonly Mock<ITableRepository> _tableRepositoryMock = new();
    private readonly Mock<IReservationRepository> _reservationRepositoryMock = new();
    private readonly Mock<IGuestSessionRepository> _guestSessionRepositoryMock = new();
    private readonly Mock<IOrderRepository> _orderRepositoryMock = new();
    private readonly Mock<IUserService> _userServiceMock = new();
    private readonly Mock<ILocationService> _locationServiceMock = new();
    private readonly Mock<IGuestSessionService> _guestSessionServiceMock = new();

    private readonly GroupReservationService _service;

    public GroupReservationServiceTests()
    {
        _service = new GroupReservationService(
            _groupReservationRepositoryMock.Object,
            _tableRepositoryMock.Object,
            _reservationRepositoryMock.Object,
            _guestSessionRepositoryMock.Object,
            _orderRepositoryMock.Object,
            _userServiceMock.Object,
            _locationServiceMock.Object,
            _guestSessionServiceMock.Object);
    }

    [Theory]
    [AutoData]
    public async Task GetOwnerGuestSessionIdAsync_Owner_ReturnsSessionId(
        Reservation reservation,
        GroupReservation group,
        GuestSession ownerSession)
    {
        const string userId = "reservation-owner";
        reservation.CustomerId = userId;
        group.ReservationId = reservation.Id;
        ownerSession.GroupReservationId = group.GroupReservationId;
        ownerSession.IsOwnerSession = true;
        ownerSession.OwnerUserId = userId;

        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);
        _groupReservationRepositoryMock.Setup(repository => repository.GetByReservationIdAsync(reservation.Id))
            .ReturnsAsync(group);
        _guestSessionRepositoryMock.Setup(repository => repository.GetAllByGroupReservationIdAsync(group.GroupReservationId))
            .ReturnsAsync([ownerSession]);

        var result = await _service.GetOwnerGuestSessionIdAsync(userId, reservation.Id);

        Assert.Equal(ownerSession.Id, result);
    }

    [Theory]
    [AutoData]
    public async Task GetOwnerGuestSessionIdAsync_ReservationNotFound_Throws(Reservation reservation)
    {
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync((Reservation?)null);

        await Assert.ThrowsAsync<ReservationNotFoundException>(
            () => _service.GetOwnerGuestSessionIdAsync("user", reservation.Id));
    }

    [Theory]
    [AutoData]
    public async Task GetOwnerGuestSessionIdAsync_NonOwner_ThrowsForbidden(Reservation reservation)
    {
        reservation.CustomerId = "actual-owner";
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        await Assert.ThrowsAsync<ActionForbiddenException>(
            () => _service.GetOwnerGuestSessionIdAsync("different-user", reservation.Id));
    }

    [Theory]
    [AutoData]
    public async Task CreateGroupReservationAsync_CustomerReservation_CreatesOwnerSession(Reservation reservation)
    {
        reservation.CustomerId = "reservation-owner";
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        GroupReservation? createdGroup = null;
        _groupReservationRepositoryMock.Setup(repository => repository.SaveGroupReservationAsync(It.IsAny<GroupReservation>()))
            .Callback<GroupReservation>(group => createdGroup = group);

        await _service.CreateGroupReservationAsync(reservation.Id, reservation.CustomerId);

        Assert.NotNull(createdGroup);
        _guestSessionServiceMock.Verify(service =>
            service.CreateGroupOwnerSessionAsync(reservation.CustomerId, createdGroup.GroupReservationId), Times.Once);
    }

    [Theory]
    [AutoData]
    public async Task SubmitGroupPreOrderAsync_Owner_ConsolidatesSubmittedDishesAndUpdatesStatuses(
        GroupReservation group,
        Reservation reservation,
        Order order,
        GuestSession submittedSession1,
        GuestSession submittedSession2,
        GuestSession unsubmittedSession)
    {
        const string userId = "reservation-owner";
        group.ReservationId = reservation.Id;
        reservation.CustomerId = userId;
        order.ReservationId = reservation.Id;
        submittedSession1.IsSubmitted = true;
        submittedSession1.Dishes =
        [
            new OrderItem { DishId = "dish-1", Quantity = 1 },
            new OrderItem { DishId = "dish-2", Quantity = 2 }
        ];
        submittedSession2.IsSubmitted = true;
        submittedSession2.Dishes = [new OrderItem { DishId = "dish-1", Quantity = 2 }];
        unsubmittedSession.IsSubmitted = false;
        unsubmittedSession.Dishes = [new OrderItem { DishId = "dish-3", Quantity = 10 }];

        _groupReservationRepositoryMock.Setup(repository => repository.GetGroupReservationByIdAsync(group.GroupReservationId))
            .ReturnsAsync(group);
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);
        _orderRepositoryMock.Setup(repository => repository.GetOrderByReservationIdAsync(reservation.Id))
            .ReturnsAsync(order);
        _guestSessionRepositoryMock.Setup(repository => repository.GetAllByGroupReservationIdAsync(group.GroupReservationId))
            .ReturnsAsync([submittedSession1, submittedSession2, unsubmittedSession]);

        var result = await _service.SubmitGroupPreOrderAsync(userId, group.GroupReservationId, reservation.Id);

        Assert.Equal(
            [new ConsolidatedOrderItemResponse("dish-1", 3), new ConsolidatedOrderItemResponse("dish-2", 2)],
            result);
        Assert.Equal(OrderStatus.SubmittedByCustomer, order.Status);
        Assert.Equal(GroupReservationStatus.Submitted, group.Status);
        Assert.Collection(order.Dishes,
            item => { Assert.Equal("dish-1", item.DishId); Assert.Equal(3, item.Quantity); Assert.Equal(OrderItemState.Pending, item.State); },
            item => { Assert.Equal("dish-2", item.DishId); Assert.Equal(2, item.Quantity); Assert.Equal(OrderItemState.Pending, item.State); });
        _orderRepositoryMock.Verify(repository => repository.SaveOrderAsync(order), Times.Once);
        _groupReservationRepositoryMock.Verify(repository => repository.SaveGroupReservationAsync(group), Times.Once);
    }

    [Theory]
    [AutoData]
    public async Task SubmitGroupPreOrderAsync_GroupReservationNotFound_Throws(
        string groupReservationId,
        Reservation reservation)
    {
        _groupReservationRepositoryMock.Setup(repository => repository.GetGroupReservationByIdAsync(groupReservationId))
            .ReturnsAsync((GroupReservation?)null);

        await Assert.ThrowsAsync<GroupReservationNotFoundException>(
            () => _service.SubmitGroupPreOrderAsync("user", groupReservationId, reservation.Id));
    }

    [Theory]
    [AutoData]
    public async Task SubmitGroupPreOrderAsync_ReservationNotFound_Throws(
        GroupReservation group,
        string reservationId)
    {
        _groupReservationRepositoryMock.Setup(repository => repository.GetGroupReservationByIdAsync(group.GroupReservationId))
            .ReturnsAsync(group);
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservationId))
            .ReturnsAsync((Reservation?)null);

        await Assert.ThrowsAsync<ReservationNotFoundException>(
            () => _service.SubmitGroupPreOrderAsync("user", group.GroupReservationId, reservationId));
    }

    [Theory]
    [AutoData]
    public async Task SubmitGroupPreOrderAsync_NoOrder_ThrowsBadRequest(
        GroupReservation group,
        Reservation reservation)
    {
        group.ReservationId = reservation.Id;
        reservation.CustomerId = "owner";
        _groupReservationRepositoryMock.Setup(repository => repository.GetGroupReservationByIdAsync(group.GroupReservationId))
            .ReturnsAsync(group);
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);
        _orderRepositoryMock.Setup(repository => repository.GetOrderByReservationIdAsync(reservation.Id))
            .ReturnsAsync((Order?)null);

        await Assert.ThrowsAsync<ValidationException>(
            () => _service.SubmitGroupPreOrderAsync("owner", group.GroupReservationId, reservation.Id));
    }

    [Theory]
    [AutoData]
    public async Task SubmitGroupPreOrderAsync_NoSubmittedSessions_ThrowsBadRequest(
        GroupReservation group,
        Reservation reservation,
        Order order,
        GuestSession guestSession)
    {
        ConfigureSubmitRequest(group, reservation, order);
        guestSession.IsSubmitted = false;
        _guestSessionRepositoryMock.Setup(repository => repository.GetAllByGroupReservationIdAsync(group.GroupReservationId))
            .ReturnsAsync([guestSession]);

        await Assert.ThrowsAsync<ValidationException>(
            () => _service.SubmitGroupPreOrderAsync("owner", group.GroupReservationId, reservation.Id));
    }

    [Theory]
    [AutoData]
    public async Task SubmitGroupPreOrderAsync_NoDishes_ThrowsBadRequest(
        GroupReservation group,
        Reservation reservation,
        Order order,
        GuestSession guestSession)
    {
        ConfigureSubmitRequest(group, reservation, order);
        guestSession.IsSubmitted = true;
        guestSession.Dishes = [];
        _guestSessionRepositoryMock.Setup(repository => repository.GetAllByGroupReservationIdAsync(group.GroupReservationId))
            .ReturnsAsync([guestSession]);

        await Assert.ThrowsAsync<ValidationException>(
            () => _service.SubmitGroupPreOrderAsync("owner", group.GroupReservationId, reservation.Id));
    }

    private void ConfigureSubmitRequest(GroupReservation group, Reservation reservation, Order order)
    {
        group.ReservationId = reservation.Id;
        reservation.CustomerId = "owner";
        order.ReservationId = reservation.Id;
        _groupReservationRepositoryMock.Setup(repository => repository.GetGroupReservationByIdAsync(group.GroupReservationId))
            .ReturnsAsync(group);
        _reservationRepositoryMock.Setup(repository => repository.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);
        _orderRepositoryMock.Setup(repository => repository.GetOrderByReservationIdAsync(reservation.Id))
            .ReturnsAsync(order);
    }

    [Theory]
    [AutoData]
    public async Task GetGroupReservationByTokenAsync_ValidInput_ReturnsGroupReservationInfo(
        GroupReservation groupReservation,
        Table table,
        Reservation reservation,
        Location location,
        string expectedUserName)
    {
        groupReservation.ReservationId = reservation.Id;
        groupReservation.Status = GroupReservationStatus.Open;
        reservation.TableId = table.Id;
        table.LocationId = location.Id;

        _groupReservationRepositoryMock
            .Setup(r => r.GetGroupReservationByTokenAsync(groupReservation.ReservationToken))
            .ReturnsAsync(groupReservation);

        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        _guestSessionRepositoryMock
            .Setup(r => r.CountByGroupReservationId(groupReservation.GroupReservationId))
            .ReturnsAsync(0);

        _tableRepositoryMock
            .Setup(r => r.GetTableAsync(table.Id))
            .ReturnsAsync(table);

        _locationServiceMock
            .Setup(s => s.GetLocationByIdAsync(table.LocationId))
            .ReturnsAsync(location);

        _userServiceMock
            .Setup(s => s.GetUserName(reservation.CustomerId!))
            .ReturnsAsync(expectedUserName);

        var result = await _service.GetGroupReservationByTokenAsync(groupReservation.ReservationToken);

        Assert.Equal(groupReservation.GroupReservationId, result.GroupReservationId);
        Assert.Equal(table.LocationId, result.LocationId);
        Assert.Equal(reservation.GuestCount, result.MaxGuestCount);
        Assert.Equal(reservation.StartTime, result.StartTime);
        Assert.Equal(reservation.EndTime, result.EndTime);
        Assert.Equal(table.TableNumber, result.TableNumber);
        Assert.Equal("Green & Tasty", result.RestaurantName);
        Assert.Equal(location.Address, result.LocationAddress);
        Assert.Equal(expectedUserName, result.InviterName);
    }

    [Theory]
    [AutoData]
    public async Task GetGroupReservationByTokenAsync_InvalidToken_ThrowsNotFound(string token)
    {
        _groupReservationRepositoryMock
            .Setup(r => r.GetGroupReservationByTokenAsync(token))
            .ReturnsAsync((GroupReservation?)null);

        await Assert.ThrowsAsync<GroupReservationNotFoundException>(() => _service.GetGroupReservationByTokenAsync(token));
    }

    [Theory]
    [InlineAutoData(GroupReservationStatus.Closed)]
    [InlineAutoData(GroupReservationStatus.Submitted)]
    public async Task GetGroupReservationByTokenAsync_GroupReservationIsNotOpen_ThrowsException(
        GroupReservationStatus status,
        GroupReservation groupReservation)
    {
        groupReservation.Status = status;

        _groupReservationRepositoryMock
            .Setup(r => r.GetGroupReservationByTokenAsync(groupReservation.ReservationToken))
            .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync<GroupReservationExpiredException>(() => _service.GetGroupReservationByTokenAsync(groupReservation.ReservationToken));
    }

    [Theory]
    [AutoData]
    public async Task GetGroupReservationByTokenAsync_WhenGuestCountIsMax_ThrowsGuestLimitExceeded(GroupReservation groupReservation, Reservation reservation)
    {
        groupReservation.Status = GroupReservationStatus.Open;
        groupReservation.ReservationId = reservation.Id;

        _groupReservationRepositoryMock
            .Setup(r => r.GetGroupReservationByTokenAsync(groupReservation.ReservationToken))
            .ReturnsAsync(groupReservation);

        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        _guestSessionRepositoryMock
            .Setup(r => r.CountByGroupReservationId(groupReservation.GroupReservationId))
            .ReturnsAsync(reservation.GuestCount);

        await Assert.ThrowsAsync<GuestLimitExceededException>(() => _service.GetGroupReservationByTokenAsync(groupReservation.ReservationToken));
    }

    [Theory]
    [AutoData]
    public async Task CloseGroupReservationAsync_ValidInput_UpdatesGroupReservationStatus(GroupReservation groupReservation)
    {
        _groupReservationRepositoryMock
            .Setup(r => r.GetByReservationIdAsync(groupReservation.ReservationId))
            .ReturnsAsync(groupReservation);

        GroupReservation? savedGroupReservation = null;
        _groupReservationRepositoryMock
            .Setup(r => r.SaveGroupReservationAsync(It.IsAny<GroupReservation>()))
            .Callback<GroupReservation>(r => savedGroupReservation = r);

        await _service.CloseGroupReservationAsync(groupReservation.ReservationId);

        Assert.NotNull(savedGroupReservation);
        Assert.Equal(GroupReservationStatus.Closed, savedGroupReservation.Status);
    }

    [Theory]
    [AutoData]
    public async Task CloseGroupReservationAsync_GroupReservationNotFound_DoesNotThrowException(string reservationId)
    {
        _groupReservationRepositoryMock
            .Setup(r => r.GetByReservationIdAsync(reservationId))
            .ReturnsAsync((GroupReservation?)null);

        await _service.CloseGroupReservationAsync(reservationId);
    }

    [Theory]
    [AutoData]
    public async Task GetGroupReservationInviteTokenAsync_ValidInput_ReturnsToken(Reservation reservation, GroupReservation groupReservation)
    {
        reservation.Status = ReservationStatus.Reserved;
        reservation.GuestCount = 3;
        groupReservation.ReservationId = reservation.Id;
        groupReservation.Status = GroupReservationStatus.Open;

        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        _groupReservationRepositoryMock
            .Setup(r => r.GetByReservationIdAsync(reservation.Id))
            .ReturnsAsync(groupReservation);

        GetGroupInviteTokenResponse result = await _service.GetGroupReservationInviteTokenAsync(reservation.Id);

        Assert.Equal(groupReservation.ReservationToken, result.Token);
    }

    [Theory]
    [AutoData]
    public async Task GetGroupReservationInviteTokenAsync_InvalidReservationId_ThrowsNotFound(string reservationId)
    {
        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservationId))
            .ReturnsAsync((Reservation?)null);

        await Assert.ThrowsAsync<ReservationNotFoundException>(() => _service.GetGroupReservationInviteTokenAsync(reservationId));
    }

    [Theory]
    [AutoData]
    public async Task GetGroupReservationInviteTokenAsync_OneGuest_ThrowsValidationException(Reservation reservation)
    {
        reservation.Status = ReservationStatus.Reserved;
        reservation.GuestCount = 1;

        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        await Assert.ThrowsAsync<ValidationException>(() => _service.GetGroupReservationInviteTokenAsync(reservation.Id));
    }

    [Theory]
    [InlineAutoData(ReservationStatus.Completed)]
    [InlineAutoData(ReservationStatus.Cancelled)]
    [InlineAutoData(ReservationStatus.InProgress)]
    public async Task GetGroupReservationInviteTokenAsync_StatusIsNotReserved_ThrowsValidationException(ReservationStatus reservationStatus, Reservation reservation)
    {
        reservation.Status = reservationStatus;
        reservation.GuestCount = 1;

        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        await Assert.ThrowsAsync<ValidationException>(() => _service.GetGroupReservationInviteTokenAsync(reservation.Id));
    }

    [Theory]
    [InlineAutoData(GroupReservationStatus.Closed, typeof(GroupReservationExpiredException))]
    [InlineAutoData(GroupReservationStatus.Submitted, typeof(GroupReservationSubmittedException))]
    public async Task GetGroupReservationInviteTokenAsync_GroupStatusIsNotOpen_ThrowsException(GroupReservationStatus status, Type type, Reservation reservation, GroupReservation groupReservation)
    {
        reservation.Status = ReservationStatus.Reserved;
        reservation.GuestCount = 3;
        groupReservation.ReservationId = reservation.Id;
        groupReservation.Status = status;

        _reservationRepositoryMock
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        _groupReservationRepositoryMock
            .Setup(r => r.GetByReservationIdAsync(reservation.Id))
            .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync(type, () => _service.GetGroupReservationInviteTokenAsync(reservation.Id));
    }
}
