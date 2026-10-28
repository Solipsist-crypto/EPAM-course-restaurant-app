import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { Order } from '@app/models/orders/order.model';
import {
  Reservation,
  ReservationStatus,
} from '@app/models/reservations/reservation.model';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { ReservationService } from '@app/services/reservation/reservation.service';

import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;

  let preOrdersServiceMock: jasmine.SpyObj<PreOrdersService>;
  let reservationServiceMock: jasmine.SpyObj<ReservationService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    preOrdersServiceMock =
      jasmine.createSpyObj<PreOrdersService>(
        'PreOrdersService',
        [
          'getPreOrders',
          'cancelPreOrderByReservationId',
          'unsubmitPreOrderByReservationId',
          'submitPreOrderByReservationId',
          'editPreOrderByReservationId',
        ],
      );

    routerMock = jasmine.createSpyObj<Router>(
      'Router',
      ['navigate'],
    );
    reservationServiceMock =
      jasmine.createSpyObj<ReservationService>(
        'ReservationService',
        ['getReservationsForUser$'],
      );

    preOrdersServiceMock.getPreOrders.and.returnValue(of([]));
    reservationServiceMock.getReservationsForUser$.and.returnValue(
      of([]),
    );

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        {
          provide: PreOrdersService,
          useValue: preOrdersServiceMock,
        },
        {
          provide: Router,
          useValue: routerMock,
        },
        {
          provide: ReservationService,
          useValue: reservationServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit closeCartEvent when closeCart is called', () => {
    spyOn(component.closeCartEvent, 'emit');

    component.closeCart();

    expect(
      component.closeCartEvent.emit,
    ).toHaveBeenCalled();
  });

  it('should return submitted orders with statuses 1 and 3', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        status: 1,
      },
      {
        orderId: 'order-2',
        status: 2,
      },
      {
        orderId: 'order-3',
        status: 3,
      },
      {
        orderId: 'order-4',
        status: 0,
      },
    ] as Order[]);

    expect(
      component
        .submittedOrders()
        .map((order) => order.status),
    ).toEqual([1, 3]);
  });

  it('should return unsubmitted orders with status 0', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        status: 0,
      },
      {
        orderId: 'order-2',
        status: 1,
      },
      {
        orderId: 'order-3',
        status: 3,
      },
    ] as Order[]);

    expect(
      component
        .unsubmittedOrders()
        .map((order) => order.status),
    ).toEqual([0]);
  });

  it('shows the submitted confirmation modal after the owner submits a pre-order', () => {
    const order = {
      orderId: 'order-1',
      reservationId: 'reservation-1',
      reservationStatus: ReservationStatus.Reserved,
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Oct 21, 2026',
      status: 1,
      orderItems: [],
    } as Order;
    component.orders.set([order]);
    preOrdersServiceMock.submitPreOrderByReservationId.and.returnValue(of({}));
    preOrdersServiceMock.getPreOrders.and.returnValue(of([order]));
    reservationServiceMock.getReservationsForUser$.and.returnValue(
      of([{ id: 'reservation-1', status: ReservationStatus.Reserved }] as Reservation[]),
    );

    component.submitOrder('order-1');
    fixture.detectChanges();

    expect(preOrdersServiceMock.submitPreOrderByReservationId)
      .toHaveBeenCalledOnceWith('reservation-1');
    expect(fixture.nativeElement.querySelector('app-submit-order-modal'))
      .not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pre-order Submitted!');
  });

  it('should navigate to reservations when goToReservations is called', () => {
    component.goToReservations();

    expect(routerMock.navigate).toHaveBeenCalledWith([
      '/reservations',
    ]);
  });

  it('should open the menu for the selected order reservation', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        reservationId: 'reservation-1',
        reservationAddress: 'Rustaveli Avenue 48',
        reservationTime: 'Oct 21, 2026, 6:00 PM - 7:00 PM',
        orderItems: [],
        status: 0,
        reservationStatus: ReservationStatus.Reserved,
      },
    ]);

    component.addDishToOrder('order-1');

    expect(routerMock.navigate).toHaveBeenCalledWith(
      ['/menu'],
      {
        queryParams: {
          preOrder: 'true',
          reservationId: 'reservation-1',
          reservationLabel:
            'Rustaveli Avenue 48, Oct 21, 2026, 6:00 PM - 7:00 PM',
        },
      },
    );
  });

  it('should persist the quantity emitted by the cart controls', () => {
    const order: Order = {
      orderId: 'order-1',
      reservationId: 'reservation-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Oct 21, 2026',
      orderItems: [
        {
          dish: {
            id: 'dish-1',
            name: 'Tom Yum',
            price: 220,
            imageUrl: null,
            state: 'Available',
          } as DishListResponse,
          quantity: 1,
          state: 0,
        },
      ],
      status: 0,
      reservationStatus: ReservationStatus.Reserved,
    };
    preOrdersServiceMock.editPreOrderByReservationId.and.returnValue(
      of({}),
    );
    component.orders.set([order]);

    component.updateDishQuantity('order-1', 'dish-1', 2);

    expect(
      preOrdersServiceMock.editPreOrderByReservationId,
    ).toHaveBeenCalledWith(
      'reservation-1',
      jasmine.objectContaining({
        orderItems: [
          jasmine.objectContaining({
            dish: jasmine.objectContaining({ id: 'dish-1' }),
            quantity: 2,
          }),
        ],
      }),
    );
  });

  it('should attach the live reservation status to each order', () => {
    preOrdersServiceMock.getPreOrders.and.returnValue(
      of([
        {
          orderId: 'order-1',
          reservationId: 'reservation-1',
          reservationAddress: 'Test address',
          reservationTime: 'Oct 21, 2026',
          orderItems: [],
          status: 1,
        },
      ] as Order[]),
    );
    reservationServiceMock.getReservationsForUser$.and.returnValue(
      of([
        {
          id: 'reservation-1',
          status: ReservationStatus.Cancelled,
        } as Reservation,
      ]),
    );

    component.ngOnInit();

    expect(component.orders()[0].reservationStatus).toBe(
      ReservationStatus.Cancelled,
    );
  });
});
