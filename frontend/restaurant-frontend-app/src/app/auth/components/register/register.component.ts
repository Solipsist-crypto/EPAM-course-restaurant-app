import { GreenTastyImageComponent } from '../green-tasty-image/green-tasty-image.component';

import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormValidatorsService } from '@app/auth/services/form-validators-service.service';
import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';
import { Router, RouterModule } from '@angular/router';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { PasswordWithRulesComponent } from '@app/shared/custom-components/password-with-rules/password-with-rules.component';
import { ConfirmPasswordComponent } from '@app/shared/custom-components/confirm-password/confirm-password.component';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    CustomButtonComponent,
    RouterModule,
    GreenTastyImageComponent,
    PasswordWithRulesComponent,
    ConfirmPasswordComponent,
  ],

  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class RegisterComponent implements OnInit {
  readonly allergyOptions = [
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'gluten', label: 'Gluten' },
    { value: 'seafood', label: 'Seafood' },
    { value: 'eggs', label: 'Eggs' },
    { value: 'soy', label: 'Soy' },
    { value: 'berries', label: 'Berries' },
  ];

  registerForm!: FormGroup;
  private formBuilder = inject(FormBuilder);
  private formValidatorsService = inject(FormValidatorsService);
  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  unsuccessfulRegistration = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.initRegisterForm();
  }

  initRegisterForm(): void {
    this.registerForm = this.formBuilder.group(
      {
        firstName: [
          '',
          [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Za-z'-]+$/)],
        ],
        lastName: [
          '',
          [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Za-z'-]+$/)],
        ],
        email: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
          ],
        ],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
        confirmPassword: ['', Validators.required],
        allergies: this.formBuilder.array(
          this.allergyOptions.map(() => this.formBuilder.control(false, { nonNullable: true })),
        ),
      },
      { validators: (control) => this.formValidatorsService.passwordMatchValidator(control) }
    );
  }

  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password') as FormControl;
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword') as FormControl;
  }

  get allergies(): FormArray<FormControl<boolean>> {
    return this.registerForm.get('allergies') as FormArray<FormControl<boolean>>;
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      const registerData = this.registerForm.getRawValue();
      const selectedAllergies = this.allergies.controls.flatMap((control, index) =>
        control.value ? [this.allergyOptions[index].value] : [],
      );
      const result = await this.authenticationService.register(
        registerData.firstName,
        registerData.lastName,
        registerData.email,
        registerData.password,
        registerData.confirmPassword,
        selectedAllergies,
      );
      this.unsuccessfulRegistration = !result.success;
      this.errorMessage = result.message || null;
      if (result.success) {
        this.router.navigate(['/login']);
      }
    } else {
      console.error('Form is invalid');
    }
  }
}
