export type OrderStatus = 'pending_sync' | 'processing' | 'completed' | 'rejected';
export type UserRole = 'user' | 'admin';

export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  category: string;
  isActive?: boolean;
};

export type CartItem = Product & { quantity: number };

export type Customer = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  priceCents: number;
  imageUrl: string;
};

export type OrderPayload = {
  id: string;
  deviceId: string;
  customer: Customer;
  items: { productId: string; quantity: number; priceCents: number }[];
};

export type StoreOrder = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  customer: Customer;
  items: OrderItem[];
  subtotalCents: number;
  totalCents: number;
  rejectionReason: string | null;
  userId?: string | null;
};