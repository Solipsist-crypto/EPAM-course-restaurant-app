import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

import { PreOrdersService } from './pre-orders.service';

describe('PreOrdersService', () => {
  let http: HttpTestingController;
  let service: PreOrdersService;

  const dish = {
    id: 'dish-1',
    name: 'Tom Yum',
    price: 220,
    imageUrl: null,
    state: 'Available',
  } as DishListResponse;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test' },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PreOrdersService);
  });

  afterEach(() => http.verify());

  it('creates an order with reservationId and dishId when no order exists', () => {
    service
      .addDishToPreOrderByReservationId('reservation-1', dish, 1)
      .subscribe();

    http.expectOne('https://api.test/orders').flush([]);

    const request = http.expectOne('https://api.test/orders');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      reservationId: 'reservation-1',
      orderItems: [{ dishId: 'dish-1', quantity: 1 }],
    });
    request.flush({ orderId: 'order-1' });
  });

  it('updates an existing order without mutating its current item list', () => {
    const existingOrder = {
      orderId: 'order-1',
      reservationId: 'reservation-1',
      reservationAddress: 'Test address',
      reservationTime: 'Oct 21, 2026',
      status: 0,
      orderItems: [
        { dish, quantity: 1, state: 0 },
      ],
    };
    const originalItems = [...existingOrder.orderItems];

    service
      .addDishToPreOrderByReservationId('reservation-1', dish, 2)
      .subscribe();

    http
      .expectOne('https://api.test/orders')
      .flush([existingOrder]);

    const request = http.expectOne(
      'https://api.test/orders/reservation-1',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      orderItems: [{ dishId: 'dish-1', quantity: 3 }],
    });
    expect(existingOrder.orderItems).toEqual(originalItems);
    request.flush({ message: 'Pre-order updated successfully.' });
  });
});
