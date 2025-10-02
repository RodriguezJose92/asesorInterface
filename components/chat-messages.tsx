"use client"

import './styles/swiperProductCard.css'
import { useRef, useEffect, useState } from "react"
import { gsap } from "gsap"
import { cn } from "@/lib/utils"
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
import { dataLanguage } from "@/languajes/data";
import { useLanguageStore } from '@/store/useLanguageStore'
import { useRefElementsStore } from '@/store/RefElements'

interface ChatMessagesProps {
  messages: Message[]
  onMultimediaClick?: (productName: string) => void
  onProductSelect?: (product: any, action: 'add_to_cart' | 'multimedia') => void
  isTyping?: boolean
  // 🎯 PROPS para transcripción en tiempo real
  currentAgentMessageId?: string | null
  currentUserTranscript?: string
  showUserTranscript?: boolean
}

export function ChatMessages({
  messages,
  onMultimediaClick,
  onProductSelect,
  isTyping,
  currentAgentMessageId,
  currentUserTranscript,
  showUserTranscript
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showPolicy, setShowPolicy] = useState(true);
  const policyRef = useRef<HTMLDivElement>(null);
  const { languageCurrent } = useLanguageStore()

  const { setHiddenMessagePolitices } = useRefElementsStore()

  /** Manejador cierre */
  const handleClose = () => {
    if (policyRef.current) {
      gsap.to(policyRef.current, {
        opacity: 0,
        y: -40,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
          setTimeout(() => setShowPolicy(false), 200); // remove after short delay
        }
      });
    }
  };

  // 🔍 DEBUG: Monitorear props
  useEffect(() => {
    console.log("💬 ChatMessages props:", {
      currentUserTranscript,
      showUserTranscript,
      messagesCount: messages.length
    })
  }, [currentUserTranscript, showUserTranscript, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentUserTranscript])

  useEffect(() => {
    setHiddenMessagePolitices(policyRef.current)
  }, [])

  return (
    <div className="overflow-y-auto p-4 space-y-4">

      {/** Politicas y condiciones */}
      {
        !showPolicy ? <></> :
          <div
            ref={policyRef}
            className={"max-w-[100%] p-3 flex items-start gap-2 bg-gray-200 shadow-lg rounded-md relative"}
            style={{ transition: "opacity 0.5s, transform 0.5s" }}
          >
            <div className="flex flex-col gap-1" >
              <p className="text-[10px] text-center w-[95%] flex flex-col gap-2 mx-auto">
                {
                  //@ts-ignore
                  languageCurrent && dataLanguage.chatMessage[languageCurrent][0]
                }
                <br></br>
                <span className='w-full bg-white/70 font-bold p-1 rounded-sm'>
                  {
                    //@ts-ignore
                    languageCurrent && dataLanguage.chatMessage[languageCurrent][1]
                  }
                </span>
              </p>
            </div>
          </div>

      }

      {messages.map((message) => (
        <div key={message.id} className={cn("flex", message.isUser ? "justify-end" : "justify-start")}>
          {
 message.type === "product" && message.product ? (
              <>
                <div className="max-w-full w-full pb-[0px]">
                  <Swiper
                    spaceBetween={10}
                    slidesPerView={1}
                    className="w-full productSliderMudi"
                    modules={[Autoplay, Pagination]}

                    pagination={true}
                    // autoplay={{ delay: 3000, disableOnInteraction: false }}
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
                          position={idx}
                          onMultimediaClick={() => onMultimediaClick?.(item.name || "")}
                          onProductSelect={onProductSelect}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </>
            ) : (
              // 🎯 MENSAJE DE TEXTO LIMPIO
              (() => {
                const isAgentTyping = !message.isUser && message.id === currentAgentMessageId

                return (
                  <div
                    className={cn(
                      "max-w-[95%] p-3 rounded-2xl flex items-start gap-2",
                      message.isUser
                        ? "bg-[#c41230] text-white justify-end"
                        : "bg-white/70 text-gray-800 border border-white/30 justify-start"
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

                    <div className="flex flex-col gap-1">
                      <p className="text-sm">
                        {message.content}
                        {/* 🎯 Cursor simple solo para agente */}
                        {isAgentTyping && (
                          <span className="inline-block w-0.5 h-4 ml-1 bg-current opacity-70">|</span>
                        )}
                      </p>
                    </div>

                  </div>
                )
              })()
            )}
        </div>
      ))}

      {/* 🎯 TRANSCRIPCIÓN DEL USUARIO EN TIEMPO REAL - AL FINAL */}
      {showUserTranscript && currentUserTranscript && (() => {
        console.log("💡 Rendering live user transcript:", currentUserTranscript)
        return (
          <div className="flex justify-end">
            <div className="max-w-[95%] p-3 rounded-2xl bg-[#c41230] text-white">
              <p className="text-sm">
                {currentUserTranscript}
                <span className="inline-block w-0.5 h-4 ml-1 bg-current opacity-70">|</span>
              </p>
            </div>
          </div>
        )
      })()}

      {/* Indicador de typing del agente */}
      {isTyping && <TypingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  );

};

