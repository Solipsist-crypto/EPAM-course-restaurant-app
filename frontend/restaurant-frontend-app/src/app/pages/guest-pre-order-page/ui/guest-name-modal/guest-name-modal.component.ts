import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';
import { GuestInviteVm } from '../../state/guest-preorder.store';

@Component({
    standalone: true,
    selector: 'app-guest-name-modal',
    imports: [ModalComponent, FormsModule, CustomButtonComponent],
    templateUrl: './guest-name-modal.component.html',
    styleUrl: './guest-name-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestNameModalComponent {
    readonly invite = input<GuestInviteVm | null>(null);

    readonly confirmed = output<{ name: string; allergies: string[] }>();
    readonly closed = output<void>(); // x / esc / backdrop (we'll ignore this on the page)

    readonly name = signal('');
    readonly allergies = signal<string[]>([]);
    readonly touched = signal(false);
    readonly allergyOptions = [
        { value: 'peanuts', label: 'Peanuts' },
        { value: 'dairy', label: 'Dairy' },
        { value: 'gluten', label: 'Gluten' },
        { value: 'seafood', label: 'Seafood' },
        { value: 'eggs', label: 'Eggs' },
        { value: 'soy', label: 'Soy' },
        { value: 'berries', label: 'Berries' },
    ];

    readonly trimmed = computed(() => this.name().trim());
    readonly valid = computed(() => this.trimmed().length > 0);

    toggleAllergy(allergy: string, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.allergies.update((selected) => checked
            ? [...new Set([...selected, allergy])]
            : selected.filter((item) => item !== allergy));
    }

    submit() {
        this.touched.set(true);
        if (!this.valid()) return;
        this.confirmed.emit({ name: this.trimmed(), allergies: this.allergies() });
    }
}