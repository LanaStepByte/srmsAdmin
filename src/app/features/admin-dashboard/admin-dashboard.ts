import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';
import { AdminDashboardService } from './admin-dashboard.service';
import { Dish, DashboardStats, AdminUser, NavItem, PagedResult, StrictCreateDishPayload } from './admin-dashboard.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgClass, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly fb = inject(NonNullableFormBuilder);

  constructor() {
    this.dashboardService.login({ email: 'admin@itstep.ge', password: 'Admin123!' }).subscribe({
      next: (response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        this.refreshTrigger.update((v) => v + 1);
      },
      error: () => {
        this.errorMessage.set('ავტორიზაცია ვერ მოხერხდა.');
      },
    });
  }

  protected readonly currentUser = signal<AdminUser>({
    name: 'Admin User',
    role: 'Restaurant Administrator',
  });

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'grid', route: '/admin' },
    { label: 'Dishes', icon: 'utensils', route: '/admin/dishes' },
  ];

  protected readonly page = signal(0);
  protected readonly pageSize = signal(10); 
  private readonly refreshTrigger = signal(0);

  private readonly statsResource = toSignal(
    toObservable(this.refreshTrigger).pipe(
      switchMap(() =>
        this.dashboardService
          .getDashboardStats()
          .pipe(catchError(() => of<DashboardStats>({ totalDishes: 26, activeOrders: 5, revenue: 1250 })))
      )
    ),
    { initialValue: null },
  );

  protected readonly stats = computed<DashboardStats>(
    () => this.statsResource() ?? { totalDishes: 26, activeOrders: 5, revenue: 1250 },
  );

  private readonly dishesQuery = computed(() => ({
    page: this.page(),
    pageSize: this.pageSize(),
    refresh: this.refreshTrigger(),
  }));

  private readonly dishesResource = toSignal(
    toObservable(this.dishesQuery).pipe(
      switchMap(({ page, pageSize }) =>
        this.dashboardService.getPagedDishes(page, pageSize).pipe(
          catchError(() =>
            of<PagedResult<Dish>>({
              items: [],
              totalCount: 0,
              hasNext: false,
            }),
          ),
        ),
      ),
    ),
    { initialValue: null },
  );

  protected readonly dishes = computed<Dish[]>(() => this.dishesResource()?.items ?? []);
  protected readonly totalElements = computed<number>(
    () => this.dishesResource()?.totalCount ?? 0,
  );
  protected readonly hasNextPage = computed<boolean>(
    () => this.dishesResource()?.hasNext ?? false,
  );
  protected readonly isLoading = computed(() => this.dishesResource() === null);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly isModalOpen = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formSubmitError = signal<string | null>(null);

  // Signal Forms არქიტექტურა nonNullable კონტროლერებით
  protected readonly dishForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    price: [0, [Validators.required, Validators.min(0.1)]],
    categoryId: [1, [Validators.required, Validators.min(1)]],
    imageFileName: ['default-dish.jpg', [Validators.required]],
    isAvailable: [true, [Validators.required]],
  });

  protected isFieldInvalid(fieldName: string): boolean {
    const control = this.dishForm.get(fieldName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected loadMoreDishes(): void {
    this.pageSize.update((currentSize) => currentSize + 10);
  }

  protected onAddDish(): void {
    this.dishForm.reset({
      name: '',
      description: '',
      price: 0,
      categoryId: 1,
      imageFileName: 'default-dish.jpg',
      isAvailable: true,
    });
    this.formSubmitError.set(null);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    if (this.isSubmitting()) return;
    this.isModalOpen.set(false);
  }

  protected onSubmitDish(): void {
    if (this.dishForm.invalid) {
      this.dishForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.formSubmitError.set(null);

    const rawData = this.dishForm.getRawValue();
    const payload: StrictCreateDishPayload = {
      name: rawData.name,
      description: rawData.description,
      price: Number(rawData.price),
      categoryId: Number(rawData.categoryId),
      imageFileName: rawData.imageFileName,
      isAvailable: Boolean(rawData.isAvailable),
    };

    // ==========================================
    // [ვალიდაციის დამატება]: validate-payload ენდფოინთის გამოყენება
    // ==========================================
    // სანამ კერძი სერვერზე რეალურად შეიქმნებოდეს, ჯერ ვამოწმებთ 
    // მისი სტრუქტურისა და მონაცემების ვალიდურობას dedicated ენდფოინთით.
    this.dashboardService.validateDishPayload(payload).subscribe({
      next: (validationResult) => {
        if (validationResult.valid) {
          // თუ სერვერმა დაადასტურა, რომ Payload სტრუქტურულად სრულად ვალიდურია,
          // მხოლოდ ამის შემდეგ ვგზავნით რეალური შექმნის (create) მოთხოვნას.
          this.dashboardService.createDish(payload).subscribe({
            next: () => {
              this.isSubmitting.set(false);
              this.isModalOpen.set(false);
              this.refreshTrigger.update((value) => value + 1);
              this.dishForm.reset();
            },
            error: () => {
              this.isSubmitting.set(false);
              this.formSubmitError.set('კერძის შექმნა ვერ მოხერხდა.');
            },
          });
        } else {
          // თუ სერვერმა უარყო პეილოდი
          this.isSubmitting.set(false);
          this.formSubmitError.set('სერვერული სტრუქტურული ვალიდაცია ვერ გაიარა.');
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.formSubmitError.set('ვალიდაციის ენდფოინთთან კავშირის შეცდომა.');
        console.error('Validation error:', err);
      },
    });
  }

  protected onDeleteDish(dish: Dish): void {
    this.deletingId.set(String(dish.id));
    this.dashboardService.deleteDish(String(dish.id)).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.refreshTrigger.update((value) => value + 1);
      },
      error: () => {
        this.errorMessage.set(`Failed to delete "${dish.name}".`);
        this.deletingId.set(null);
      },
    });
  }

  protected statusBadgeClass(isAvailable: boolean): string {
    return isAvailable ? 'bg-[#29593D] text-[#a7f3d0]' : 'bg-red-900/40 text-red-300';
  }
}