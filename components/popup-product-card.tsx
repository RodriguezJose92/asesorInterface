"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ExternalLink, Play } from "lucide-react"
import { ProductInfo } from "@/lib/types"

interface ProductCardProps {
  product: ProductInfo
  onMultimediaClick?: () => void
}

export function ProductCard({ product, onMultimediaClick }: ProductCardProps) {
  const {
    sku,
    name,
    brand,
    profilePic,
    description,
    price,
    rate,
    discount,
    images,
    Link3D,
    LinkAR,
    LinkVideo,
    TechnicalSheet,
    FAQS = []
  } = product;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating)
          ? "fill-yellow-400 text-yellow-400"
          : i < rating
            ? "fill-yellow-400/50 text-yellow-400"
            : "text-gray-300"
          }`}
      />
    ))
  };

  const addToCatClick = () => {
    alert('evento conect CMS')

    const payload: any = {
      // payload
    };

    /** Evento CMS */
    window.dispatchEvent(
      new CustomEvent("mudi:add_to_cart", { detail: payload })
    );


  }

  return (
    <Card className="w-[80%] max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden pb-[30px] mb-[20px]">
      {/* Navigation arrows */}
      <div className="relative">

        {/** Mejor poner un SWIPER pero jere dijo que solo iban una foto ...*/}
        {/* <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white">
            <span className="text-gray-600">‹</span>
          </Button>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white">
            <span className="text-gray-600">›</span>
          </Button>
        </div> */}

        {/* Product Image - ref/fake Img - */}
        <div className="bg-gray-50 px-8 flex items-center justify-center">
          <img
            src="https://whirlpoolco.vtexassets.com/arquivos/ids/156345-800-auto?v=638253280514130000&width=800&height=auto&aspect=true"
            alt={name}
            className="w-32 h-32 object-contain"
          />
        </div>
      </div>

      <div className="px-6 py-[0px]">
        {/* Brand */}
        <h3 className="font-bold text-lg text-gray-900">{brand}</h3>

        {/* Product Name */}
        <p className="text-[11px] text-gray-600 leading-relaxed mb-1">{name}</p>

        {/* Model and Item Info */}
        <div className="space-y-1 mb-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span className="text-[11px] truncate overflow-hidden whitespace-nowrap max-w-[90%]">
              {" "}
              <b>Model#</b> {sku}{" "}
            </span>
            <span className="text-[11px] truncate overflow-hidden whitespace-nowrap max-w-[90%]">
              <b>Item#</b> {sku}
            </span>
          </div>
          {/* Location Info */}
          {/* <div className="flex justify-between text-xs text-gray-500">
            <span className="text-[11px]">Aisle# {sku}</span>
            <span className="text-[11px]">Bay# {sku}</span>
          </div> */}
        </div>

        {/* Price Section */}
        <div className="flex justify-around md:flex-row md:items-center md:justify-between mb-1 space-y-1 md:space-y-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-gray-900">${price.toFixed(2)}</span>
            {price && <span className="text-sm text-gray-500 line-through">${price.toFixed(2)}</span>}
          </div>
          {price && <span className="text-sm font-medium text-green-600">Save ${price.toFixed(2)}</span>}
        </div>

        {/* Rating */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="flex items-center">{renderStars(rate)}</div>
          <span className="text-sm text-red-500 font-medium">{price.toLocaleString()}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 border-[#c41230] text-[#c41230] hover:bg-[#c41230] hover:text-white bg-transparent h-10 text-sm"
            onClick={addToCatClick}
          >
            Add to Car
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          <Button className="flex-1 bg-[#c41230] text-white h-10 text-sm" onClick={onMultimediaClick}>
            Multimedia
            <Play className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
