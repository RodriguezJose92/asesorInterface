"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Box, ImageIcon, Play, Scan } from "lucide-react"

import { gsap } from "gsap"
interface ImageCarouselProps {
  images: string[]
  productName: string
}

export function ImageCarousel({ images, productName }: ImageCarouselProps) {
  const [marginTop, setMarginTop] = useState<string>('0px')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeView, setActiveView] = useState("IMÁGENES")

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const calculateheight = (): void => {
    const el = document.getElementById('headerComponent') as HTMLDivElement | null;
    const heightPx = el ? `${el.getBoundingClientRect().height}px` : '0px';
    console.log(heightPx)
    setMarginTop(heightPx)
  }

  const viewOptions = [
    { id: "3D", label: "3D", icon: Box },
    { id: "IMÁGENES", label: "IMÁGENES", icon: ImageIcon },
    { id: "VIDEO", label: "VIDEO", icon: Play },
    { id: "AR", label: "AR", icon: Scan },
  ]

  const cardRef = useRef(null);

  useEffect(() => {
    calculateheight()
  }, [])

  useEffect(() => {
    setTimeout(() => {
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7 }
        );
      }
    }, 200)

  }, []);

  return (
    <Card
      ref={cardRef}
      className={`w-full  overflow-hidden py-[0px] gap-[0px] absolute top-[${marginTop}] left-[0px] h-[75%] z-[2] flex flex-col items-center justify-center opacity-0 border-[transparent] bg-[#f5f5f5]`}
      id="multiMediaPopUp"
    >

      {/* Image Container */}
      <div className=" py-[0px] height-[100%] ">

        {/** Aqui irir el swiper JS para las iamgenes  */}
        <div className="aspect-square flex items-center justify-center ">
          <img
            src={images[currentIndex] || "/placeholder.svg"}
            alt={`${productName} - imagen ${currentIndex + 1}`}
            className="size-[90%] object-contain rounded-2xl"
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Image Counter and Dots */}
      <div className="px-4 py-[10px] space-y-3">
        {/* Dots Indicator */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-[#c41230]" : "bg-gray-300"
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* OPTIONS */}
      <div className="flex items-center justify-center p-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex gap-1">
          {viewOptions.map((option) => {
            const Icon = option.icon
            const isActive = activeView === option.id
            return (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveView(option.id)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-2 rounded-lg transition-colors w-16 ${isActive ? "bg-red-50 text-red-600 border border-red-200" : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{option.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
