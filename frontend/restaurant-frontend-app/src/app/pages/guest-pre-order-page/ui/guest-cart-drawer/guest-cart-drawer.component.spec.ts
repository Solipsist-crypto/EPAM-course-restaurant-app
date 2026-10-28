import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuestCartDrawerComponent } from './guest-cart-drawer.component';

describe('GuestCartDrawerComponent', () => {
  let fixture: ComponentFixture<GuestCartDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestCartDrawerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(GuestCartDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('items', [
      {
        dishId: 'dish-1',
        title: 'Tom Yum',
        price: 220,
        imageUrl: null,
        qty: 2,
      },
    ]);
    fixture.componentRef.setInput('total', 440);
    fixture.detectChanges();
  });

  it('renders the dish name, quantity, extended price, and initial fallback', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Tom Yum');
    expect(element.querySelector('.qty-value')?.textContent?.trim()).toBe('2');
    expect(element.querySelector('.price')?.textContent?.trim()).toBe('$440.00');
    expect(element.querySelector('.img-fallback')?.textContent?.trim()).toBe('T');
  });
});
