"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Box,
  ImageIcon,
  Play,
  Scan,
  ShoppingCart,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { QuickAction } from "@/lib/types";
import { EventBusService } from "@/lib/events/EventBusService";
import { EventTypes } from "@/lib/events";
import { useLanguageStore } from "@/store/useLanguageStore";
import RealtimeService from "./services/RealtimeService";

// 🌍 Mapa de preguntas traducidas por questionKey
const QUESTION_TRANSLATIONS: Record<
  string,
  { es: string; en: string; fr: string }
> = {
  know_technology: {
    es: "¿Conoces la tecnología de este producto?",
    en: "Do you know the technology of this product?",
    fr: "Connaissez-vous la technologie de ce produit?",
  },
  what_is_nofrost: {
    es: "¿Sabes qué es la tecnología No Frost?",
    en: "Do you know what No Frost technology is?",
    fr: "Savez-vous ce qu'est la technologie No Frost?",
  },
  know_features: {
    es: "¿Quieres conocer las características principales?",
    en: "Want to know the main features?",
    fr: "Voulez-vous connaître les caractéristiques principales?",
  },
  how_maintenance: {
    es: "¿Cómo se mantiene este producto?",
    en: "How is this product maintained?",
    fr: "Comment entretenir ce produit?",
  },
  why_this_tech: {
    es: "¿Por qué tiene esta tecnología?",
    en: "Why does it have this technology?",
    fr: "Pourquoi a-t-il cette technologie?",
  },
  what_includes: {
    es: "¿Qué incluye este producto?",
    en: "What does this product include?",
    fr: "Qu'est-ce que ce produit inclut?",
  },
  how_install: {
    es: "¿Cómo se instala este producto?",
    en: "How do you install this product?",
    fr: "Comment installer ce produit?",
  },
  what_warranty: {
    es: "¿Qué garantía tiene este producto?",
    en: "What warranty does this product have?",
    fr: "Quelle garantie a ce produit?",
  },
  what_benefits: {
    es: "¿Qué beneficios tiene este producto?",
    en: "What benefits does this product have?",
    fr: "Quels avantages a ce produit?",
  },
  why_buy_this: {
    es: "¿Por qué debería elegir este modelo?",
    en: "Why should I choose this model?",
    fr: "Pourquoi devrais-je choisir ce modèle?",
  },
  technical_specs: {
    es: "¿Puedes mostrarme las especificaciones técnicas?",
    en: "Can you show me the technical specifications?",
    fr: "Pouvez-vous me montrer les spécifications techniques?",
  },
  compare_others: {
    es: "¿Puedes comparar este producto con otros similares?",
    en: "Can you compare this product with similar ones?",
    fr: "Pouvez-vous comparer ce produit avec des produits similaires?",
  },
};

interface QuickActionsCardProps {
  actions: QuickAction[];
  currentProduct?: any;
}

export function QuickActionsCard({
  actions,
  currentProduct,
}: QuickActionsCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { languageCurrent } = useLanguageStore();

  // 🌍 Traducciones del header
  const headerTexts = {
    es: "¿En qué te puedo ayudar?",
    en: "What would you like to do?",
    fr: "Que souhaitez-vous faire?",
  };

  const getHeaderText = () => {
    const lang = languageCurrent as "es" | "en" | "fr";
    return headerTexts[lang] || headerTexts.es;
  };

  const getIcon = (action: QuickAction) => {
    switch (action.action) {
      case "show_3d":
        return <Box className="w-4 h-4" />;
      case "show_images":
        return <ImageIcon className="w-4 h-4" />;
      case "show_video":
        return <Play className="w-4 h-4" />;
      case "show_ar":
        return <Scan className="w-4 h-4" />;
      case "buy":
        return <ShoppingCart className="w-4 h-4" />;
      case "more_info":
        return <Info className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleActionClick = (action: QuickAction) => {
    console.log("🎯 Quick action clicked:", action);

    const eventBus = EventBusService.getInstance({ debug: true });

    setTimeout(() => {
      // Usar los eventos que YA EXISTEN en el sistema
      switch (action.action) {
        case "show_3d":
          console.log("🎮 Emitting SHOW_3D event");
          eventBus.emit(EventTypes.SHOW_3D, {
            product: currentProduct,
            content: action.metadata,
          });
          break;

        case "show_ar":
          console.log("📱 Emitting SHOW_AR event");
          eventBus.emit(EventTypes.SHOW_AR, {
            product: currentProduct,
            content: action.metadata,
          });
          break;

        case "show_video":
          console.log("🎬 Emitting SHOW_VIDEO event");
          eventBus.emit(EventTypes.SHOW_VIDEO, {
            product: currentProduct,
            content: action.metadata,
          });
          break;

        case "show_images":
          console.log("🖼️ Emitting SHOW_IMAGES event");
          eventBus.emit(EventTypes.SHOW_IMAGES, {
            product: currentProduct,
            content: action.metadata,
          });
          break;

        case "buy":
          console.log("🛒 Purchase action");
          // Aquí puedes agregar lógica de compra
          break;

        case "more_info":
          console.log("ℹ️ More info action - Sending question:", action.label);

          // 🌍 Si tiene questionKey, usar la traducción del idioma actual
          let messageToSend = action.label;
          if (action.questionKey && QUESTION_TRANSLATIONS[action.questionKey]) {
            const lang = languageCurrent as "es" | "en" | "fr";
            messageToSend =
              QUESTION_TRANSLATIONS[action.questionKey][lang] || action.label;
            console.log(`🌍 Translated question (${lang}):`, messageToSend);
          }

          // Enviar la pregunta traducida al asistente
          RealtimeService.sendMessage(messageToSend);
          break;
        default:
          RealtimeService.sendMessage("Hello");
      }
    }, 1500);
  };

  return (
    <Card className="w-full max-w-[95%] bg-transparent shadow-none border-none">
      <div className="flex flex-col">
        {/* Header con botón de colapsar */}

        {/* Contenido colapsable */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
          }`}
        >
          <div className="px-4 pb-4 grid grid-cols-1 gap-2 ">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                // onClick={() => handleActionClick(action)}
                className="flex items-center gap-2 justify-start h-auto py-1.5 px-3 text-left bg-red-100 text-red-700 border-none rounded-full w-[max-content] hover:bg-red-100 hover:text-red-700"
              >
                <span className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  {getIcon(action)}
                </span>
                <span className="text-xs font-medium leading-tight">
                  {action.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
