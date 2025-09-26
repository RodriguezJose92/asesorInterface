"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ExternalLink, Play, ShoppingCart } from "lucide-react"
import { ProductInfo } from "@/lib/types"

interface ProductCardProps {
  product: ProductInfo
  position: number
  onMultimediaClick?: () => void
  onProductSelect?: (product: ProductInfo, action: 'add_to_cart' | 'multimedia') => void
}

export function ProductCard({ product, position , onMultimediaClick, onProductSelect }: ProductCardProps) {
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

  const renderStars = (rating: number ) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.floor(rating)
          ? "fill-yellow-400 text-yellow-400"
          : i < rating
            ? "fill-yellow-400/50 text-yellow-400"
            : "text-gray-300"
          }`}
      />
    ))
  };

  const addToCatClick = () => {

    // onProductSelect?.(product, 'add_to_cart');


    // const payload: any = {
    //   product: product
    // };

    // window.dispatchEvent(
    //   new CustomEvent("mudi:add_to_cart", { detail: payload })
    // );

    alert('conectando con sistema CMS ...')
  }

  const handleMultimediaClick = () => {

    onProductSelect?.(product, 'multimedia');

    onMultimediaClick?.();
  }

  return (
    <Card className="w-[90%] max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden pb-[30px] mb-[20px] relative">
      <h1 className="absolute top-2 left-2 rounded-full py-1.5 bg-black/50 text-white px-2  z-[1000] text-[12px]">#{position + 1}</h1>
      {/* Navigation arrows */}
      <div className="relative h-[150px] flex w-full">

        {/* Product Image - ref/fake Img - */}
        <div className="bg-gray-50 px-8 flex items-center justify-center w-[100%] h-[150px] ">
          <img
            src="https://whirlpoolco.vtexassets.com/arquivos/ids/156345-800-auto?v=638253280514130000&width=800&height=auto&aspect=true"
            alt={name}
            className=""
            style={{
              height: '10px !important'
            }}
          />
        </div>
      </div>

      <div className="px-6 py-[0px]">
        {/* Brand */}
        <h3 className="font-bold text-[14px] text-gray-900">{brand}</h3>

        {/* Product Name */}
        <p className="text-[11px] text-gray-600 text-left leading-relaxed ">{name}</p>

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

        {/* Rating */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="flex items-center">{renderStars(rate)}</div>
          <span className="text-sm text-red-500 font-medium">{price.toLocaleString()}</span>
        </div>

        {/* Price Section */}
        <div className="flex justify-around md:flex-row md:items-center md:justify-between mb-1 space-y-1 md:space-y-0 items-center">
          <div className="flex items-center gap-2 justify-center">
            <span className="text-[11px] font-bold text-gray-900">${price.toFixed(2)}</span>
            {price && <span className="text-[11px] text-gray-500 line-through">${price.toFixed(2)}</span>}
          </div>
          {price && <span className="text-[11px] font-bold text-green-600 ">Save ${price / 2}</span>}
        </div>

        {/* Action Buttons */}
        <div
          // className="flex flex-col gap-2"
          className="grid grid-cols-2 gap-2 mt-[10px]"
        >
          <Button
            variant="outline"
            className="flex-1 border-[#c41230] text-[#c41230] hover:bg-[#c41230] hover:text-white bg-transparent h-8 text-[12px]"
            onClick={addToCatClick}
          >
            Add to Car
            <ShoppingCart className="w-3 h-3 " />
          </Button>
          <Button className="flex-1 bg-[#c41230] text-white h-8 text-[12px] btnMultimediaAsesorAi" onClick={handleMultimediaClick} >
            Multimedia
            <Play className="w-3 h-3 " />
          </Button>
        </div>
      </div>
    </Card>
  )
}
