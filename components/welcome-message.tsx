"use client";

import { useRef, useEffect, Dispatch, SetStateAction, useState } from "react";
import { gsap } from "gsap";
import { dataLanguage } from "@/languajes/data";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/pagination";
import { Autoplay, Pagination } from "swiper/modules";
import { initCallAsesorAi } from "./chat-widget";


export function WelcomeMessage({
  status,
  setter,
}: {
  status: boolean;
  setter: Dispatch<SetStateAction<boolean>>;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const { languageCurrent, browserLanguage } = useLanguageStore();
  const [currentView, setCurrentView] = useState<'welcome' | 'cards'>('welcome');
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const [isLastSlide, setIsLastSlide] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  /**
   * Verifica si es la primera vez que el usuario abre la aplicación
   * @returns {boolean} - true si es la primera vez, false si no lo es
   */
  const verifyFirstTime = () =>{
    const firstTime = localStorage.getItem("firstTimeAsesorMudi");
    if (!firstTime) {
      localStorage.setItem("firstTimeAsesorMudi", "true");
      return true;
    }
    return false;
  }

  /**
   * Muestra las cards pedagogicas
   */
  const showCardsPedagogic = () => {
    setCurrentView('cards')
  }

  /**
   * Función que determina si muestra las cards o inicia la llamda con el asesor AI
   */
  const nextAction = () => {
    if (verifyFirstTime()) {
        showCardsPedagogic()
    }else{
      setIsLoadingAI(true); // Activar estado de carga
      initCallAsesorAi()
    }
  }

  /**
   * Maneja el click del botón siguiente/iniciar
   */
  const handleNextClick = () => {
    if (isLastSlide) {
      // Si estamos en la última slide, iniciar el asistente
      setIsLoadingAI(true); // Activar loader en el botón
      initCallAsesorAi()
      // setter(false) se llamará después de que se complete la carga
    } else {
      // Si no estamos en la última slide, avanzar al siguiente
      if (swiperInstance) {
        swiperInstance.slideNext();
      }
    }
  }


  useEffect(() => {
    if (!status) {
      if (divRef.current) {
        gsap.to(divRef.current, {
          x: -3000,
          duration: 1.5,
          ease: "power2.inOut",
          delay: 0.5,
        });
      }
    } else {
      return;
    }
  }, [status]);

  return (
    <div
      ref={divRef}
      className="backgroundWelcomeMessage relative w-[100%] h-[100dvh] top-0 left-0 z-50 flex justify-center items-center flex-col gap-5"
    >
      {currentView === 'welcome' && (
        <div className="absolute flex flex-col justify-center align-middle">
          <div className="flex flex-col items-start gap-2 mb-[50px]">
            <img src="/img/WelcomeSpanish.svg" className="w-[300px]"></img>
            <p className="text-white text-[16px]">TU NUEVO ASISTENTE KITCHEN AID</p>
          </div>
          <img
            onClick={!isLoadingAI ? nextAction : undefined}
            src="/img/speak.png"
            alt="Botón para hablar"
            className={`size-[120px] mx-auto bg-[#c41230] rounded-full transition-all duration-300 ${isLoadingAI ? 'opacity-50 cursor-wait animate-pulse' : 'cursor-pointer'}`}
            style={{
              boxShadow: "0px 0px 100px #FFA32C",
            }}
          ></img>
          <h2 className="w-full text-center text-white mt-[15px]" >
            {isLoadingAI ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando Asesor AI...
              </span>
            ) : "Click para hablar"}
          </h2>
        </div>
      )}

      {currentView === 'cards' && (
        <div className=" my-auto w-full max-w-6xl px-6 grid grid-rows-[20%_60%_20%] gap-4 items-center h-[85dvh]">

          <div className="flex flex-col items-start gap-2 mb-[50px] w-full">
            <img src="/img/WelcomeSpanish.svg" className="w-[70%] mx-auto"></img>
            <p className="text-white text-[14px] mx-auto">TU NUEVO ASISTENTE KITCHEN AID</p>
          </div>

          {/* Swiper Slider */}
          <Swiper
            spaceBetween={10}
            slidesPerView={1}
            className="w-full mb-8"
            modules={[Pagination]}
            pagination={true}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop={false}
            onSwiper={(swiper) => setSwiperInstance(swiper)}
            onSlideChange={(swiper) => {
              setIsLastSlide(swiper.isEnd);
            }}
            style={{
              // @ts-ignore
              "--swiper-navigation-color": "#c41230",
              "--swiper-navigation-size": "22px",
            }}
          >
            <SwiperSlide>
              <div className="flex items-center justify-center">
                <img src="/img/banner1.png" alt="Bienvenida" className="w-full h-48 object-contain" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="flex items-center justify-center">
                <img src="/img/banner2.png" alt="Bienvenida" className="w-full h-48 object-contain" />
              </div>
            </SwiperSlide>
             <SwiperSlide>
              <div className="flex items-center justify-center">
                <img src="/img/banner1.png" alt="Bienvenida" className="w-full h-48 object-contain" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="flex items-center justify-center">
                <img src="/img/banner2.png" alt="Bienvenida" className="w-full h-48 object-contain" />
              </div>
            </SwiperSlide>
           
          </Swiper>

          {/* Botones en columna */}
          <div className="flex flex-col gap-4">
            <button
              onClick={!isLoadingAI ? handleNextClick : undefined}
              disabled={isLoadingAI}
              className={`w-full px-6 py-3 bg-[#c41230] text-white font-semibold rounded-full transition-all duration-300 shadow-lg ${isLoadingAI ? 'opacity-70 cursor-wait' : 'hover:bg-[#a00f26] cursor-pointer'}`}
            >
              {isLoadingAI ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando Asesor AI...
                </span>
              ) : (
                isLastSlide ? "Iniciar KIT AI" : "Siguiente"
              )}
            </button>
            <button
              onClick={() => setCurrentView('welcome')}
              className="w-[max-content] mx-auto py-2 bg-transparent text-white font-semibold  transition-all duration-300 border-b-2"
            >
              Cancelar
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
