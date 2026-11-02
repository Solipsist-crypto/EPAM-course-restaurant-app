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

@Component({
  selector: 'app-not-submitted-order',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './not-submitted-order.component.html',
  styleUrl: './not-submitted-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotSubmittedOrderComponent {
  readonly order = input.required<Order>();
  readonly failedImages = new Set<string>();

  readonly canModify = computed(
    () => this.order().reservationStatus === ReservationStatus.Reserved,
  );

  readonly submitted = output<string>();
  readonly addDish = output<void>();
  readonly removeDish = output<string>();
  readonly updateQuantity = output<{
    itemId: string;
    quantity: number;
  }>();

  readonly totalPrice = computed(() =>
    this.order().orderItems.reduce(
      (total, item) => total + item.dish.price * item.quantity,
      0,
    ),
  );

  onDishImageError(itemId: string): void {
    this.failedImages.add(itemId);
  }

  incrementItemQuantity(itemId: string): void {
    if (!this.canModify()) {
      return;
    }

    const item = this.findOrderItem(itemId);

    if (item) {
      this.updateItemQuantity(itemId, item.quantity + 1);
    }
  }

  decrementItemQuantity(itemId: string): void {
    if (!this.canModify()) {
      return;
    }

    const item = this.findOrderItem(itemId);

    if (item && item.quantity > 1) {
      this.updateItemQuantity(itemId, item.quantity - 1);
    }
  }

  submit(): void {
    if (this.canModify()) {
      this.submitted.emit(this.order().orderId);
    }
  }

  addDishToOrder(): void {
    if (this.canModify()) {
      this.addDish.emit();
    }
  }

  removeDishFromOrder(itemId: string): void {
    if (this.canModify()) {
      this.removeDish.emit(itemId);
    }
  }

  private findOrderItem(itemId: string) {
    return this.order().orderItems.find(
      (item) => item.dish.id === itemId,
    );
  }

  private updateItemQuantity(itemId: string, quantity: number): void {
    this.updateQuantity.emit({ itemId, quantity });
  }
}
