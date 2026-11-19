import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MenuPageComponent } from './menu-page.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('MenuPageComponent', () => {
  let component: MenuPageComponent;
  let fixture: ComponentFixture<MenuPageComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      imports: [MenuPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuPageComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpTestingController.expectOne('https://test.api/dishes?sortBy=PopularityDescending').flush([]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the owner menu from the reservation location only', () => {
    component.isPreOrderEnabled = true;
    component.preOrderReservationId = 'reservation-1';
    component.preOrderLocationId = 'location-1';
    component.loadDishes();

    httpTestingController.expectOne('https://test.api/locations/location-1/dishes').flush([
      {
        id: 'dish-1',
        name: 'Local dish',
        imageUrl: null,
        price: 12,
        state: 'Available',
        weight: '100g',
        dishType: 'MainCourse',
        description: '',
        calories: '',
        proteins: '',
        carbohydrates: '',
        fats: '',
        vitamins: '',
      },
    ]);

    expect(component.filteredDishes.map((dish) => dish.name)).toEqual(['Local dish']);
    httpTestingController.expectNone('https://test.api/dishes');
  });

  it('resolves the reservation location before requesting the owner menu', () => {
    component.isPreOrderEnabled = true;
    component.preOrderReservationId = 'reservation-2';
    component.loadDishes();

    httpTestingController.expectOne('https://test.api/reservations/reservation-2').flush({
      locationId: 'location-2',
    });
    httpTestingController.expectOne('https://test.api/locations/location-2/dishes').flush([]);

    expect(component.preOrderLocationId).toBe('location-2');
  });

  afterEach(() => {
    httpTestingController.verify();
  });
});
