import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, exhaustMap, forkJoin, interval, map, merge, of, Subject, Subscription, switchMap, tap } from 'rxjs';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { Participant } from '@app/models/group-orders/participant.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';

@Component({
  selector: 'app-group-order-page',
  imports: [CurrencyPipe, DatePipe, ParticipantCardComponent, ModalComponent],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent implements OnInit {
  private static readonly SYNC_INTERVAL_MS = 15_000;
  private readonly route = inject(ActivatedRoute);
  private readonly groupOrders = inject(GroupOrdersService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  private syncSubscription?: Subscription;

  readonly reservationId = this.route.snapshot.paramMap.get('reservationId') ?? '';
  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly ownerSessionId = signal('');
  readonly status = signal<GroupReservationStatus>('Open');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly confirmSubmitOpen = signal(false);
  readonly submitting = signal(false);
  readonly guestToRemove = signal<Participant | null>(null);
  readonly removingGuest = signal(false);
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly refreshFailed = signal(false);
  readonly consolidatedOrder = computed(() => consolidatePreOrder(this.participants()));
  readonly pendingParticipantsCount = computed(
    () => this.participants().filter((participant) => !participant.isSubmitted).length,
  );
  readonly hasDishes = computed(() => this.participants().some((participant) => participant.items.length > 0));
  readonly canSubmit = computed(
    () => this.status() === 'Open' && this.consolidatedOrder().items.length > 0 && !this.submitting(),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.stopSync();
    this.loading.set(true);
    this.error.set('');

    this.groupOrders
      .getGroupInvite$(this.reservationId)
      .pipe(
        tap((invite) => this.invite.set(invite)),
        switchMap((invite) =>
          forkJoin({
            sessions: this.groupOrders.getSessions$(invite.GroupReservationId),
            status: this.groupOrders.getStatus$(invite.GroupReservationId),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ sessions, status }) => {
          this.participants.set(sessions.participants);
          this.ownerSessionId.set(
            sessions.participants.find(
              (participant) => participant.type === 'Owner',
            )?.id ?? '',
          );
          this.status.set(status.status);
          this.lastUpdatedAt.set(new Date());
          this.loading.set(false);
          if (status.status === 'Open') this.startSync();
        },
        error: (requestError: { status?: number }) => {
          this.error.set(requestError.status === 404 ? 'Group reservation not found' : 'Could not load group reservation');
          this.loading.set(false);
        },
      });
  }

  refresh(): void {
    this.refreshRequests.next();
  }

  private startSync(): void {
    this.stopSync();
    this.syncSubscription = merge(interval(GroupOrderPageComponent.SYNC_INTERVAL_MS), this.refreshRequests)
      .pipe(
        exhaustMap(() => {
          const groupId = this.invite()?.GroupReservationId;
          if (!groupId || this.status() !== 'Open') return of(null);

          return forkJoin({
            sessions: this.groupOrders.getSessions$(groupId, { silent: true }),
            status: this.groupOrders.getStatus$(groupId, { silent: true }),
          }).pipe(
            tap(({ sessions, status }) => {
              this.participants.set(sessions.participants);
              this.status.set(status.status);
              this.lastUpdatedAt.set(new Date());
              this.refreshFailed.set(false);
              if (status.status !== 'Open') this.stopSync();
            }),
            catchError(() => {
              this.refreshFailed.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private stopSync(): void {
    this.syncSubscription?.unsubscribe();
    this.syncSubscription = undefined;
  }

  openSubmitConfirmation(): void {
    if (this.canSubmit()) this.confirmSubmitOpen.set(true);
  }

  closeSubmitConfirmation(): void {
    if (!this.submitting()) this.confirmSubmitOpen.set(false);
  }

  requestRemoveGuest(participant: Participant): void {
    if (this.status() === 'Open' && participant.type === 'Guest') {
      this.guestToRemove.set(participant);
    }
  }

  closeRemoveGuestConfirmation(): void {
    if (!this.removingGuest()) this.guestToRemove.set(null);
  }

  removeGuest(): void {
    const invite = this.invite();
    const participant = this.guestToRemove();
    if (!invite || !participant || this.status() !== 'Open' || this.removingGuest()) return;

    this.removingGuest.set(true);
    this.groupOrders
      .removeSession$(invite.GroupReservationId, participant.id)
      .pipe(
        catchError(() => {
          this.toast.error('Could not remove guest. Please try again.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((sessions) => {
        this.removingGuest.set(false);
        this.guestToRemove.set(null);
        if (sessions) {
          this.participants.set(sessions.participants);
          this.toast.success('Guest removed from the group');
        }
      });
  }

  submitPreOrder(): void {
    const invite = this.invite();
    if (!invite || !this.canSubmit()) return;

    this.submitting.set(true);
    this.groupOrders
      .submit$(invite.GroupReservationId, this.reservationId)
      .pipe(
        map(() => undefined),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.submitting.set(false);
        if (result === null) {
          this.confirmSubmitOpen.set(false);
          return;
        }

        this.status.set('Submitted');
        this.stopSync();
        this.confirmSubmitOpen.set(false);
        this.toast.success('Pre-order sent to the restaurant');
      });
  }
}
