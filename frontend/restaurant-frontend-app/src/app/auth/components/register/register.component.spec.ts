import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { RegisterComponent } from './register.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        provideRouter([]),
      ],
      imports: [RegisterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lets a user select registration allergies', async () => {
    const auth = TestBed.inject(AuthenticationService);
    const registerSpy = spyOn(auth, 'register').and.resolveTo({ success: true });
    const checkboxes = fixture.nativeElement.querySelectorAll(
      '.allergy-option input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(checkboxes.length).toBe(7);

    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.allergies.value).toEqual([true, false, false, false, false, false, false]);

    component.registerForm.patchValue({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    });
    await component.onSubmit();

    expect(registerSpy).toHaveBeenCalledWith(
      'Alice',
      'Smith',
      'alice@example.com',
      'Password1!',
      'Password1!',
      ['peanuts'],
    );
  });
});
