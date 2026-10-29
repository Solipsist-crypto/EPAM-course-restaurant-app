import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { UserModel } from '@app/auth/models/user.model';
import { UsersService } from '@app/services/users/users.service';
import { ToastService } from '@app/services/toast/toast.service';
import { GeneralInformationComponent } from './general-user-info.component';

describe('GeneralInformationComponent allergies', () => {
  let fixture: ComponentFixture<GeneralInformationComponent>;
  let component: GeneralInformationComponent;
  let editProfile: jasmine.Spy;

  beforeEach(async () => {
    const user: UserModel = {
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      role: 'Customer',
    };
    editProfile = jasmine.createSpy('editProfile').and.returnValue(of('saved'));

    await TestBed.configureTestingModule({
      imports: [GeneralInformationComponent],
      providers: [
        FormBuilder,
        {
          provide: AuthenticationService,
          useValue: {
            user$: new BehaviorSubject<UserModel | null>(user),
            editProfile,
            uploadMyProfileImage: jasmine.createSpy().and.returnValue(of('uploaded')),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getUserProfileImage: jasmine.createSpy().and.returnValue(of({ presignedUrl: '' })),
          },
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['success', 'error']),
        },
      ],
    })
      .overrideComponent(GeneralInformationComponent, {
        set: { template: '', imports: [], styles: [], styleUrl: undefined },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GeneralInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends selected allergies to the profile API', () => {
    component.userForm.controls.allergies.setValue(['peanuts', 'dairy']);

    component.onSave();

    expect(editProfile).toHaveBeenCalledOnceWith('Alice', 'Smith', ['peanuts', 'dairy']);
  });
});
