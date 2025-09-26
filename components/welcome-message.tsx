"use client"

import { useRef, useEffect, Dispatch, SetStateAction } from "react";
import { gsap } from "gsap";
import { dataLanguage } from "@/languajes/data";
import { useLanguageStore } from "@/store/useLanguageStore";

export function WelcomeMessage({ status, setter }: { status: boolean, setter: Dispatch<SetStateAction<boolean>> }) {
  const divRef = useRef<HTMLDivElement>(null);
  const { languageCurrent, browserLanguage } = useLanguageStore()

  useEffect(() => {

    if (!status) {
      if (divRef.current) {

        gsap.to(divRef.current, {
          x: -3000,
          duration: 1.5,
          ease: "power2.inOut",
          delay: .5,
        });

      }
    } else {
      return
    }

  }, [status]);

  return (
    <div
      ref={divRef}
      className="backgroundWelcomeMessage absolute w-[100%] h-[100dvh] top-0 left-0 z-50 flex justify-start items-center flex-col gap-5"
    >

      {/* Loader */}
      <div className="flex items-center flex-col-reverse bg-[#c41230] py-4 px-4 shadow-[0px_0px_10px_#c41230]">

        <p className="text-[10px] text-white">
            {
              languageCurrent && dataLanguage.welcome[languageCurrent as keyof typeof dataLanguage.welcome]?.[1]
            }
          </p>
          <h2 className="font-semibold text-white text-[25px] text-center">
          {
            languageCurrent && dataLanguage.welcome[languageCurrent as keyof typeof dataLanguage.welcome]?.[0]
          }
        </h2>
        <div className="relative flex justify-center align-middle">

          <div className="w-[50px] h-[50px] border-2 border-white  rounded-full flex justify-center align-middle "></div>

          <img src="/img/AIPng.png" className="absolute w-13 h-13 rounded-full "></img>
        </div>
      </div>

      <div className="w-[100%] absolute bottom-0 py-5  gap-[10px] flex flex-col bg-[#000000aa] backdrop-blur-sm shadow-[0px_-5px_10px_#000000cc]">
        <div
          className="text-[45px] font-bold text-white text-center cursor-pointer"
          onClick={() => alert('Mostrar terminos y condiciones')}
        >
          {
            languageCurrent && dataLanguage.welcome[languageCurrent as keyof typeof dataLanguage.welcome]?.[2]
          }
          <p className="text-[#ffffff] text-[12px] font-bold px-4  rounded-lg">
            {
              languageCurrent && dataLanguage.welcome[languageCurrent as keyof typeof dataLanguage.welcome]?.[3]
            }
          </p>
        </div>
      </div>

    </div>

  );
}
