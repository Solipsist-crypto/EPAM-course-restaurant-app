import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeSlotComponent } from './time-slot.component';

describe('TimeSlotComponent', () => {
  let component: TimeSlotComponent;
  let fixture: ComponentFixture<TimeSlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeSlotComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('timeRange', {
      start: '2026-10-28T10:00:00.000Z',
      end: '2026-10-28T11:30:00.000Z',
    });
    fixture.componentRef.setInput('label', '10:00');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
