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
  selector: 'app-submit-order-modal',
  standalone: true,
  imports: [],
  templateUrl: './submit-order-modal.component.html',
  styleUrl: './submit-order-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitOrderModalComponent {
  readonly order = input.required<Order>();

  readonly canModify = computed(
    () => this.order().reservationStatus === ReservationStatus.Reserved,
  );

  readonly canceled = output<void>();
  readonly edited = output<void>();
  readonly closed = output<void>();

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

  closeModal(): void {
    this.closed.emit();
  }
}
