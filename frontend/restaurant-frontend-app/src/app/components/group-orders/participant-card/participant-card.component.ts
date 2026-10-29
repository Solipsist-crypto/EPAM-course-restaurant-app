import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Participant } from '@app/models/group-orders/participant.model';
import { formatAllergen, matchingAllergens } from '@app/shared/helpers/group-dietary-safety';

@Component({
  selector: 'app-participant-card',
  imports: [CurrencyPipe],
  templateUrl: './participant-card.component.html',
  styleUrl: './participant-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ParticipantCardComponent {
  readonly participant = input.required<Participant>();
  readonly groupParticipants = input<Participant[]>([]);
  readonly isMe = input(false);
  readonly canRemove = input(false);
  readonly removeClick = output<void>();
  readonly failedImages = new Set<string>();

  readonly title = computed(() => {
    const person = this.participant();
    if (this.isMe()) return 'My Pre-Order';
    return person.type === 'Owner' ? `Owner: ${person.name}` : `Guest: ${person.name}`;
  });

  onImageError(dishId: string): void {
    this.failedImages.add(dishId);
  }

  conflictingAllergens(participant: Participant, allergens: string[] = []): string[] {
    return matchingAllergens(participant.allergies ?? [], allergens);
  }

  dietaryConflicts(allergens: string[] = []): Array<{ allergen: string; participantName: string }> {
    return this.groupParticipants().flatMap((person) =>
      this.conflictingAllergens(person, allergens).map((allergen) => ({
        allergen,
        participantName: person.name,
      })),
    );
  }

  formatAllergen(allergen: string): string {
    return formatAllergen(allergen);
  }
}
