export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: "text" | "product" | "carousel" | "multimedia" | "quick_actions";
  product?: ProductInfo[] | null;
  carousel?: CarouselInfo;
  quickActions?: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  action:
    | "show_3d"
    | "show_ar"
    | "show_video"
    | "show_images"
    | "buy"
    | "more_info"
    | "compare"
    | "custom";
  icon?: string;
  productSku?: string;
  metadata?: any;
  questionKey?: string; // Identificador único de la pregunta para traducción
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ProductInfo {
  sku: string;
  name: string;
  brand: string;
  profilePic: string;
  description: string;
  price: number;
  rate: number;
  discount?: number;
  images: string[];
  Link3D?: string;
  LinkAR?: string;
  LinkVideo?: string;
  TechnicalSheet?: string;
  FAQS?: FAQItem[];
}

export interface CarouselInfo {
  images: string[];
  productName: string;
}
