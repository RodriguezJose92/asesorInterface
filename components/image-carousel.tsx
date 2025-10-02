"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Box, ImageIcon, Play, Scan } from "lucide-react"
import { useMultimediaViewStore } from "@/store/useMultimediaViewStore"
import { useImageCarouselStore } from "@/store/useImageCarouselStore"

import { gsap } from "gsap"
interface ImageCarouselProps {
  images: string[]
  productName: string
}

export function ImageCarousel({ images, productName }: any) {

  const cardRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<any>(null)
  const { activeView, setActiveView } = useMultimediaViewStore()
  const { isVisible, productInfo } = useImageCarouselStore()

  const viewOptions = [
    { id: "3D", label: "3D", icon: Box },
    { id: "IMAGENES", label: "IMAGENES", icon: ImageIcon },
    { id: "VIDEO", label: "VIDEO", icon: Play },
    { id: "AR", label: "AR", icon: Scan },
  ]

  const nextImage = () => {
    //@ts-ignore
    setCurrentIndex((prev) => (prev + 1) % productInfo.content.source.length)
  }

  const prevImage = () => {
    //@ts-ignore
    setCurrentIndex((prev) => (prev - 1 + productInfo.content.source.length) % productInfo.content.source.length)
  }

  useEffect(() => {
    activeView == "AR" && window.open('https://viewer.mudi.com.co/v1/ar/?id=398&sku=KRMF706ESS_MEX', '_BLANK')
  }, [activeView])

  // Efecto para actualizar el producto cuando cambie productInfo
  useEffect(() => {
    if (productInfo) {
      console.log('Producto actualizado:', productInfo)
      setCurrentProduct(productInfo)
    }
  }, [productInfo])

  // Animación de entrada y salida
  useEffect(() => {

    if (!cardRef.current) return

    if (isVisible && !isAnimating) {
      setIsAnimating(true)
      gsap.fromTo(
        cardRef.current,
        {
          opacity: 0,
          scale: 0.8,
          y: 50
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          ease: "back.out(1.7)",
          onComplete: () => setIsAnimating(false)
        }
      )
    } else if (!isVisible && !isAnimating) {
      setIsAnimating(true)
      gsap.to(cardRef.current, {
        opacity: 0,
        scale: 0.8,
        y: -50,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => setIsAnimating(false)
      })
    }
  }, [isVisible])

  useEffect(()=>{
    console.log('productoInfoManuelSeLaCome')
    console.log(currentProduct)
  },[currentProduct])

  //   useEffect(()=>{
  //     console.log(currentProduct)
  //  alert('activeView change ')
  // },[activeView])

  if (!isVisible ) return null

  return (

    <Card
      ref={cardRef}
      className={`w-full  overflow-hidden absolute top-0 left-[0px] h-[100dvh] z-[2] flex flex-col items-center justify-center opacity-0 border-[transparent] bg-[#f5f5f5]`}
      id="multiMediaPopUp"

    >

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
                id={`Identity${option.label}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{option.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Image Container */}
      {
        activeView == 'IMAGENES' &&
        <div className=" py-[0px] height-[100%] ">

          {/** Aqui irir el swiper JS para las iamgenes  */}
          <div className="aspect-square flex items-center justify-center ">
            <img
              //@ts-ignore
              src={productInfo.content.source[currentIndex] || "/placeholder.svg"}
              alt={`${productName} - imagen ${currentIndex + 1}`}
              className="size-[90%] object-contain rounded-2xl"
            />
          </div>

          {/* Navigation Arrows */}
          {/** @ts-ignore */}
          {productInfo?.content.source.length > 1 && (
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
      }

      {/* 3D Container */}
      {
        activeView == '3D' &&
        <div className=" py-[0px] height-[100%] ">
          {/**@ts-ignore */}
          <iframe className="w-[100%] h-[60dvh]" src={productInfo.product.Link3D} />

        </div>
      }

      {/* Video Container */}
      {
        activeView == 'VIDEO' &&
        <div className=" py-[0px] height-[100%] ">

          <iframe className="w-[100%] h-[60dvh] rounded-2xl" src="https://www.youtube.com/embed/RYjb4ACUxUU?si=IAFyKV8gK324bnCr" />

        </div>
      }


      {/* AR Container */}
      {
        activeView == 'AR' &&
        <div className=" py-[0px] height-[100%] ">

          <div className="w-[100%] h-[60dvh] rounded-2xl" />

        </div>
      }

      {/* Image Counter and Dots */}
      <div className="px-4 py-[10px] space-y-3">
        {/* Dots Indicator */}
        {/* {images.length > 1 && (
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
        )} */}
      </div>


    </Card>
  )
}
