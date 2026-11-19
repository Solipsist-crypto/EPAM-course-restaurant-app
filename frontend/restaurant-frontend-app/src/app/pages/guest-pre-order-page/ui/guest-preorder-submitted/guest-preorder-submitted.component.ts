import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';
import { GuestCartItem } from '../../state/guest-preorder.store';
import { formatAllergen, matchingAllergens } from '@app/shared/helpers/group-dietary-safety';

@Component({
    standalone: true,
    selector: 'app-guest-preorder-submitted',
    templateUrl: './guest-preorder-submitted.component.html',
    styleUrl: './guest-preorder-submitted.component.scss',
    imports: [CurrencyPipe, DatePipe, CustomButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestPreorderSubmittedComponent {
    readonly invite = input<GuestInvite | null>(null);
    readonly guestName = input('');
    readonly items = input<GuestCartItem[]>([]);
    readonly allergies = input<string[]>([]);
    readonly total = input(0);

    readonly createNew = output<void>();

    conflictingAllergens(allergens: string[] = []): string[] {
        return matchingAllergens(this.allergies(), allergens);
    }

    formatAllergen(allergen: string): string {
        return formatAllergen(allergen);
    }
}