// §10–19 — tipe baris DB (mirror migrasi).
export type Role = "USER" | "ADMIN";
export type ProfileStatus = "ACTIVE" | "SUSPENDED";

export type Pillar =
  "5D_CONSCIOUSNESS" | "ROMANCE_ATTRACTION" | "FINANCIAL_CAREER" | "MANIFESTATION_TOOLS";

export type ProductType = "EBOOK" | "WORKBOOK" | "JOURNAL" | "GUIDE" | "DIGITAL_MATERIAL";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AccessType = "LIFETIME" | "LIMITED";

export type Profile = {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: Role;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  pillar: Pillar;
  product_type: ProductType;
  cover_path: string | null;
  file_path: string | null;
  price: number;
  original_price: number | null;
  download_enabled: boolean;
  access_type: AccessType;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type OrderStatus =
  "PENDING_PAYMENT" | "WAITING_VERIFICATION" | "PAID" | "REJECTED" | "CANCELLED" | "REFUNDED";

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  source: "MEMBER" | "WEBSITE";
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  event_id: string | null;
  item_type: "PRODUCT" | "EVENT";
  title_snapshot: string;
  price_snapshot: number;
  created_at: string;
};

export type PaymentStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type Payment = {
  id: string;
  order_id: string;
  payment_method: "BANK_TRANSFER";
  proof_path: string | null;
  status: PaymentStatus;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AccessSource = "PURCHASE" | "ADMIN" | "PROMO" | "BONUS";
export type AccessStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type ProductAccess = {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string | null;
  source: AccessSource;
  status: AccessStatus;
  granted_at: string;
  expires_at: string | null;
  granted_by: string | null;
  created_at: string;
};

export type EventType = "WEBINAR" | "WORKSHOP" | "CLASS" | "SPECIAL_SESSION";
export type Platform = "ZOOM" | "GOOGLE_MEET" | "YOUTUBE" | "OTHER";
export type EventStatus =
  "DRAFT" | "PUBLISHED" | "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type EventItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  pillar: Pillar;
  event_type: EventType;
  cover_path: string | null;
  platform: Platform;
  meeting_url: string | null;
  start_at: string;
  end_at: string;
  price: number;
  quota: number | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};

export type RegistrationStatus = "REGISTERED" | "CANCELLED" | "ATTENDED" | "NO_SHOW";

export type EventRegistration = {
  id: string;
  event_id: string;
  user_id: string;
  order_id: string | null;
  status: RegistrationStatus;
  registered_at: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export const PILLAR_LABEL: Record<Pillar, string> = {
  "5D_CONSCIOUSNESS": "5D Consciousness",
  ROMANCE_ATTRACTION: "Romance & Attraction",
  FINANCIAL_CAREER: "Financial & Career",
  MANIFESTATION_TOOLS: "Manifestation Tools",
};

export type SiteContentStatus = "DRAFT" | "PUBLISHED";

export type SiteContent = {
  key: string;
  label: string;
  data: Record<string, unknown>;
  status: SiteContentStatus;
  updated_at: string;
};
