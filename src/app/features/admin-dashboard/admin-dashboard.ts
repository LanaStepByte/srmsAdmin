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
  catchError,
  of,
  switchMap,
} from 'rxjs';

import { AdminDashboardService } from './admin-dashboard.service';
import {
  AdminUser,
  DashboardStats,
  Dish,
  NavItem,
  PagedResult,
} from './admin-dashboard.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    NgClass,
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

  protected readonly isLoading =
    computed(
      () => this.dishesResource() === null,
    );

  protected readonly errorMessage =
    signal<string | null>(null);

  protected readonly deletingId =
    signal<string | null>(null);

  protected loadMoreDishes(): void {
    this.pageSize.update(
      (currentSize) =>
        currentSize + 10,
    );
  }

  // ==========================================
  // LECTURE 45 START POINT
  // ==========================================
  // The button exists already.
  // The Add Dish Signal Form does NOT exist yet.
  // During Lecture 45 this method will be replaced
  // with the real Signal Forms implementation.
  // ==========================================
  protected onAddDish(): void {
    console.info(
      'Lecture 45: Add Dish Signal Form is not implemented yet.',
    );
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
