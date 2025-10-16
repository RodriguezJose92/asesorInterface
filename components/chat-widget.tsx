"use client";

import { useState, useEffect, useRef } from "react";
import { ChatButton } from "./chat-button";
import { ChatModal } from "./chat-modal";
import { RealtimeStatus } from "./realtime-status";
import type { Message, CarouselInfo, QuickAction } from "@/lib/types";
import { MultimediaStore } from "@/utils/stores/zustandStore";
import RealtimeService from "./services/RealtimeService";
import { useLanguageStore } from "@/store/useLanguageStore";

export function ChatWidget() {
  const { languageCurrent } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [statusWelcomeMessage, setStatusWelcomeMessage] =
    useState<boolean>(true);

  // Estados para realtime
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const currentAgentMessageIdRef = useRef<string | null>(null);

  // 🎯 Estados para transcripción del usuario EN TIEMPO REAL
  const [currentUserTranscript, setCurrentUserTranscript] =
    useState<string>("");
  const [showUserTranscript, setShowUserTranscript] = useState<boolean>(false);
  const userTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>(""); // Para evitar closures obsoletos

  const isGreetingCommandRef = useRef<boolean>(false);

  /**
   * Traducciones de labels para QuickActions según idioma
   */
  const quickActionsLabels = {
    es: {
      view3d: "¿Ver en 3D?",
      viewAR: "¿Ver en tu espacio (AR)?",
      viewImages: "¿Ver imágenes?",
      viewVideo: "¿Ver video?",
      energyLabel: "¿Ver etiqueta energética?",
      compareConsumption: "¿Comparar consumos?",
      calculateCost: "¿Calcular costo mensual?",
      efficientModels: "¿Ver modelos eficientes?",
      viewInterior: "¿Ver interior en 3D?",
      viewDimensions: "¿Ver dimensiones?",
      capacityVideo: "¿Video de capacidad?",
      compareSizes: "¿Comparar tamaños?",
      buyNow: "¿Comprar ahora?",
      comparePrices: "¿Comparar precios?",
      paymentOptions: "¿Opciones de pago?",
      seeProduct: "¿Ver el producto?",
      viewDemo: "¿Ver demostración?",
      technicalDetails: "¿Detalles técnicos?",
      explore3d: "¿Explorar en 3D?",
      addToCart: "¿Agregar al carrito?",
      fullCatalog: "¿Ver catálogo completo?",
      compareModels: "¿Comparar modelos?",
      demoVideos: "¿Videos demostrativos?",
      viewOffers: "¿Ver ofertas?",
      catalog: "¿Ver catálogo?",
      infoVideos: "¿Videos informativos?",
      compareProducts: "¿Comparar productos?",
      moreInfo: "¿Más información?",
      // Labels específicos por contexto
      fitInSpace: "¿Cabe en mi espacio?",
      exactDimensions: "¿Dimensiones exactas?",
      seeSize: "¿Ver tamaño real?",
      howMuchConsumes: "¿Cuánto consume exactamente?",
      monthlyCost: "¿Costo mensual?",
      saveMoney: "¿Cuánto ahorraría?",
      whatPrice: "¿Cuál es el precio?",
      hasDiscount: "¿Hay descuentos?",
      financing: "¿Puedo financiar?",
      whatColor: "¿Qué colores hay?",
      whatCapacity: "¿Qué capacidades hay?",
      howItWorks: "¿Cómo funciona?",
      seeInAction: "¿Ver en acción?",
      // Preguntas educativas sobre productos
      knowTechnology: "¿Conoces la tecnología?",
      whatIsNoFrost: "¿Sabes qué es No Frost?",
      knowFeatures: "¿Quieres conocer características?",
      howMaintenance: "¿Cómo se mantiene?",
      whyThisTech: "¿Por qué esta tecnología?",
      whatIncludes: "¿Qué incluye?",
      howInstall: "¿Cómo se instala?",
      whatWarranty: "¿Qué garantía tiene?",
      whatBenefits: "¿Qué beneficios tiene?",
      whyBuyThis: "¿Por qué elegir este modelo?",
      technicalSpecs: "¿Ver especificaciones?",
      compareOthers: "¿Comparar con otros?",
    },
    en: {
      view3d: "View in 3D?",
      viewAR: "View in your space (AR)?",
      viewImages: "View images?",
      viewVideo: "View video?",
      energyLabel: "View energy label?",
      compareConsumption: "Compare consumption?",
      calculateCost: "Calculate monthly cost?",
      efficientModels: "View efficient models?",
      viewInterior: "View interior in 3D?",
      viewDimensions: "View dimensions?",
      capacityVideo: "Capacity video?",
      compareSizes: "Compare sizes?",
      buyNow: "Buy now?",
      comparePrices: "Compare prices?",
      paymentOptions: "Payment options?",
      seeProduct: "View product?",
      viewDemo: "View demonstration?",
      technicalDetails: "Technical details?",
      explore3d: "Explore in 3D?",
      addToCart: "Add to cart?",
      fullCatalog: "View full catalog?",
      compareModels: "Compare models?",
      demoVideos: "Demo videos?",
      viewOffers: "View offers?",
      catalog: "View catalog?",
      infoVideos: "Informative videos?",
      compareProducts: "Compare products?",
      moreInfo: "More information?",
      // Context-specific labels
      fitInSpace: "Will it fit in my space?",
      exactDimensions: "Exact dimensions?",
      seeSize: "See real size?",
      howMuchConsumes: "How much does it consume?",
      monthlyCost: "Monthly cost?",
      saveMoney: "How much would I save?",
      whatPrice: "What's the price?",
      hasDiscount: "Any discounts?",
      financing: "Can I finance it?",
      whatColor: "What colors available?",
      whatCapacity: "What capacities available?",
      howItWorks: "How does it work?",
      seeInAction: "See it in action?",
      // Educational questions about products
      knowTechnology: "Know the technology?",
      whatIsNoFrost: "Know what No Frost is?",
      knowFeatures: "Want to know features?",
      howMaintenance: "How is it maintained?",
      whyThisTech: "Why this technology?",
      whatIncludes: "What's included?",
      howInstall: "How to install?",
      whatWarranty: "What warranty?",
      whatBenefits: "What are the benefits?",
      whyBuyThis: "Why choose this model?",
      technicalSpecs: "View specifications?",
      compareOthers: "Compare with others?",
    },
    fr: {
      view3d: "Voir en 3D?",
      viewAR: "Voir dans votre espace (RA)?",
      viewImages: "Voir les images?",
      viewVideo: "Voir la vidéo?",
      energyLabel: "Voir l'étiquette énergétique?",
      compareConsumption: "Comparer les consommations?",
      calculateCost: "Calculer le coût mensuel?",
      efficientModels: "Voir les modèles efficaces?",
      viewInterior: "Voir l'intérieur en 3D?",
      viewDimensions: "Voir les dimensions?",
      capacityVideo: "Vidéo de capacité?",
      compareSizes: "Comparer les tailles?",
      buyNow: "Acheter maintenant?",
      comparePrices: "Comparer les prix?",
      paymentOptions: "Options de paiement?",
      seeProduct: "Voir le produit?",
      viewDemo: "Voir la démonstration?",
      technicalDetails: "Détails techniques?",
      explore3d: "Explorer en 3D?",
      addToCart: "Ajouter au panier?",
      fullCatalog: "Voir le catalogue complet?",
      compareModels: "Comparer les modèles?",
      demoVideos: "Vidéos de démonstration?",
      viewOffers: "Voir les offres?",
      catalog: "Voir le catalogue?",
      infoVideos: "Vidéos informatives?",
      compareProducts: "Comparer les produits?",
      moreInfo: "Plus d'informations?",
      // Labels spécifiques par contexte
      fitInSpace: "Ça rentre dans mon espace?",
      exactDimensions: "Dimensions exactes?",
      seeSize: "Voir la taille réelle?",
      howMuchConsumes: "Combien consomme-t-il?",
      monthlyCost: "Coût mensuel?",
      saveMoney: "Combien économiserais-je?",
      whatPrice: "Quel est le prix?",
      hasDiscount: "Y a-t-il des réductions?",
      financing: "Puis-je le financer?",
      whatColor: "Quelles couleurs disponibles?",
      whatCapacity: "Quelles capacités disponibles?",
      howItWorks: "Comment ça marche?",
      seeInAction: "Le voir en action?",
      // Questions éducatives sur les produits
      knowTechnology: "Connaissez-vous la technologie?",
      whatIsNoFrost: "Savez-vous ce qu'est No Frost?",
      knowFeatures: "Voulez-vous connaître les caractéristiques?",
      howMaintenance: "Comment l'entretenir?",
      whyThisTech: "Pourquoi cette technologie?",
      whatIncludes: "Qu'est-ce qui est inclus?",
      howInstall: "Comment l'installer?",
      whatWarranty: "Quelle garantie?",
      whatBenefits: "Quels sont les avantages?",
      whyBuyThis: "Pourquoi choisir ce modèle?",
      technicalSpecs: "Voir les spécifications?",
      compareOthers: "Comparer avec d'autres?",
    },
  };

  /**
   * Obtiene los labels traducidos según el idioma actual
   */
  const getLabels = () => {
    const lang = languageCurrent as "es" | "en" | "fr";
    return quickActionsLabels[lang] || quickActionsLabels.es;
  };

  /**
   * Determina si se deben mostrar QuickActions para un mensaje dado
   */
  const shouldShowQuickActions = (
    transcript: string,
    currentMessages: Message[]
  ): boolean => {
    const lowerTranscript = transcript.toLowerCase().trim();

    // 🚫 CASO 1: Mensajes muy cortos (menos de 10 caracteres)
    if (lowerTranscript.length < 10) {
      console.log("❌ No QuickActions: mensaje muy corto");
      return false;
    }

    // 🚫 CASO 2: Saludos y despedidas
    const greetings = [
      "hola",
      "hello",
      "hi",
      "hey",
      "buenos días",
      "good morning",
      "buenas tardes",
      "good afternoon",
      "buenas noches",
      "good evening",
      "bonjour",
      "salut",
      "adiós",
      "bye",
      "goodbye",
      "hasta luego",
      "chao",
      "au revoir",
    ];
    if (
      greetings.some(
        (greeting) =>
          lowerTranscript.includes(greeting) && lowerTranscript.length < 30
      )
    ) {
      console.log("❌ No QuickActions: saludo/despedida");
      return false;
    }

    // 🚫 CASO 3: Preguntas de aclaración del agente (termina con ?)
    if (
      lowerTranscript.endsWith("?") &&
      !lowerTranscript.includes("puedo") &&
      !lowerTranscript.includes("gustaría")
    ) {
      console.log("❌ No QuickActions: pregunta del agente");
      return false;
    }

    // 🚫 CASO 4: Mensajes de confirmación simples
    const simpleConfirmations = [
      "perfecto",
      "excelente",
      "muy bien",
      "entendido",
      "claro",
      "ok",
      "vale",
      "perfect",
      "excellent",
      "great",
      "understood",
      "clear",
      "d'accord",
    ];
    if (simpleConfirmations.some((conf) => lowerTranscript === conf)) {
      console.log("❌ No QuickActions: confirmación simple");
      return false;
    }

    // 🚫 CASO 5: Agente está haciendo preguntas de descubrimiento
    const discoveryQuestions = [
      "¿qué buscas",
      "¿qué necesitas",
      "¿cuál es tu presupuesto",
      "¿cuántas personas",
      "what are you looking",
      "what do you need",
      "what's your budget",
      "how many people",
      "que cherchez-vous",
      "de quoi avez-vous besoin",
    ];
    if (discoveryQuestions.some((q) => lowerTranscript.includes(q))) {
      console.log("❌ No QuickActions: pregunta de descubrimiento");
      return false;
    }

    // 🚫 CASO 6: Si ya hay QuickActions muy recientes (últimos 2 mensajes)
    const recentMessages = currentMessages.slice(-3);
    const hasVeryRecentQuickActions =
      recentMessages.filter((m) => m.type === "quick_actions").length >= 1;
    if (
      hasVeryRecentQuickActions &&
      !currentMessages.some((m) => m.type === "product")
    ) {
      console.log("❌ No QuickActions: ya hay QuickActions recientes");
      return false;
    }

    // 🚫 CASO 7: Mensajes de error o disculpas
    const errorMessages = [
      "lo siento",
      "disculpa",
      "perdón",
      "no entiendo",
      "no comprendo",
      "sorry",
      "excuse me",
      "i don't understand",
      "pardon",
      "désolé",
    ];
    if (errorMessages.some((err) => lowerTranscript.includes(err))) {
      console.log("❌ No QuickActions: mensaje de error/disculpa");
      return false;
    }

    // 🚫 CASO 8: Agente está recomendando productos
    const recommendationPhrases = [
      // Español
      "esta es la",
      "este es el",
      "estas son las",
      "estos son los",
      "aquí está",
      "aquí están",
      "te recomiendo",
      "recomiendo",
      "perfecto para ti",
      "perfecta para ti",
      "perfectos para ti",
      "perfectas para ti",
      "ideal para ti",
      "ideales para ti",
      "disponible para ti",
      "disponibles para ti",
      // Inglés
      "this is the",
      "these are the",
      "here is",
      "here are",
      "i recommend",
      "recommend",
      "perfect for you",
      "ideal for you",
      "available for you",
      // Francés
      "voici le",
      "voici la",
      "voici les",
      "je recommande",
      "recommande",
      "parfait pour vous",
      "idéal pour vous",
      "disponible pour vous",
    ];

    if (
      recommendationPhrases.some((phrase) => lowerTranscript.includes(phrase))
    ) {
      console.log("❌ No QuickActions: agente está recomendando productos");
      return false;
    }

    // 🚫 CASO 9: Agente menciona explorar en 3D o AR
    const explorationPhrases = [
      // Español
      "explora",
      "explórala",
      "explóralas",
      "explóralo",
      "explóralos",
      "en 3d",
      "en ar",
      "en realidad aumentada",
      "vista 3d",
      "sección multimedia",
      "multimedia",
      "puedes verla en 3d",
      "puedes verlo en 3d",
      "puedes verla en ar",
      "puedes verlo en ar",
      // Inglés
      "explore",
      "explore it",
      "explore them",
      "in 3d",
      "in ar",
      "in augmented reality",
      "3d view",
      "multimedia section",
      "you can see it in 3d",
      "you can see it in ar",
      // Francés
      "explorez",
      "explorez-le",
      "explorez-la",
      "explorez-les",
      "en 3d",
      "en ra",
      "en réalité augmentée",
      "vue 3d",
      "section multimédia",
    ];

    if (explorationPhrases.some((phrase) => lowerTranscript.includes(phrase))) {
      console.log("❌ No QuickActions: agente menciona exploración 3D/AR");
      return false;
    }

    // ✅ En cualquier otro caso, mostrar QuickActions
    console.log("✅ Mostrando QuickActions");
    return true;
  };

  /**
   * Genera QuickActions contextuales basadas en el contenido del mensaje del agente
   */
  const generateContextualQuickActions = (
    transcript: string,
    currentMessages: Message[]
  ): QuickAction[] => {
    const lowerTranscript = transcript.toLowerCase();
    const actions: QuickAction[] = [];
    const labels = getLabels(); // 🌍 Obtener labels en el idioma actual

    // 🎯 NUEVO: Obtener el último mensaje del USUARIO para análisis contextual
    const lastUserMessage = [...currentMessages]
      .reverse()
      .find((m) => m.isUser);
    const userQuestion = lastUserMessage?.content?.toLowerCase() || "";

    // 🎯 Análisis contextual MEJORADO: combinar respuesta del agente + pregunta del usuario
    const combinedContext = `${lowerTranscript} ${userQuestion}`;

    // Obtener el último producto mencionado si existe
    const lastProductMessage = [...currentMessages]
      .reverse()
      .find((m) => m.type === "product");
    const lastProduct = lastProductMessage?.product?.[0];
    const productSku = lastProduct?.sku;

    // 🎓 Si hay un producto en contexto, generar preguntas EDUCATIVAS contextuales
    if (productSku) {
      // Detectar características/tecnologías específicas en el contexto
      const hasNoFrost =
        combinedContext.includes("no frost") ||
        combinedContext.includes("sin escarcha") ||
        combinedContext.includes("frost free");

      const hasTechnology =
        combinedContext.includes("tecnología") ||
        combinedContext.includes("technology") ||
        combinedContext.includes("technologie") ||
        combinedContext.includes("extendfresh") ||
        combinedContext.includes("max cool") ||
        combinedContext.includes("inverter");

      const hasFeatures =
        combinedContext.includes("características") ||
        combinedContext.includes("features") ||
        combinedContext.includes("functiones");

      const hasInstallation =
        combinedContext.includes("instala") ||
        combinedContext.includes("install") ||
        combinedContext.includes("instalación");

      const hasMaintenance =
        combinedContext.includes("mantenimiento") ||
        combinedContext.includes("limpieza") ||
        combinedContext.includes("maintenance");

      const hasBenefits =
        combinedContext.includes("beneficio") ||
        combinedContext.includes("ventaja") ||
        combinedContext.includes("benefit") ||
        combinedContext.includes("advantage") ||
        combinedContext.includes("avantage") ||
        combinedContext.includes("para qué sirve") ||
        combinedContext.includes("what is it for");

      const hasSpecs =
        combinedContext.includes("especificaciones") ||
        combinedContext.includes("specifications") ||
        combinedContext.includes("spécifications") ||
        combinedContext.includes("detalles técnicos") ||
        combinedContext.includes("technical details");

      const hasComparison =
        combinedContext.includes("comparar") ||
        combinedContext.includes("diferencia") ||
        combinedContext.includes("compare") ||
        combinedContext.includes("difference") ||
        combinedContext.includes("comparer");

      // Generar preguntas educativas contextuales con questionKey para traducción automática
      if (hasNoFrost) {
        actions.push({
          id: "what-nofrost",
          label: labels.whatIsNoFrost,
          action: "more_info",
          questionKey: "what_is_nofrost",
        });
      }

      if (hasTechnology) {
        actions.push({
          id: "know-tech",
          label: labels.knowTechnology,
          action: "more_info",
          questionKey: "know_technology",
        });
        actions.push({
          id: "why-tech",
          label: labels.whyThisTech,
          action: "more_info",
          questionKey: "why_this_tech",
        });
      }

      if (hasFeatures || actions.length < 2) {
        actions.push({
          id: "know-features",
          label: labels.knowFeatures,
          action: "more_info",
          questionKey: "know_features",
        });
      }

      if (hasInstallation) {
        actions.push({
          id: "how-install",
          label: labels.howInstall,
          action: "more_info",
          questionKey: "how_install",
        });
      }

      if (hasMaintenance) {
        actions.push({
          id: "how-maintain",
          label: labels.howMaintenance,
          action: "more_info",
          questionKey: "how_maintenance",
        });
      }

      if (hasBenefits) {
        actions.push({
          id: "benefits",
          label: labels.whatBenefits,
          action: "more_info",
          questionKey: "what_benefits",
        });
        actions.push({
          id: "why-buy",
          label: labels.whyBuyThis,
          action: "more_info",
          questionKey: "why_buy_this",
        });
      }

      if (hasSpecs) {
        actions.push({
          id: "specs",
          label: labels.technicalSpecs,
          action: "more_info",
          questionKey: "technical_specs",
        });
        actions.push({
          id: "details",
          label: labels.technicalDetails,
          action: "more_info",
          questionKey: "technical_specs",
        });
      }

      if (hasComparison) {
        actions.push({
          id: "compare",
          label: labels.compareOthers,
          action: "more_info",
          questionKey: "compare_others",
        });
        actions.push({
          id: "compare-models",
          label: labels.compareModels,
          action: "more_info",
          questionKey: "compare_others",
        });
      }

      // Siempre incluir preguntas sobre contenido/garantía si hay espacio
      if (actions.length < 3) {
        actions.push({
          id: "what-includes",
          label: labels.whatIncludes,
          action: "more_info",
          questionKey: "what_includes",
        });
      }

      if (actions.length < 4) {
        actions.push({
          id: "warranty",
          label: labels.whatWarranty,
          action: "more_info",
          questionKey: "what_warranty",
        });
      }

      // Si aún no hay suficientes acciones, agregar visuales
      if (actions.length < 4) {
        actions.push({
          id: "3d",
          label: labels.view3d,
          action: "show_3d",
          productSku,
        });
        actions.push({
          id: "ar",
          label: labels.viewAR,
          action: "show_ar",
          productSku,
        });
      }

      return actions.slice(0, 4);
    }

    // 🎯 Si NO hay producto, analizar el tema general de la conversación
    const keywords = {
      // Tamaño/Dimensiones - más específico
      size: [
        "tamaño",
        "grande",
        "pequeño",
        "medidas",
        "dimensiones",
        "cabe",
        "espacio",
        "size",
        "big",
        "small",
        "dimensions",
        "measurements",
        "fit",
        "space",
        "taille",
        "grand",
        "petit",
        "mesures",
        "dimensions",
        "rentre",
      ],

      // Consumo energético - más específico
      energy: [
        "energía",
        "consumo",
        "consume",
        "gasto",
        "eficiencia",
        "ahorro",
        "energy",
        "consumption",
        "consumes",
        "efficient",
        "saving",
        "énergie",
        "consommation",
        "efficace",
        "économie",
      ],

      // Capacidad
      capacity: [
        "capacidad",
        "litros",
        "cuánto cabe",
        "cuánto entra",
        "capacity",
        "liters",
        "how much fits",
        "capacité",
        "litres",
        "combien rentre",
      ],

      // Precio
      price: [
        "precio",
        "costo",
        "cuesta",
        "vale",
        "cuánto",
        "descuento",
        "oferta",
        "financiar",
        "price",
        "cost",
        "costs",
        "how much",
        "discount",
        "offer",
        "finance",
        "prix",
        "coûte",
        "combien",
        "réduction",
        "offre",
        "financer",
      ],

      // Color/Apariencia
      appearance: [
        "color",
        "colores",
        "diseño",
        "aspecto",
        "se ve",
        "color",
        "colors",
        "design",
        "looks",
        "couleur",
        "couleurs",
        "design",
        "apparence",
      ],

      // Funcionamiento
      functioning: [
        "funciona",
        "cómo funciona",
        "usar",
        "características",
        "qué hace",
        "works",
        "how does it work",
        "use",
        "features",
        "what does",
        "fonctionne",
        "comment ça marche",
        "utiliser",
        "caractéristiques",
      ],

      // Productos
      products: [
        "nevera",
        "lavadora",
        "refrigerador",
        "washing",
        "refrigerator",
        "appliance",
        "réfrigérateur",
        "machine à laver",
      ],
    };

    // Detectar tema con prioridad (el más específico primero)
    let detectedTopic = "";
    const topicPriority: Array<keyof typeof keywords> = [
      "size",
      "energy",
      "capacity",
      "price",
      "appearance",
      "functioning",
      "products",
    ];

    for (const topic of topicPriority) {
      if (
        keywords[topic].some((word: string) => combinedContext.includes(word))
      ) {
        detectedTopic = topic;
        break;
      }
    }

    // Generar acciones según el tema detectado
    switch (detectedTopic) {
      case "size":
        // 🎯 Acciones específicas sobre TAMAÑO
        actions.push(
          { id: "fit", label: labels.fitInSpace, action: "show_ar" },
          {
            id: "dimensions",
            label: labels.exactDimensions,
            action: "show_images",
          },
          { id: "size-real", label: labels.seeSize, action: "show_3d" },
          {
            id: "compare-sizes",
            label: labels.compareSizes,
            action: "more_info",
          }
        );
        break;

      case "energy":
        // 🎯 Acciones específicas sobre CONSUMO
        actions.push(
          {
            id: "how-much",
            label: labels.howMuchConsumes,
            action: "more_info",
          },
          { id: "monthly", label: labels.monthlyCost, action: "more_info" },
          { id: "save", label: labels.saveMoney, action: "more_info" },
          {
            id: "energy-label",
            label: labels.energyLabel,
            action: "show_images",
          }
        );
        break;

      case "capacity":
        // 🎯 Acciones específicas sobre CAPACIDAD
        actions.push(
          { id: "capacities", label: labels.whatCapacity, action: "more_info" },
          { id: "interior", label: labels.viewInterior, action: "show_3d" },
          { id: "video", label: labels.capacityVideo, action: "show_video" },
          { id: "compare", label: labels.compareSizes, action: "more_info" }
        );
        break;

      case "price":
        // 🎯 Acciones específicas sobre PRECIO
        actions.push(
          { id: "what-price", label: labels.whatPrice, action: "more_info" },
          { id: "discount", label: labels.hasDiscount, action: "more_info" },
          { id: "financing", label: labels.financing, action: "more_info" },
          { id: "buy", label: labels.buyNow, action: "buy" }
        );
        break;

      case "appearance":
        // 🎯 Acciones específicas sobre COLORES/DISEÑO
        actions.push(
          { id: "colors", label: labels.whatColor, action: "show_images" },
          { id: "see-images", label: labels.viewImages, action: "show_images" },
          { id: "3d", label: labels.view3d, action: "show_3d" },
          { id: "ar", label: labels.viewAR, action: "show_ar" }
        );
        break;

      case "functioning":
        // 🎯 Acciones específicas sobre FUNCIONAMIENTO
        actions.push(
          { id: "how-works", label: labels.howItWorks, action: "show_video" },
          { id: "see-action", label: labels.seeInAction, action: "show_video" },
          {
            id: "details",
            label: labels.technicalDetails,
            action: "more_info",
          },
          { id: "demo", label: labels.viewDemo, action: "show_video" }
        );
        break;

      case "products":
        actions.push(
          { id: "catalog", label: labels.fullCatalog, action: "more_info" },
          { id: "compare", label: labels.compareModels, action: "more_info" },
          { id: "video", label: labels.demoVideos, action: "show_video" },
          { id: "offers", label: labels.viewOffers, action: "more_info" }
        );
        break;

      default:
        // Acciones generales si no se detecta un tema específico
        actions.push(
          { id: "catalog", label: labels.catalog, action: "more_info" },
          { id: "video", label: labels.infoVideos, action: "show_video" },
          { id: "compare", label: labels.compareProducts, action: "more_info" },
          { id: "contact", label: labels.moreInfo, action: "more_info" }
        );
    }

    return actions.slice(0, 4); // Máximo 4 acciones
  };

  const filterJsonFromTranscript = (text: string): string => {
    try {
      let filtered = text.replace(/\{[\s\S]*?\}/g, "");

      filtered = filtered.replace(/JsonData/gi, "");
      filtered = filtered.replace(/ProductsCollection/gi, "");
      filtered = filtered.replace(/TextMessage/gi, "");

      filtered = filtered.replace(/\s+/g, " ").trim();

      console.log("🧹 Filtered transcript:", { original: text, filtered });
      return filtered;
    } catch (error) {
      console.warn("⚠️ Error filtering JSON:", error);
      return text;
    }
  };

  const processJsonForMetadata = (text: string) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log("📦 Found JSON in transcript:", jsonMatch[0]);

        try {
          const metadata = JSON.parse(jsonMatch[0]);
          if (metadata.JsonData?.products) {
            console.log(
              "🎯 Processing products from transcript JSON:",
              metadata
            );

            const productMessage: Message = {
              id: Date.now().toString(),
              content: metadata.TextMessage || "Aquí tienes algunos productos:",
              isUser: false,
              timestamp: new Date(),
              type: "product",
              product: metadata.JsonData.products,
            };

            setMessages((prev) => [...prev, productMessage]);
          }
        } catch (parseError) {
          console.warn("Could not parse JSON from transcript:", parseError);
        }
      }
    } catch (error) {
      console.warn("Error processing JSON for metadata:", error);
    }
  };

  useEffect(() => {
    if (isOpen && !isRealtimeConnected) {
      initializeRealtimeConnection();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (userTimeoutRef.current) {
        clearTimeout(userTimeoutRef.current);
      }
    };
  }, []);

  const initializeRealtimeConnection = async () => {
    try {
      console.log("🔄 Connecting to Realtime API...");

      await RealtimeService.connect({
        onConnected: () => {
          console.log("✅ Connected to Realtime API");
          setIsRealtimeConnected(true);

          setTimeout(() => {
            console.log("👋 Triggering agent greeting");

            if (RealtimeService.getSession()) {
              try {
                console.log("🎙️ Sending greeting command to agent");
                isGreetingCommandRef.current = true;
                RealtimeService.sendMessage("Hello");
                setStatusWelcomeMessage(false);
                // Se mutes
                RealtimeService.muteInput(true);
                //  después de 15 segun se desmutea
                setTimeout(() => {
                  RealtimeService.muteInput(false);
                }, 8000);
              } catch (error) {
                console.warn("⚠️ Could not trigger agent greeting:", error);
              }
            }
          }, 1000);
        },

        onDisconnected: () => {
          console.log("🔌 Disconnected from Realtime API");
          setIsRealtimeConnected(false);
        },

        onError: (error) => {
          console.error("❌ Realtime API Error:", error);
          setIsRealtimeConnected(false);
        },

        onMessage: (message) => {
          console.log("📨 Received message:", message);
        },

        onUserTranscription: (transcript: string, isComplete: boolean) => {
          console.log(
            `📝 User: ${isComplete ? "COMPLETE" : "TYPING"} - "${transcript}"`
          );
          console.log("🔍 Current states:", {
            currentUserTranscript,
            showUserTranscript,
            transcriptLength: transcript.length,
            isGreetingCommand: isGreetingCommandRef.current,
          });

          if (isGreetingCommandRef.current) {
            console.log("🙈 Filtering greeting command - not showing in chat");
            isGreetingCommandRef.current = false; // Reset flag después del primer filtro
            return;
          }

          if (isComplete) {
            console.log("✅ Finalizing complete user message");

            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: transcript,
              isUser: true,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];

              if (
                lastMessage &&
                !lastMessage.isUser &&
                currentAgentMessageIdRef.current
              ) {
                const beforeLast = prev.slice(0, -1);
                return [...beforeLast, userMessage, lastMessage];
              } else {
                return [...prev, userMessage];
              }
            });

            setCurrentUserTranscript("");
            setShowUserTranscript(false);

            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
              userTimeoutRef.current = null;
            }
          } else {
            console.log("🎆 Setting live transcription:", transcript);
            setCurrentUserTranscript(transcript);
            setShowUserTranscript(true);
            currentTranscriptRef.current = transcript;

            console.log("🔄 Updated states to:", {
              newTranscript: transcript,
              showFlag: true,
            });

            // Timeout para auto-finalizar
            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
            }

            userTimeoutRef.current = setTimeout(() => {
              console.log("⏰ Timeout triggered - finalizing message");
              const finalTranscript = currentTranscriptRef.current.trim();
              if (finalTranscript) {
                const userMessage: Message = {
                  id: `user-${Date.now()}`,
                  content: finalTranscript,
                  isUser: true,
                  timestamp: new Date(),
                  type: "text",
                };

                setMessages((prev) => [...prev, userMessage]);
                setCurrentUserTranscript("");
                setShowUserTranscript(false);
                currentTranscriptRef.current = "";
              }
            }, 2000);
          }
        },

        onAgentTranscriptionDelta: (messageId: string, delta: string) => {
          console.log("🤖 Agent delta (raw):", delta);

          if (
            currentAgentMessageIdRef.current !== messageId &&
            showUserTranscript &&
            currentUserTranscript.trim()
          ) {
            console.log(
              "🎯 Agent starting - inserting user message BEFORE agent"
            );

            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: currentUserTranscript.trim(),
              isUser: true,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => {
              const withUser = [...prev, userMessage];

              const filteredDelta = filterJsonFromTranscript(delta);
              console.log("🎆 Filtered delta:", filteredDelta);

              const agentMessage: Message = {
                id: messageId,
                content: filteredDelta,
                isUser: false,
                timestamp: new Date(),
                type: "text",
              };

              return [...withUser, agentMessage];
            });

            currentAgentMessageIdRef.current = messageId;

            setCurrentUserTranscript("");
            setShowUserTranscript(false);
            currentTranscriptRef.current = "";

            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
              userTimeoutRef.current = null;
            }

            setIsTyping(false);
          } else if (currentAgentMessageIdRef.current === messageId) {
            const filteredDelta = filterJsonFromTranscript(delta);
            console.log("🎆 Updating with filtered delta:", filteredDelta);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, content: filteredDelta } : msg
              )
            );
          } else if (currentAgentMessageIdRef.current !== messageId) {
            const filteredDelta = filterJsonFromTranscript(delta);

            currentAgentMessageIdRef.current = messageId;

            const agentMessage: Message = {
              id: messageId,
              content: filteredDelta,
              isUser: false,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => [...prev, agentMessage]);
            setIsTyping(false);
          }

          // 📦 PROCESAR JSON para metadata (sin mostrarlo en transcripción)
          processJsonForMetadata(delta);
        },

        onAgentTranscriptionComplete: (
          messageId: string,
          fullTranscript: string
        ) => {
          console.log("🤖 Agent complete (raw):", fullTranscript);

          // 🙏 FILTRAR JSON del transcript completo
          const filteredTranscript = filterJsonFromTranscript(fullTranscript);
          console.log("🎆 Agent complete (filtered):", filteredTranscript);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: filteredTranscript }
                : msg
            )
          );

          // 📦 PROCESAR JSON final para metadata
          processJsonForMetadata(fullTranscript);

          // 🎯 Generar QuickActions automáticamente después de cada respuesta del agente
          // (fallback en caso de que el agente no las genere)
          setTimeout(() => {
            // Verificar si ya hay QuickActions en los últimos mensajes
            const hasRecentQuickActions = messages
              .slice(-2)
              .some((m) => m.type === "quick_actions");

            if (!hasRecentQuickActions && filteredTranscript.trim()) {
              // ✅ Verificar si debemos mostrar QuickActions para este mensaje
              const shouldShow = shouldShowQuickActions(
                filteredTranscript,
                messages
              );

              if (shouldShow) {
                console.log(
                  "🎯 Generando QuickActions automáticas como fallback"
                );

                // Generar acciones contextuales basadas en el contenido
                const actions = generateContextualQuickActions(
                  filteredTranscript,
                  messages
                );

                if (actions.length > 0) {
                  const quickActionsMessage: Message = {
                    id: `quick-${Date.now()}`,
                    content: "",
                    isUser: false,
                    timestamp: new Date(),
                    type: "quick_actions",
                    quickActions: actions,
                  };

                  setMessages((prev) => [...prev, quickActionsMessage]);
                }
              }
            }
          }, 1000); // Esperar 1 segundo para ver si el agente envía las suyas

          currentAgentMessageIdRef.current = null;
        },

        onMetadata: (metadata) => {
          console.log("📦 Products:", metadata);

          // Finalizar mensaje de usuario antes de productos
          if (showUserTranscript && currentUserTranscript.trim()) {
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              content: currentUserTranscript.trim(),
              isUser: true,
              timestamp: new Date(),
              type: "text",
            };

            setMessages((prev) => [...prev, userMessage]);
            setCurrentUserTranscript("");
            setShowUserTranscript(false);

            if (userTimeoutRef.current) {
              clearTimeout(userTimeoutRef.current);
              userTimeoutRef.current = null;
            }
          }

          if (metadata.JsonData?.products) {
            const productMessage: Message = {
              id: Date.now().toString(),
              content: metadata.TextMessage || "Aquí tienes algunos productos:",
              isUser: false,
              timestamp: new Date(),
              type: "product",
              product: metadata.JsonData.products,
            };

            setMessages((prev) => [...prev, productMessage]);
          }
        },

        onQuickActions: (quickActionsData) => {
          console.log("🎯 Quick Actions received:", quickActionsData);

          if (quickActionsData.actions && quickActionsData.actions.length > 0) {
            const quickActionsMessage: Message = {
              id: `quick-${Date.now()}`,
              content: "",
              isUser: false,
              timestamp: new Date(),
              type: "quick_actions",
              quickActions: quickActionsData.actions,
            };

            setMessages((prev) => [...prev, quickActionsMessage]);
          }
        },
      });
    } catch (error) {
      console.error("❌ Failed to initialize Realtime connection:", error);
    }
  };

  /** Aqui falta enlaazar las propiedas que recibo del back */
  const handleMultimediaClick = (productName: string) => {
    const carouselInfo: CarouselInfo = {
      images: [
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156345-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156346-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156347-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
        "https://whirlpoolco.vtexassets.com/arquivos/ids/156348-800-auto?v=638253280514130000&width=800&height=auto&aspect=true",
      ],
      productName: productName,
    };

    const carouselMessage: Message = {
      id: Date.now().toString(),
      content: "",
      isUser: false,
      timestamp: new Date(),
      type: "multimedia",
      carousel: carouselInfo,
    };

    MultimediaStore.getState().setMultimediaStatus(true);
    setMessages((prev) => [...prev, carouselMessage]);
  };

  /**
   * 🎯 NUEVA FUNCIÓN: Manejar selección de productos
   */
  const handleProductSelect = async (
    product: any,
    action: "add_to_cart" | "multimedia"
  ) => {
    if (!isRealtimeConnected || !RealtimeService.getSession()) {
      console.warn("⚠️ No realtime connection available for product selection");
      return;
    }

    try {
      // Crear mensaje interno para el agente
      const actionText =
        action === "add_to_cart"
          ? "agregó al carrito"
          : "quiere ver multimedia de";
      const internalMessage = `El usuario ${actionText} la ${product.name} (${product.sku})`;

      console.log("🛒 Sending product selection to agent:", internalMessage);

      // Enviar mensaje interno al agente (no se muestra en el chat como mensaje de usuario)
      await RealtimeService.sendMessage(internalMessage);
    } catch (error) {
      console.error("❌ Error sending product selection to agent:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);

    const userInput = inputValue;
    setInputValue("");

    if (isRealtimeConnected && RealtimeService.getSession()) {
      try {
        console.log("📤 Sending message to realtime agent:", userInput);
        await RealtimeService.sendMessage(userInput);
        setIsTyping(true);
      } catch (error) {
        console.error("❌ Error sending message to realtime:", error);

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
          isUser: false,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsTyping(false);
      }
    } else {
      const noConnectionMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "No hay conexión activa. Por favor espera a que se establezca la conexión.",
        isUser: false,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, noConnectionMessage]);
      setIsTyping(false);
    }
  };

  const handleClose = () => {
    setShowSurvey(true);
  };

  const handleMinimize = () => {
    setIsOpen(false);
  };

  const handleStartSurvey = () => {
    setShowSurvey(false);
    setIsOpen(false);
  };

  const handleResumeChat = () => {
    setShowSurvey(false);
  };

  const handleCloseChat = async () => {
    setShowSurvey(false);
    setIsOpen(false);

    // Limpiar timeouts
    if (userTimeoutRef.current) {
      clearTimeout(userTimeoutRef.current);
      userTimeoutRef.current = null;
    }

    // Desconectar realtime
    if (isRealtimeConnected) {
      try {
        await RealtimeService.disconnect();
        setIsRealtimeConnected(false);
      } catch (error) {
        console.error("❌ Error disconnecting from Realtime API:", error);
      }
    }

    // Limpiar estados
    setMessages([]);
    setInputValue("");
    setCurrentUserTranscript("");
    setShowUserTranscript(false);
    currentAgentMessageIdRef.current = null;
    currentTranscriptRef.current = "";
    isGreetingCommandRef.current = false; // Limpiar flag de saludo
  };

  return (
    <>
      <ChatButton onClick={() => setIsOpen(true)} isOpen={isOpen} />
      <ChatModal
        isOpen={isOpen}
        onClose={handleClose}
        onMinimize={handleMinimize}
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
        onMultimediaClick={handleMultimediaClick}
        onProductSelect={handleProductSelect}
        isTyping={isTyping}
        currentAgentMessageId={currentAgentMessageIdRef.current}
        showSurvey={showSurvey}
        onStartSurvey={handleStartSurvey}
        onResumeChat={handleResumeChat}
        onCloseChat={handleCloseChat}
        currentUserTranscript={currentUserTranscript}
        showUserTranscript={showUserTranscript}
        setterStatusWelcomeMessage={setStatusWelcomeMessage}
        StatusWelcolmeMessage={statusWelcomeMessage}
      />
      <RealtimeStatus />
    </>
  );
}
