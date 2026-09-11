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

// ==========================================
// [ლექცია 45]: Signal Form-ის მონაცემთა მოდელი
// ==========================================
export interface DishFormModel {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageFileName: string;
  isAvailable: boolean;
}

// API-ზე გასაგზავნი ობიექტის სტრუქტურა
export interface CreateDishPayload {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageFileName: string;
  isAvailable: boolean;
}

// Strict Typing Utility Types:
// Required<T> - ყველა ველი სავალდებულოა
// Readonly<T> - payload-ის property-ების შეცვლას TypeScript compile-time-ზე ზღუდავს
export type StrictCreateDishPayload =
  Readonly<Required<CreateDishPayload>>;

// validate-payload endpoint-ის პასუხი
export interface DishPayloadValidationResult {
  valid: boolean;
  processedAt?: string;
}

export interface AdminUser {
  name: string;
  role: string;
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}
