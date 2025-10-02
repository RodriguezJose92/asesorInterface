import { ProductInfo } from '@/lib/types';
import { create } from 'zustand';

interface ImageCarouselState {
  isVisible: boolean;
  productInfo: ProductInfo | null ;
  showCarousel: (product:any) => void;
  hideCarousel: () => void;
  toggleCarousel: () => void;
setterProductInfo: (productInfo: ProductInfo | null) => void;
}

export const useImageCarouselStore = create<ImageCarouselState>((set) => ({
  isVisible: false,
  productInfo:null,
  showCarousel: () => set({ isVisible: true }),
  hideCarousel: () => set({ isVisible: false }),
  toggleCarousel: () => set((state) => ({ isVisible: !state.isVisible })),
  setterProductInfo: (productInfo) => set({ productInfo }),
}));