import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { Order } from '@app/models/orders/order.model';
import { ReservationStatus } from '@app/models/reservations/reservation.model';
import { formatAllergen, matchingAllergens } from '@app/shared/helpers/group-dietary-safety';

@Component({
  selector: 'app-submitted-order',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './submitted-order.component.html',
  styleUrl: './submitted-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmittedOrderComponent {
  readonly order = input.required<Order>();
  readonly allergies = input<string[]>([]);

  readonly canModify = computed(
    () => this.order().reservationStatus === ReservationStatus.Reserved,
  );

  readonly canceled = output<void>();
  readonly edited = output<void>();

  readonly totalPrice = computed(() =>
    this.order()
      .orderItems.filter((item) => item.state !== 2)
      .reduce(
        (total, item) =>
          total + item.dish.price * item.quantity,
        0,
      ),
  );

  formatAllergen(allergen: string): string {
    return formatAllergen(allergen);
  }

  conflictingAllergens(allergens: string[] = []): string[] {
    return matchingAllergens(this.allergies(), allergens);
  }

  cancelOrder(): void {
    if (this.canModify()) {
      this.canceled.emit();
    }
  }

  editOrder(): void {
    if (this.canModify()) {
      this.edited.emit();
    }
  }
}
