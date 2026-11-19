import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthenticationService } from './authentication.service';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthenticationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sends allergies to the profile endpoint', () => {
    service.editProfile('Alice', 'Smith', ['peanuts', 'dairy']).subscribe();

    const request = http.expectOne('https://test.api/me');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      firstName: 'Alice',
      lastName: 'Smith',
      allergies: ['peanuts', 'dairy'],
    });
    request.flush('Profile updated successfully');
  });

  it('includes selected allergies in the Cognito registration request', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response('{}', { status: 200 })),
    );

    await service.register('Alice', 'Smith', 'alice@example.com', 'Password1!', 'Password1!', [
      'peanuts',
      'dairy',
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://test.api/register',
      jasmine.objectContaining({
        body: JSON.stringify({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
          allergies: ['peanuts', 'dairy'],
        }),
      }),
    );
  });
});
