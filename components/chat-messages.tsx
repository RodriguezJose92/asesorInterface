"use client"

import './styles/swiperProductCard.css'
import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
// import { ProductCard } from "./popup-product-card"
import { ProductCard } from './popup-product-card'
import { ImageCarousel } from "./image-carousel"
import { TypingIndicator } from "./typing-indicator"
import type { Message } from "@/lib/types"
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/autoplay"
import "swiper/css/pagination"
import "swiper/css/navigation";
import { Navigation, Autoplay, Pagination } from "swiper/modules";

interface ChatMessagesProps {
  messages: Message[]
  onMultimediaClick?: (productName: string) => void
  isTyping?: boolean // Added isTyping prop to show typing indicator
}

const algo = (message: any) => {
  console.log(message)
  return <></>
}

export function ChatMessages({ messages, onMultimediaClick, isTyping }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping]) // Added isTyping to dependency array

  return (
    <div className="overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id} className={cn("flex", message.isUser ? "justify-end" : "justify-start")}>
          {
            message.type === "multimedia" && message.carousel ? (
              <div className="max-w-[100%]">
                <ImageCarousel images={message.carousel.images} productName={message.carousel.productName} />
              </div>
            ) : message.type === "product" && message.product ? (
              <>

                <div className="max-w-full w-full pb-[0px]">
                  <Swiper
                    spaceBetween={10}
                    slidesPerView={1}
                    className="w-full productSliderMudi"
                    modules={[Navigation, Autoplay, Pagination]}
                    navigation={true}
                    pagination={true}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    loop={true}
                    style={{
                      // @ts-ignore
                      "--swiper-navigation-color": "#c41230",
                      "--swiper-navigation-size": "22px"
                    }}
                  >

                    {(message.product ?? []).map((item, idx) => (
                      <SwiperSlide key={idx}>
                        <ProductCard
                          product={item}
                          onMultimediaClick={() => onMultimediaClick?.(item.name || "")}
                        />
                      </SwiperSlide>
                    ))}

                  </Swiper>
                </div>
              </>
            ) : (
              <div
                className={cn(
                  "max-w-[95%] p-3 rounded-2xl flex items-start gap-2",
                  message.isUser ? "bg-[#c41230] text-white justify-end" : "bg-white/70 text-gray-800 border border-white/30 justify-start",
                )}
              >
                {!message.isUser && (
                  <img
                    src="/img/AIPng.png"
                    alt="Bot"
                    className="w-7 h-7 rounded-full object-cover bg-[#c41230]"
                    style={{ minWidth: 28, minHeight: 28 }}
                  />
                )}
                <p className="text-sm">{message.content}</p>
              </div>

            )}
        </div>
      ))}

      {isTyping && <TypingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  )
}
