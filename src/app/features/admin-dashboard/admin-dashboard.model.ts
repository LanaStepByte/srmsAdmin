export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Dish {
  id: number;
  name: string;
  categoryName: string;
  categorySlug: string;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
  price: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  hasNext: boolean;
}

export interface DashboardStats {
  totalDishes?: number;
  activeOrders?: number;
  revenue?: number;
}

export interface CreateDishPayload {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageFileName: string;
  isAvailable: boolean;
}

// Strict Typing Utility Types (Readonly & Required)
export type StrictCreateDishPayload = Readonly<Required<CreateDishPayload>>;

export interface AdminUser {
  name: string;
  role: string;
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}