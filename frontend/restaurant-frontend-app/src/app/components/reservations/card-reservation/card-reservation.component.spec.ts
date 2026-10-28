import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CardReservationComponent } from './card-reservation.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { ReservationStatusCustomer } from '@app/models/reservations/reservation.model';

describe('CardReservationComponent', () => {
  let component: CardReservationComponent;
  let fixture: ComponentFixture<CardReservationComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    await TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: Router, useValue: router },
      ],
      imports: [CardReservationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardReservationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('r', {
      id: 'reservation-1',
      tableId: 'table-1',
      startTime: new Date('2026-10-28T16:00:00Z'),
      endTime: new Date('2026-10-28T17:00:00Z'),
      guestCount: 1,
      status: 0,
      restaurantName: 'Green & Tasty',
      locationAddress: 'Rustaveli Avenue 48',
      waiterId: 'waiter-1',
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows group order navigation when an open group reservation is available', () => {
    fixture.componentRef.setInput('r', {
      id: 'reservation-1',
      tableId: 'table-1',
      startTime: new Date('2026-10-28T16:00:00Z'),
      endTime: new Date('2026-10-28T17:00:00Z'),
      guestCount: 2,
      status: ReservationStatusCustomer.Reserved,
      restaurantName: 'Green & Tasty',
      locationAddress: 'Rustaveli Avenue 48',
      waiterId: 'waiter-1',
      guestInviteLinkAvailable: true,
    });
    fixture.detectChanges();

    const button = [...fixture.nativeElement.querySelectorAll('button')]
      .find((element: HTMLButtonElement) =>
        element.textContent?.trim() === 'View Group Order',
      ) as HTMLButtonElement | undefined;

    expect(button).toBeDefined();
    button?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/reservations',
      'reservation-1',
      'group-order',
    ]);
  });

  it('hides group order navigation when there is no open group reservation', () => {
    expect(fixture.nativeElement.textContent).not.toContain(
      'View Group Order',
    );
  });

  it('passes reservation context without opening the cart when starting a pre-order', () => {
    component.onPreOrder();

    expect(router.navigate).toHaveBeenCalledWith(['/menu'], {
      queryParams: jasmine.objectContaining({
        preOrder: 'true',
        reservationId: 'reservation-1',
      }),
    });
    expect(router.navigate.calls.mostRecent().args[1]?.queryParams?.['openCart'])
      .toBeUndefined();
  });

  it('shows group order navigation for a one-person reservation when a group exists', () => {
    fixture.componentRef.setInput('r', {
      id: 'reservation-1',
      tableId: 'table-1',
      startTime: new Date('2026-10-28T16:00:00Z'),
      endTime: new Date('2026-10-28T17:00:00Z'),
      guestCount: 1,
      status: ReservationStatusCustomer.Reserved,
      restaurantName: 'Green & Tasty',
      locationAddress: 'Rustaveli Avenue 48',
      waiterId: 'waiter-1',
      guestInviteLinkAvailable: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('View Group Order');
  });
});
