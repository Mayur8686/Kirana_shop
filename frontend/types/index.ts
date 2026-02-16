export interface User {
  id: string;
  email: string;
  store_name: string;
  owner_name: string;
  phone: string;
  gst_number?: string;
  store_code: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  min_stock_alert: number;
  category?: string;
  image_base64?: string;
  gst_rate: number;
  created_at: string;
  updated_at: string;
}

export interface BillItem {
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  price: number;
  gst_rate: number;
  item_total: number;
  gst_amount: number;
}

export interface Bill {
  id: string;
  user_id: string;
  bill_number: string;
  items: BillItem[];
  subtotal: number;
  gst_amount: number;
  total: number;
  payment_method: string;
  customer_name?: string;
  created_at: string;
}

export interface DashboardStats {
  today_sales: number;
  today_transactions: number;
  total_products: number;
  low_stock_count: number;
  total_inventory_value: number;
}

export interface CartItem extends Product {
  quantity: number;
}
