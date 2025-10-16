"use client";

import { useRef, useEffect, Dispatch, SetStateAction } from "react";
import { gsap } from "gsap";
import { dataLanguage } from "@/languajes/data";
import { useLanguageStore } from "@/store/useLanguageStore";

export function WelcomeMessage({
  status,
  setter,
}: {
  status: boolean;
  setter: Dispatch<SetStateAction<boolean>>;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const { languageCurrent, browserLanguage } = useLanguageStore();

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
      <div className="absolute flex flex-col justify-center align-middle">
        <img
          src="/img/speak.png"
          alt="Botón para hablar"
          className="size-[120px]  bg-[#c41230] rounded-full"
          style={{
            boxShadow: "0px 0px 100px #FFA32C",
          }}
        ></img>
        <h2 className="w-full text-center text-white mt-[15px]">
          Click para hablar
        </h2>
      </div>
    </div>
  );
}
