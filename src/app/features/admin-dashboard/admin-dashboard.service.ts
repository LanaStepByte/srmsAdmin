import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AuthResponse,
  DashboardStats,
  Dish,
  DishPayloadValidationResult,
  PagedResult,
  StrictCreateDishPayload,
} from './admin-dashboard.model';

const API_BASE = '/api/v1/enterprise';
const AUTH_API = '/api/v1/auth';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';

    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  login(credentials: {
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${AUTH_API}/login`,
      credentials,
    );
  }

  getPagedDishes(
    page: number,
    size: number,
  ): Observable<PagedResult<Dish>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<PagedResult<Dish>>(
      `${API_BASE}/dishes/paged`,
      {
        headers: this.getAuthHeaders(),
        params,
      },
    );
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(
      `${API_BASE}/dashboard/stats`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  deleteDish(id: string): Observable<void> {
    return this.http.delete<void>(
      `${API_BASE}/dishes/${id}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  // ==========================================
  // [ლექცია 45]: Signal Form submit-ის
  // server-side validation და create ეტაპები
  // ==========================================

  validateDishPayload(
    payload: StrictCreateDishPayload,
  ): Observable<DishPayloadValidationResult> {
    return this.http.post<DishPayloadValidationResult>(
      `${API_BASE}/dishes/validate-payload`,
      payload,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  createDish(
    payload: StrictCreateDishPayload,
  ): Observable<Dish> {
    return this.http.post<Dish>(
      `${API_BASE}/dishes`,
      payload,
      {
        headers: this.getAuthHeaders(),
      },
    );
  }
}
