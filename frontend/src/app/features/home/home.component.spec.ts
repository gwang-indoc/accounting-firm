import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { RouterModule } from '@angular/router';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterModule.forRoot([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it.todo('<app-navbar /> moved to app layout — HomeComponent no longer owns navbar');

  it('services section is wrapped in mat-card', () => {
    expect(fixture.nativeElement.querySelector('#services mat-card')).not.toBeNull();
  });

  it('has element with id="services"', () => {
    expect(fixture.nativeElement.querySelector('#services')).not.toBeNull();
  });

  it('has element with id="security"', () => {
    expect(fixture.nativeElement.querySelector('#security')).not.toBeNull();
  });
});
