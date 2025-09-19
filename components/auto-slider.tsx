"use client"


import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/autoplay"
import "swiper/css/pagination"
import { Autoplay } from "swiper/modules";
import './styles/swiper-quickQuestion.css'
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useQuickOptionsStore } from "@/store/useQuickOptionsStore"
import RealtimeService from "./services/RealtimeService"
import { useRealtime } from "@/hooks/useRealtime"
import { useLanguageStore } from "@/store/useLanguageStore"

/** Structure quickQuestion */
const quickOptions = {
  es: [
    {
      title: "NEVERAS",
      subtitle: "¿Te interesa conocer más?",
      message: "Déjame ver todas las neveras que tengas disponibles"
    },
    {
      title: "CAMPANAS",
      subtitle: "¿Quieres saber cuál de todas es la mejor para tus necesidades?",
      message: "¿Tienes campanas?"
    },
    {
      title: "¿LO MÁS TOP DEL MES?",
      subtitle: "Las mejores recomendaciones para ti.",
      message: "¿Cuál es el producto Top del mes?"
    },
    {
      title: "OFERTAS",
      subtitle: "¿Quieres saber de todas las promociones que tenemos para ti?",
      message: "¿Qué ofertas especiales tienes disponibles?"
    }
  ],
  en: [
    {
      title: "REFRIGERATORS",
      subtitle: "Interested in learning more?",
      message: "Show me all the refrigerators you have available"
    },
    {
      title: "RANGE HOODS",
      subtitle: "Want to know which one is best for your needs?",
      message: "Do you have range hoods?"
    },
    {
      title: "TOP PICKS OF THE MONTH?",
      subtitle: "The best recommendations for you.",
      message: "What's the top product of the month?"
    },
    {
      title: "DEALS",
      subtitle: "Want to see all the promotions we have for you?",
      message: "What special deals do you have available?"
    }
  ]
};

interface AutoSliderProps {
  hasMessages: boolean
};

export function AutoSlider() {
  const { viewQuickOptions, setViewQuicOptions, toggleViewQuickOptions } = useQuickOptionsStore()
  const sliderRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { languageCurrent } = useLanguageStore()

  /** send quickQuestion */
  const selectOption = (message: string) => {
    setViewQuicOptions(false)
    RealtimeService.sendMessage(message)
  };

  useEffect(() => {
    if (!sliderRef.current) return;

    if (viewQuickOptions) {
      gsap.to(
        sliderRef.current,
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", display: "block" }
      );
    }

    else {

      gsap.to(
        sliderRef.current, {
        autoAlpha: 0,
        y: 40,
        duration: 0.7,
        ease: "power2.in"
      });

    };

  }, [viewQuickOptions]);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientY);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;
    const isUpSwipe = distance > minSwipeDistance;

    if (isDownSwipe) {
      toggleViewQuickOptions()
    } else if (isUpSwipe) {
      toggleViewQuickOptions()
    }
  };

  return (
    <div
      ref={sliderRef}
      className="relative overflow-hidden rounded-xl w-[95dvw] h-[80px] mx-[auto]"
      style={{ display: viewQuickOptions ? "block" : "none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >

      <Swiper
        slidesPerView={'auto'}
        spaceBetween={30}
        pagination={{
          clickable: true,
        }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        modules={[Autoplay]}
        loop={true}
        className="mySwiperQuickQuestion"
      >
        {quickOptions[languageCurrent].map((group, idx) => (
          <SwiperSlide key={idx}>
            <div
              className={`grid rounded-xl w-[100%]  "grid-cols-2 gap-4"`}
              id="sliderComponent"
            >

              <div

                className="bg-[#efefef44] backdrop-blur-xl rounded-xl px-4 py-2 ml-[5px] border border-white/10 flex flex-col justify-center items-start h-[70px] shadow-[0_0_5px_#cecece] transition-transform duration-200 hover:scale-[1.03]"
                onClick={() => selectOption(group.message)} // 👈 aquí decides si mandar title o subtitle
              >
                <h3 className="font-bold text-black text-[12px] text-left">
                  {group.title}
                </h3>
                <p className="text-[11px] text-black text-left">
                  {group.subtitle}
                </p>
              </div>

            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Overlay de desvanecido derecha: transparente -> blanco */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-r from-transparent to-[#f3f3f4] z-[2] w-[40px]"
      />
    </div>
  )
}
