import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  CurrencyPipe,
  NgClass,
} from '@angular/common';
import {
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  form,
  maxLength,
  min,
  minLength,
  required,
  submit,
} from '@angular/forms/signals';
import {
  catchError,
  firstValueFrom,
  of,
  switchMap,
} from 'rxjs';

import { AdminDashboardService } from './admin-dashboard.service';
import {
  AdminUser,
  DashboardStats,
  Dish,
  DishFormModel,
  NavItem,
  PagedResult,
  StrictCreateDishPayload,
} from './admin-dashboard.model';

const INITIAL_DISH_MODEL: DishFormModel = {
  name: '',
  description: '',
  price: 0,
  categoryId: 1,
  imageFileName: 'default-dish.jpg',
  isAvailable: true,
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,

  // ReactiveFormsModule აღარ გვჭირდება.
  // FormField არის Signal Forms-ის directive,
  // რომელიც FieldTree-ს native input-თან აკავშირებს.
  imports: [
    CurrencyPipe,
    NgClass,
    FormField,
  ],

  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent {
  private readonly dashboardService =
    inject(AdminDashboardService);

  constructor() {
    this.dashboardService
      .login({
        email: 'admin@itstep.ge',
        password: 'Admin123!',
      })
      .subscribe({
        next: (response) => {
          localStorage.setItem(
            'accessToken',
            response.accessToken,
          );
          localStorage.setItem(
            'refreshToken',
            response.refreshToken,
          );

          this.refreshTrigger.update(
            (value) => value + 1,
          );
        },

        error: () => {
          this.errorMessage.set(
            'ავტორიზაცია ვერ მოხერხდა.',
          );
        },
      });
  }

  protected readonly currentUser =
    signal<AdminUser>({
      name: 'Admin User',
      role: 'Restaurant Administrator',
    });

  protected readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'grid',
      route: '/admin',
    },
    {
      label: 'Dishes',
      icon: 'utensils',
      route: '/admin/dishes',
    },
  ];

  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);

  private readonly refreshTrigger = signal(0);

  // ==========================================
  // Dashboard-ის არსებული reactive data flow
  // ==========================================

  private readonly statsResource = toSignal(
    toObservable(this.refreshTrigger).pipe(
      switchMap(() =>
        this.dashboardService
          .getDashboardStats()
          .pipe(
            catchError(() =>
              of<DashboardStats>({
                totalDishes: 26,
                activeOrders: 5,
                revenue: 1250,
              }),
            ),
          ),
      ),
    ),
    {
      initialValue: null,
    },
  );

  protected readonly stats =
    computed<DashboardStats>(
      () =>
        this.statsResource() ?? {
          totalDishes: 26,
          activeOrders: 5,
          revenue: 1250,
        },
    );

  private readonly dishesQuery = computed(
    () => ({
      page: this.page(),
      pageSize: this.pageSize(),
      refresh: this.refreshTrigger(),
    }),
  );

  private readonly dishesResource = toSignal(
    toObservable(this.dishesQuery).pipe(
      switchMap(({ page, pageSize }) =>
        this.dashboardService
          .getPagedDishes(page, pageSize)
          .pipe(
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
    {
      initialValue: null,
    },
  );

  protected readonly dishes = computed<Dish[]>(
    () => this.dishesResource()?.items ?? [],
  );

  protected readonly totalElements =
    computed<number>(
      () =>
        this.dishesResource()?.totalCount ?? 0,
    );

  protected readonly hasNextPage =
    computed<boolean>(
      () =>
        this.dishesResource()?.hasNext ?? false,
    );

  protected readonly isLoading = computed(
    () => this.dishesResource() === null,
  );

  protected readonly errorMessage =
    signal<string | null>(null);

  protected readonly deletingId =
    signal<string | null>(null);

  // ==========================================
  // [ლექცია 45]: Modal-ის UI state
  // ==========================================

  protected readonly isModalOpen =
    signal(false);

  // ==========================================
  // [ლექცია 45]: Signal Form Model
  // ==========================================
  //
  // FormGroup-ის ნაცვლად source of truth არის
  // WritableSignal<DishFormModel>.
  // [formField] ავტომატურად ასინქრონებს
  // input-სა და ამ model signal-ს.
  // ==========================================

  protected readonly dishModel =
    signal<DishFormModel>({
      ...INITIAL_DISH_MODEL,
    });

  // ==========================================
  // [ლექცია 45]: Signal Form + Schema Validation
  // ==========================================

  protected readonly dishForm = form(
    this.dishModel,
    (dish) => {
      required(dish.name, {
        message: 'Dish name is required.',
      });

      minLength(dish.name, 3, {
        message:
          'Dish name must contain at least 3 characters.',
      });

      required(dish.description, {
        message: 'Description is required.',
      });

      maxLength(dish.description, 200, {
        message:
          'Description cannot exceed 200 characters.',
      });

      min(dish.price, 0.1, {
        message:
          'Price must be greater than 0.',
      });

      min(dish.categoryId, 1, {
        message:
          'Category ID must be at least 1.',
      });

      required(dish.imageFileName, {
        message:
          'Image filename is required.',
      });

      // isAvailable boolean-ია.
      // required() აქ განზრახ არ გვჭირდება:
      // false სრულფასოვანი მნიშვნელობაა.
    },
  );

  // ==========================================
  // [ლექცია 45]: Validation UX helper
  // ==========================================

  protected showErrors(
    field: FieldTree<unknown>,
  ): boolean {
    const state = field();

    return (
      state.invalid() &&
      (
        state.touched() ||
        state.dirty()
      )
    );
  }

  protected loadMoreDishes(): void {
    this.pageSize.update(
      (currentSize) =>
        currentSize + 10,
    );
  }

  // ==========================================
  // [ლექცია 45]: Modal open/reset
  // ==========================================

  protected onAddDish(): void {
    // Signal Form-ის reset ასუფთავებს
    // value-საც და touched/dirty state-საც.
    this.dishForm().reset({
      ...INITIAL_DISH_MODEL,
    });

    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    // ცალკე isSubmitting signal აღარ გვჭირდება.
    // submitting() თვითონ Signal Form-ის state-ია.
    if (this.dishForm().submitting()) {
      return;
    }

    this.isModalOpen.set(false);
  }

  // ==========================================
  // [ლექცია 45]: Signal Forms submit()
  // ==========================================

  protected async onSubmitDish(
    event: Event,
  ): Promise<void> {
    event.preventDefault();

    const success = await submit(
      this.dishForm,

      async (field) => {
        const value = field().value();

        // Form Model-ს პირდაპირ არ ვაგზავნით.
        // ვქმნით ახალ strict server payload-ს.
        const payload: StrictCreateDishPayload =
          Object.freeze({
            name: value.name.trim(),
            description:
              value.description.trim(),
            price: Number(value.price),
            categoryId:
              Number(value.categoryId),
            imageFileName:
              value.imageFileName.trim(),
            isAvailable:
              Boolean(value.isAvailable),
          });

        try {
          // ----------------------------------
          // ეტაპი 1: server-side validation
          // ----------------------------------
          const validationResult =
            await firstValueFrom(
              this.dashboardService
                .validateDishPayload(payload),
            );

          if (!validationResult.valid) {
            return {
              kind: 'payloadRejected',
              message:
                'სერვერული სტრუქტურული ვალიდაცია ვერ გაიარა.',
            };
          }

          // ----------------------------------
          // ეტაპი 2: create
          // ----------------------------------
          await firstValueFrom(
            this.dashboardService
              .createDish(payload),
          );

          // წარმატების შემდეგ:
          // 1. ვხურავთ modal-ს
          // 2. ვაახლებთ dishes query-ს
          // 3. ვასუფთავებთ form state-ს
          this.isModalOpen.set(false);

          this.refreshTrigger.update(
            (current) => current + 1,
          );

          field().reset({
            ...INITIAL_DISH_MODEL,
          });

          return;
        } catch (error) {
          console.error(
            'Dish submit error:',
            error,
          );

          // submit() ამ error-ს Form-ის
          // submission error-ად ინტეგრირებს.
          return {
            kind: 'serverError',
            message:
              'კერძის შენახვა ვერ მოხერხდა. გადაამოწმეთ სერვერი და სცადეთ თავიდან.',
          };
        }
      },
    );

    if (!success) {
      console.warn(
        'Dish form submission was not completed.',
      );
    }
  }

  protected onDeleteDish(
    dish: Dish,
  ): void {
    this.deletingId.set(
      String(dish.id),
    );

    this.dashboardService
      .deleteDish(String(dish.id))
      .subscribe({
        next: () => {
          this.deletingId.set(null);

          this.refreshTrigger.update(
            (value) => value + 1,
          );
        },

        error: () => {
          this.errorMessage.set(
            `Failed to delete "${dish.name}".`,
          );

          this.deletingId.set(null);
        },
      });
  }

  protected statusBadgeClass(
    isAvailable: boolean,
  ): string {
    return isAvailable
      ? 'bg-[#29593D] text-[#a7f3d0]'
      : 'bg-red-900/40 text-red-300';
  }
}
