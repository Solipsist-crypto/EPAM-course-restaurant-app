import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';

import { Order } from '@app/models/orders/order.model';
import { ReservationStatus } from '@app/models/reservations/reservation.model';

import { NotSubmittedOrderComponent } from './not-submitted-order.component';

describe('NotSubmittedOrderComponent', () => {
  let component: NotSubmittedOrderComponent;
  let fixture: ComponentFixture<NotSubmittedOrderComponent>;

  const order = {
    orderId: 'order-1',
    status: 0,
    reservationId: 'res-1',
    reservationAddress: 'Test address',
    reservationTime: '2026-09-07T12:15:00Z',
    reservationStatus: ReservationStatus.Reserved,
    orderItems: [
      {
        quantity: 2,
        dish: {
          id: 'dish-1',
          price: 10,
        },
      },
    ],
  } as Order;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotSubmittedOrderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      NotSubmittedOrderComponent,
    );

    component = fixture.componentInstance;

    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitted with the order ID', () => {
    spyOn(component.submitted, 'emit');

    component.submit();

    expect(
      component.submitted.emit,
    ).toHaveBeenCalledWith('order-1');
  });

  it('should calculate the total price', () => {
    expect(component.totalPrice()).toBe(20);
  });

  it('should emit quantity and add-dish actions from the cart controls', () => {
    spyOn(component.updateQuantity, 'emit');
    spyOn(component.addDish, 'emit');

    component.incrementItemQuantity('dish-1');
    component.decrementItemQuantity('dish-1');
    component.addDishToOrder();

    expect(component.updateQuantity.emit).toHaveBeenCalledWith({
      itemId: 'dish-1',
      quantity: 3,
    });
    expect(component.updateQuantity.emit).toHaveBeenCalledWith({
      itemId: 'dish-1',
      quantity: 1,
    });
    expect(component.addDish.emit).toHaveBeenCalled();
  });

  it('should not submit or modify a cancelled reservation order', () => {
    fixture.componentRef.setInput('order', {
      ...order,
      reservationStatus: ReservationStatus.Cancelled,
    });
    fixture.detectChanges();
    spyOn(component.submitted, 'emit');

    component.submit();

    expect(component.submitted.emit).not.toHaveBeenCalled();
  });
});
