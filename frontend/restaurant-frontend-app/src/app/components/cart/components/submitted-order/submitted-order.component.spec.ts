import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';

import { Order } from '@app/models/orders/order.model';
import { ReservationStatus } from '@app/models/reservations/reservation.model';

import { SubmittedOrderComponent } from './submitted-order.component';

describe('SubmittedOrderComponent', () => {
  let component: SubmittedOrderComponent;
  let fixture: ComponentFixture<SubmittedOrderComponent>;

  const order = {
    orderId: 'order-1',
    status: 1,
    reservationId: 'res-1',
    reservationAddress: 'Test Address',
    reservationTime: '2026-09-08T12:15:00Z',
    reservationStatus: ReservationStatus.Reserved,
    orderItems: [
      {
        quantity: 2,
        state: 1,
        dish: {
          id: 'dish-1',
          price: 10,
          allergens: ['eggs'],
        },
      },
      {
        quantity: 1,
        state: 2,
        dish: {
          id: 'dish-2',
          price: 100,
        },
      },
    ],
  } as Order;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmittedOrderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      SubmittedOrderComponent,
    );

    component = fixture.componentInstance;

    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('allergies', ['eggs']);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('⚠️ Contains Eggs');
  });

  it('only displays allergens in the user profile', () => {
    fixture.componentRef.setInput('order', {
      ...order,
      orderItems: [{
        ...order.orderItems[0],
        dish: { ...order.orderItems[0].dish, allergens: ['eggs', 'dairy', 'gluten'] },
      }],
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Contains Eggs');
    expect(text).not.toContain('Contains Dairy');
    expect(text).not.toContain('Contains Gluten');
  });

  it('should emit canceled when cancelOrder is called', () => {
    spyOn(component.canceled, 'emit');

    component.cancelOrder();

    expect(component.canceled.emit).toHaveBeenCalled();
  });

  it('should emit edited when editOrder is called', () => {
    spyOn(component.edited, 'emit');

    component.editOrder();

    expect(component.edited.emit).toHaveBeenCalled();
  });

  it('should exclude rejected items from total price', () => {
    expect(component.totalPrice()).toBe(20);
  });

  it('should disable edit and cancel when the reservation is cancelled', () => {
    fixture.componentRef.setInput('order', {
      ...order,
      reservationStatus: ReservationStatus.Cancelled,
    });
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      '.actions button',
    ) as NodeListOf<HTMLButtonElement>;

    expect(buttons.length).toBe(2);
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[1].disabled).toBeTrue();
  });

  it('should ignore edit and cancel actions for a cancelled reservation', () => {
    fixture.componentRef.setInput('order', {
      ...order,
      reservationStatus: ReservationStatus.Cancelled,
    });
    fixture.detectChanges();
    spyOn(component.canceled, 'emit');
    spyOn(component.edited, 'emit');

    component.cancelOrder();
    component.editOrder();

    expect(component.canceled.emit).not.toHaveBeenCalled();
    expect(component.edited.emit).not.toHaveBeenCalled();
  });
});
