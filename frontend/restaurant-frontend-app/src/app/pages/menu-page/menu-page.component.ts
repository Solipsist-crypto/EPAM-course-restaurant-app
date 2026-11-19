import { HttpErrorResponse } from '@angular/common/http';
import {Component, OnInit, ChangeDetectionStrategy, computed, inject} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { DishCardComponent } from '@app/shared/custom-components/dish-card/dish-card.component';
import { DishesService } from '@app/services/dishes/dishes.service';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { MainCoverImageComponent } from '@app/shared/custom-components/main-cover-image/main-cover-image.component';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DishSort } from '@app/models/enums/dish-sort.model';
import { DishType } from '@app/models/enums/dish-type.model';
import { DishSortingLabels, DishTypeLabels } from '@app/shared/mappers/dish-enum.mapper';
import { DishModalComponent } from '@app/components/dish-modal/dish-modal.component';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import {ToastService} from '@app/services/toast/toast.service';
import { ReservationService } from '@app/services/reservation/reservation.service';
import { formatAllergen, matchingAllergens } from '@app/shared/helpers/group-dietary-safety';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [
    RouterModule,
    DishCardComponent,
    MainCoverImageComponent,
    DishModalComponent
  ],
  templateUrl: './menu-page.component.html',
  styleUrl: './menu-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [DishesService],
})
export class MenuPageComponent implements OnInit {
  private toast = inject(ToastService);
  dishes: DishListResponse[] = [];
  filteredDishes: DishListResponse[] = [];

  isPreOrderEnabled = false;
  preOrderReservationId?: string;
  preOrderLocationId?: string;
  preOrderReservationLabel?: string;
  private reservationLocationLookupId?: string;

  sortOptions = Object.values(DishSort);
  sortLabels = DishSortingLabels;

  menuCategories = Object.values(DishType);
  menuCategoryLabels = DishTypeLabels;

  selectedCategory: DishType | null = null; // initially show all
  selectedSort: DishSort = DishSort.PopularityDescending;

  private readonly dishesService = inject(DishesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private  readonly orderService = inject(PreOrdersService);
  private readonly reservationService = inject(ReservationService);
  private readonly authenticationService = inject(AuthenticationService);
  readonly currentUser = toSignal(this.authenticationService.user$, {
    initialValue: this.authenticationService.getUser(),
  });
  readonly profileAllergies = computed(() => this.currentUser()?.allergies ?? []);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const reservationId = params['reservationId'];
      if (this.preOrderReservationId !== reservationId) {
        this.preOrderLocationId = undefined;
      }

      this.isPreOrderEnabled = params['preOrder'] === 'true';
      this.preOrderReservationId = reservationId;
      this.preOrderLocationId = params['locationId'] || this.preOrderLocationId;
      this.preOrderReservationLabel = params['reservationLabel'];
      if (this.isPreOrderEnabled) {
        if (!this.preOrderReservationId) {
          console.error('Pre-order is enabled but no reservation ID provided.');
          this.toast.error('Pre-order is enabled but no reservation ID provided.', 'Error');
          this.isPreOrderEnabled = false;
        }
      } else {
        this.preOrderReservationId = undefined;
        this.preOrderLocationId = undefined;
        this.preOrderReservationLabel = undefined;
      }

      const category = params['category'] as DishType;
      const sort = params['sort'] as DishSort;

      this.selectedCategory =
        category && Object.values(DishType).includes(category) ? category : null;
      this.selectedSort =
        sort && Object.values(DishSort).includes(sort) ? sort : DishSort.PopularityDescending;

      this.loadDishes();
    });
  }

  loadDishes(): void {
    if (this.isPreOrderEnabled) {
      const locationId = this.preOrderLocationId;
      if (locationId) {
        this.dishesService.getDishesByLocationId(locationId).subscribe({
          next: (data) => this.setDishes(data, true),
          error: (error: unknown) => this.handleDishLoadError(error),
        });
        return;
      }

      const reservationId = this.preOrderReservationId;
      if (!reservationId || this.reservationLocationLookupId === reservationId) {
        return;
      }

      this.reservationLocationLookupId = reservationId;
      this.reservationService.getReservationById(reservationId).subscribe({
        next: (reservation) => {
          if (this.reservationLocationLookupId === reservationId) {
            this.reservationLocationLookupId = undefined;
          }
          if (this.preOrderReservationId !== reservationId) {
            return;
          }
          if (!reservation.locationId) {
            this.toast.error('Could not determine the restaurant for this reservation.', 'Error');
            this.dishes = [];
            this.filteredDishes = [];
            return;
          }

          this.preOrderLocationId = reservation.locationId;
          this.loadDishes();
        },
        error: (error: unknown) => {
          if (this.reservationLocationLookupId === reservationId) {
            this.reservationLocationLookupId = undefined;
          }
          if (this.preOrderReservationId === reservationId) {
            this.handleDishLoadError(error);
          }
        },
      });
      return;
    }

    const category = this.selectedCategory ?? undefined;
    const sort = this.selectedSort;

    this.dishesService.getDishes(category, sort).subscribe({
      next: (data) => this.setDishes(data),
      error: (error: unknown) => this.handleDishLoadError(error),
    });
  }

  goToCart(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openCart: 'true' },
      queryParamsHandling: 'merge',
    });
  }

  onCategorySelected(category: DishType): void {
    this.selectedCategory = this.selectedCategory === category ? null : category;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategory || null,
        sort: this.selectedSort,
      },
      queryParamsHandling: 'merge',
    });
  }

  onSortChanged(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const sort = selectElement.value as DishSort;
    this.selectedSort = sort;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategory || null,
        sort: this.selectedSort,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectedDish: DishListResponse | null = null;

  openModal(dish: DishListResponse) {
    this.selectedDish = dish;
  }

  closeModal() {
    this.selectedDish = null;
  }

  addDishToCart(dish: DishListResponse): void {
    const reservationId = this.preOrderReservationId;
    if (!this.isPreOrderEnabled || !reservationId) {
      this.toast.error(
        'Choose a valid reservation before adding a pre-order dish.',
        'Error',
      );
      return;
    }

    const conflicts = matchingAllergens(this.profileAllergies(), dish.allergens ?? []);
    if (
      conflicts.length &&
      !window.confirm(`⚠️ Contains ${conflicts.map(formatAllergen).join(', ')}. Add this dish anyway?`)
    ) {
      return;
    }

    this.orderService
      .addDishToPreOrderByReservationId(reservationId, dish, 1)
      .subscribe({
        next: () => {
          this.toast.success('Dish added to cart successfully!', 'Success');
        },
        error: (err) => {
          if (!(err instanceof HttpErrorResponse)) {
            this.toast.error(this.getApiErrorMessage(err), 'Error');
          }
        },
      });
  }

  conflictingAllergens(dish: DishListResponse): string[] {
    return matchingAllergens(this.profileAllergies(), dish.allergens ?? []);
  }

  formatAllergen(allergen: string): string {
    return formatAllergen(allergen);
  }

  private getApiErrorMessage(
    error: unknown,
    fallback = 'Unable to add the dish to this pre-order.',
  ): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (
        error.error &&
        typeof error.error === 'object' &&
        'message' in error.error &&
        typeof error.error.message === 'string'
      ) {
        return error.error.message;
      }
    }

    return error instanceof Error ? error.message : fallback;
  }

  private setDishes(data: DishListResponse[], filterForLocation = false): void {
    let dishes = data.map((dish) => ({
      ...dish,
      name: dish.name || 'Unknown Dish',
      price: dish.price || 0,
      weight: dish.weight || 'N/A',
      description: dish.description || 'N/A',
      state: dish.state || 'N/A',
      dishType: dish.dishType || 'N/A',
      calories: dish.calories || '0',
      proteins: dish.proteins || '0',
      fats: dish.fats || '0',
      carbohydrates: dish.carbohydrates || '0',
      vitamins: dish.vitamins || '0',
    }));

    if (filterForLocation) {
      if (this.selectedCategory) {
        dishes = dishes.filter((dish) => dish.dishType === this.selectedCategory);
      }

      if (this.selectedSort === DishSort.PriceAscending) {
        dishes.sort((left, right) => left.price - right.price);
      } else if (this.selectedSort === DishSort.PriceDescending) {
        dishes.sort((left, right) => right.price - left.price);
      }
    }

    this.dishes = dishes;
    this.filteredDishes = dishes;
  }

  private handleDishLoadError(error: unknown): void {
    this.dishes = [];
    this.filteredDishes = [];
    this.toast.error(
      this.getApiErrorMessage(error, 'Unable to load the menu for this reservation.'),
      'Error',
    );
  }
}
