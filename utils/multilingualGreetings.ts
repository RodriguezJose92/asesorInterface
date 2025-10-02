export interface MultilingualGreetings {
    [key: string]: {
        greeting: string;
        followUp: string;
        languageDetected: string;
        languageSwitch: string;
    }
}

export const multilingualGreetings: MultilingualGreetings = {
    es: {
        greeting: "Hola, soy Kit-AI. Piéns en mi  como una compañera amigable en tu viaje de cocina. Puedes simplemente hablarme o escribir si lo prefieres — de cualquier manera estaré aquí para guiarte. Juntos exploraremos los electrodomésticos, ideas y detalles que harán realidad la cocina de tus sueños.",
        followUp: "Puedes preguntarme sobre cualquier electrodoméstico que necesites.",
        languageDetected: "He detectado que tu navegador está en español. Hablaré contigo en español.",
        languageSwitch: "Perfecto, ahora hablaré contigo en español."
    },
    en: {
        greeting: "Hi there, I’m Kit-AI. Think of me as a friendly companion for your kitchen journey. You can simply speak, or type if you prefer — either way, I’ll be here to guide you. Together, we’ll explore the appliances, ideas, and details that bring your dream kitchen to life.",
        followUp: "You can ask me about any appliance you need.",
        languageDetected: "I've detected your browser is in English. I'll speak with you in English.",
        languageSwitch: "Perfect, I'll now speak with you in English."
    },
    fr: {
        greeting: "Bonjour ! Je suis votre assistant électroménager. Comment puis-je vous aider aujourd'hui ?",
        followUp: "Vous pouvez me demander des informations sur n'importe quel appareil électroménager.",
        languageDetected: "J'ai détecté que votre navigateur est en français. Je parlerai avec vous en français.",
        languageSwitch: "Parfait, je vais maintenant vous parler en français."
    },
    de: {
        greeting: "Hallo! Ich bin Ihr Haushaltsgeräte-Assistent. Wie kann ich Ihnen heute helfen?",
        followUp: "Sie können mich nach jedem Haushaltsgerät fragen, das Sie benötigen.",
        languageDetected: "Ich habe erkannt, dass Ihr Browser auf Deutsch eingestellt ist. Ich werde mit Ihnen auf Deutsch sprechen.",
        languageSwitch: "Perfekt, ich werde jetzt mit Ihnen auf Deutsch sprechen."
    },
    it: {
        greeting: "Ciao! Sono il tuo assistente per elettrodomestici. Come posso aiutarti oggi?",
        followUp: "Puoi chiedermi informazioni su qualsiasi elettrodomestico di cui hai bisogno.",
        languageDetected: "Ho rilevato che il tuo browser è in italiano. Parlerò con te in italiano.",
        languageSwitch: "Perfetto, ora parlerò con te in italiano."
    },
    pt: {
        greeting: "Olá! Sou seu assistente de eletrodomésticos. Como posso ajudá-lo hoje?",
        followUp: "Você pode me perguntar sobre qualquer eletrodoméstico que precisar.",
        languageDetected: "Detectei que seu navegador está em português. Falarei com você em português.",
        languageSwitch: "Perfeito, agora falarei com você em português."
    },
    ja: {
        greeting: "こんにちは！私はあなたの家電アシスタントです。今日はどのようにお手伝いできますか？",
        followUp: "必要な家電について何でもお聞きください。",
        languageDetected: "ブラウザが日本語に設定されていることを検出しました。日本語でお話しします。",
        languageSwitch: "完璧です。これから日本語でお話しします。"
    },
    ko: {
        greeting: "안녕하세요! 저는 가전제품 어시스턴트입니다. 오늘 어떻게 도와드릴까요?",
        followUp: "필요한 가전제품에 대해 무엇이든 물어보세요.",
        languageDetected: "브라우저가 한국어로 설정되어 있음을 감지했습니다. 한국어로 대화하겠습니다.",
        languageSwitch: "완벽합니다. 이제 한국어로 대화하겠습니다."
    },
    zh: {
        greeting: "你好！我是您的家电助手。今天我能为您做些什么？",
        followUp: "您可以询问任何您需要的家电产品。",
        languageDetected: "我检测到您的浏览器设置为中文。我将用中文与您交流。",
        languageSwitch: "完美，我现在将用中文与您交流。"
    }
};

export const getGreetingForLanguage = (languageCode: string): string => {
    const greeting = multilingualGreetings[languageCode];
    return greeting ? greeting.greeting : multilingualGreetings.en.greeting;
};

export const getLanguageDetectedMessage = (languageCode: string): string => {
    const greeting = multilingualGreetings[languageCode];
    return greeting ? greeting.languageDetected : multilingualGreetings.en.languageDetected;
};

export const getLanguageSwitchMessage = (languageCode: string): string => {
    const greeting = multilingualGreetings[languageCode];
    return greeting ? greeting.languageSwitch : multilingualGreetings.en.languageSwitch;
};

// Language detection patterns for user input
export const languageDetectionPatterns = {
    es: [
        /\b(hola|buenos días|buenas tardes|buenas noches|qué tal|cómo estás|ayuda|necesito|quiero|busco)\b/i,
        /\b(electrodoméstico|lavadora|refrigerador|nevera|cocina|horno|microondas)\b/i
    ],
    en: [
        /\b(hello|hi|good morning|good afternoon|good evening|how are you|help|need|want|looking for)\b/i,
        /\b(appliance|washer|refrigerator|fridge|kitchen|oven|microwave)\b/i
    ],
    fr: [
        /\b(bonjour|salut|bonsoir|comment allez-vous|aide|besoin|veux|cherche)\b/i,
        /\b(électroménager|lave-linge|réfrigérateur|frigo|cuisine|four|micro-ondes)\b/i
    ],
    de: [
        /\b(hallo|guten morgen|guten tag|guten abend|wie geht es|hilfe|brauche|will|suche)\b/i,
        /\b(haushaltsgerät|waschmaschine|kühlschrank|küche|ofen|mikrowelle)\b/i
    ],
    it: [
        /\b(ciao|buongiorno|buonasera|come stai|aiuto|ho bisogno|voglio|cerco)\b/i,
        /\b(elettrodomestico|lavatrice|frigorifero|frigo|cucina|forno|microonde)\b/i
    ],
    pt: [
        /\b(olá|oi|bom dia|boa tarde|boa noite|como está|ajuda|preciso|quero|procuro)\b/i,
        /\b(eletrodoméstico|máquina de lavar|geladeira|cozinha|forno|microondas)\b/i
    ],
    ja: [
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
        /\b(こんにちは|おはよう|こんばんは|助けて|必要|欲しい|探している)\b/i
    ],
    ko: [
        /[\uAC00-\uD7AF]/,
        /\b(안녕하세요|안녕|도움|필요|원해|찾고있어)\b/i
    ],
    zh: [
        /[\u4E00-\u9FFF]/,
        /\b(你好|早上好|下午好|晚上好|帮助|需要|想要|寻找)\b/i
    ]
};

export const detectLanguageFromText = (text: string): string | null => {
    for (const [lang, patterns] of Object.entries(languageDetectionPatterns)) {
        if (patterns.some(pattern => pattern.test(text))) {
            return lang;
        }
    }
    return null;
};