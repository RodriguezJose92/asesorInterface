export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  type?: "text" | "product" | "carousel" | "multimedia"
  product?: ProductInfo[] | null
  carousel?: CarouselInfo
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
  images: string[]
  productName: string
}
