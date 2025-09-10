"use client"


import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/autoplay"
import "swiper/css/pagination"
import { Autoplay } from "swiper/modules";
import './styles/swiper-quickQuestion.css'

/** Structure quickQuestion */
const quickOptions = [
  {
    title: "NEVERAS",
    subtitle: "¿te interesa conocer más?",
  },
  {
    title: "CAMPANAS",
    subtitle: "¿Quieres saber cuál de todas es la mejor para tus necesidades?",
  },
  {
    title: "¿LO MÁS TOP DEL MES?",
    subtitle: "Las mejores recomendaciones para ti.",
  },
  {
    title: "OFERTAS",
    subtitle: "¿Quieres saber de todas las promociones que tenemos para ti?",
  },
];

interface AutoSliderProps {
  hasMessages: boolean
};

/** send quickQuestion */
const selectOption = (name: string) => {
  alert(`Seleccionar opción y mandarla al Real Time ${name}`)
}

export function AutoSlider({ hasMessages }: AutoSliderProps) {
  if (hasMessages) return null

  // Responsive: 1 slide per view on mobile, 2 on desktop
  const slides = []
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    // Desktop: group by 2
    for (let i = 0; i < quickOptions.length; i += 2) {
      slides.push(quickOptions.slice(i, i + 2))
    }
  } else {
    // Mobile: 1 per slide
    for (let i = 0; i < quickOptions.length; i++) {
      slides.push([quickOptions[i]])
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl w-[95dvw] h-[80px] mx-[auto]">
      <Swiper
        slidesPerView={'auto'}
        spaceBetween={30}
        pagination={{
          clickable: true,
        }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        modules={[Autoplay]}
        loop={true}
        className="mySwiper"
      >
        {slides.map((group, idx) => (
          <SwiperSlide key={idx} >
            <div className={`grid rounded-xl w-[100%] ${group.length === 2 ? "grid-cols-2 gap-4" : ""}`} >
              {group.map((option, j) => (
                <div
                  key={j}
                  className="bg-[#efefef] rounded-xl px-4 py-2 border border-white/10 flex flex-col justify-center items-start h-[70px] shadow-[0_0_5px_#cecece] transition-transform duration-200 hover:scale-[1.03] "
                  onClick={() => selectOption(option.subtitle)}
                >
                  <h3 className="font-bold text-black text-[12px] text-left">{option.title}</h3>
                  <p className="text-[11px] text-black text-left">{option.subtitle}</p>
                </div>
              ))}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Overlay de desvanecido derecha: transparente -> blanco */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-r from-transparent to-[#f3f3f4] z-[2] w-[40px]"
      />
    </div>
  )
}
