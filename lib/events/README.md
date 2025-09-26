# EventBus System Documentation

Un sistema de EventBus genérico implementado con TypeScript y React para comunicación entre componentes de forma desacoplada.

## 🌟 Características

- ✅ **Tipos Genéricos**: Soporte completo para TypeScript con tipos genéricos T
- ✅ **Eventos Tipados**: Enumerador de eventos y payloads específicos
- ✅ **Prioridades**: Sistema de prioridades para el orden de ejecución
- ✅ **Async/Sync**: Soporte para eventos síncronos y asíncronos
- ✅ **React Hooks**: Hooks personalizados para fácil integración
- ✅ **Auto-cleanup**: Limpieza automática de subscripciones
- ✅ **Debug Mode**: Modo debug con logging detallado
- ✅ **Event History**: Historial de eventos (opcional)

## 🚀 Instalación y Setup

### 1. Importar el sistema

```typescript
import { 
  EventBusService, 
  EventTypes, 
  useEventBus,
  Show3DPayload,
  ShowMultimediaPayload
} from '@/lib/events';
```

### 2. Inicializar EventBus (opcional)

```typescript
import { initializeEventBus } from '@/lib/events';

// En tu archivo de configuración principal
const eventBus = initializeEventBus({
  debug: true,
  enableHistory: true
});
```

## 📋 Tipos de Eventos Disponibles

```typescript
enum EventTypes {
  SHOW_3D = 'SHOW_3D',              // Mostrar contenido 3D
  SHOW_MULTIMEDIA = 'SHOW_MULTIMEDIA', // Mostrar multimedia
  HIDE_3D = 'HIDE_3D',              // Ocultar contenido 3D
  HIDE_MULTIMEDIA = 'HIDE_MULTIMEDIA', // Ocultar multimedia
  UI_UPDATE = 'UI_UPDATE',          // Actualizaciones de UI
  USER_INTERACTION = 'USER_INTERACTION' // Interacciones de usuario
}
```

## 💡 Ejemplos de Uso

### 1. Uso Básico con Hook

```tsx
import { useEventBus, EventTypes, Show3DPayload } from '@/lib/events';

function MyComponent() {
  const { emit, subscribe } = useEventBus();

  useEffect(() => {
    // Suscribirse a evento
    const subscription = subscribe<Show3DPayload>(
      EventTypes.SHOW_3D, 
      (event) => {
        console.log('3D Content:', event.payload);
        // Manejar el evento aquí
      }
    );

    return () => subscription.unsubscribe();
  }, [subscribe]);

  const showModel = () => {
    const payload: Show3DPayload = {
      type: '3d-model',
      source: '/models/product.glb',
      title: 'Mi Modelo 3D',
      settings: {
        autoRotate: true,
        enableZoom: true
      }
    };

    emit(EventTypes.SHOW_3D, payload);
  };

  return (
    <button onClick={showModel}>
      Mostrar Modelo 3D
    </button>
  );
}
```

### 2. Hook de Suscripción Simplificado

```tsx
import { useEventSubscription, EventTypes, ShowMultimediaPayload } from '@/lib/events';

function MediaPlayer() {
  const [isVisible, setIsVisible] = useState(false);

  // Auto-cleanup cuando el componente se desmonte
  useEventSubscription<ShowMultimediaPayload>(
    EventTypes.SHOW_MULTIMEDIA,
    (event) => {
      setIsVisible(true);
      console.log('Showing:', event.payload.title);
    }
  );

  useEventSubscription(EventTypes.HIDE_MULTIMEDIA, () => {
    setIsVisible(false);
  });

  return (
    <div>
      {isVisible && <div>Multimedia Player Active</div>}
    </div>
  );
}
```

### 3. Eventos Asíncronos con Prioridades

```tsx
import { useEventBus, EventTypes, EventPriority } from '@/lib/events';

function AdvancedComponent() {
  const { emitAsync, subscribe } = useEventBus();

  useEffect(() => {
    // Suscripción de alta prioridad
    const highPrioritySubscription = subscribe(
      EventTypes.USER_INTERACTION,
      async (event) => {
        console.log('HIGH PRIORITY:', event);
        // Procesamiento crítico
      },
      { 
        priority: EventPriority.HIGH,
        source: 'advanced-component'
      }
    );

    return () => highPrioritySubscription.unsubscribe();
  }, [subscribe]);

  const handleAsyncEvent = async () => {
    try {
      await emitAsync(EventTypes.UI_UPDATE, {
        target: 'main-ui',
        action: 'update',
        data: { loading: true }
      });
      
      console.log('Async event completed!');
    } catch (error) {
      console.error('Event failed:', error);
    }
  };

  return (
    <button onClick={handleAsyncEvent}>
      Trigger Async Event
    </button>
  );
}
```

### 4. Integración en Sistema de Chat

```tsx
import { useEventBus, EventTypes, ShowMultimediaPayload } from '@/lib/events';

function ChatMessage({ message }: { message: string }) {
  const { emit } = useEventBus();

  const showProductVideo = () => {
    const payload: ShowMultimediaPayload = {
      type: 'video',
      source: '/videos/product-demo.mp4',
      title: 'Demostración de Producto',
      settings: {
        autoPlay: true,
        controls: true,
        muted: false
      },
      display: {
        mode: 'modal',
        size: 'large',
        closable: true
      },
      callbacks: {
        onLoad: () => console.log('Video cargado'),
        onError: (error: Error) => console.error('Error:', error),
        onEnd: () => {
          // Auto-cerrar cuando termine el video
          emit(EventTypes.HIDE_MULTIMEDIA, { animate: true });
        }
      }
    };

    emit(EventTypes.SHOW_MULTIMEDIA, payload, {
      source: 'chat-message'
    });
  };

  return (
    <div className="chat-message">
      <p>{message}</p>
      <button 
        onClick={showProductVideo}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        📺 Ver Demo
      </button>
    </div>
  );
}
```

### 5. Componente Listener de Multimedia

```tsx
import { useEventSubscription, EventTypes } from '@/lib/events';
import type { ShowMultimediaPayload, HideMultimediaPayload } from '@/lib/events';

function MultimediaModal() {
  const [content, setContent] = useState<ShowMultimediaPayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEventSubscription<ShowMultimediaPayload>(
    EventTypes.SHOW_MULTIMEDIA,
    (event) => {
      setContent(event.payload);
      setIsVisible(true);
      
      // Ejecutar callback de carga si existe
      event.payload.callbacks?.onLoad?.();
    }
  );

  useEventSubscription<HideMultimediaPayload>(
    EventTypes.HIDE_MULTIMEDIA,
    (event) => {
      if (event.payload.animate) {
        // Animar salida
        setTimeout(() => {
          setIsVisible(false);
          setContent(null);
        }, 300);
      } else {
        setIsVisible(false);
        setContent(null);
      }
      
      // Ejecutar callback de completado si existe
      event.payload.onComplete?.();
    }
  );

  if (!isVisible || !content) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">{content.title}</h2>
          <button 
            onClick={() => emit(EventTypes.HIDE_MULTIMEDIA, { animate: true })}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4">
          {content.type === 'video' && (
            <video
              src={content.source as string}
              controls={content.settings?.controls}
              autoPlay={content.settings?.autoPlay}
              muted={content.settings?.muted}
              className="w-full h-auto"
              onError={() => content.callbacks?.onError?.(new Error('Video load failed'))}
              onEnded={() => content.callbacks?.onEnd?.()}
            />
          )}
          
          {content.type === 'image' && (
            <img
              src={content.source as string}
              alt={content.title}
              className="w-full h-auto"
              onError={() => content.callbacks?.onError?.(new Error('Image load failed'))}
              onLoad={() => content.callbacks?.onLoad?.()}
            />
          )}
          
          {content.description && (
            <p className="mt-2 text-gray-600">{content.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 🔧 Configuración Avanzada

### Debug Mode

```typescript
import { EventBusService } from '@/lib/events';

const eventBus = EventBusService.getInstance();

// Habilitar modo debug
eventBus.updateConfig({
  debug: true,
  enableHistory: true,
  maxHistorySize: 100
});

// Ver estadísticas
console.log('Subscriptions:', eventBus.getSubscriptions());
console.log('History:', eventBus.getEventHistory());
```

### Limpieza Manual

```typescript
import { EventBusService } from '@/lib/events';

const eventBus = EventBusService.getInstance();

// Limpiar todas las suscripciones
eventBus.clear();

// Limpiar suscripciones de un evento específico
eventBus.unsubscribeAll(EventTypes.SHOW_3D);
```

## 📝 Tipos de Payload Disponibles

### Show3DPayload

```typescript
interface Show3DPayload {
  type: '3d-model' | '3d-scene' | '360-view' | 'ar-view' | 'vr-view';
  source: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  settings?: {
    autoRotate?: boolean;
    enableZoom?: boolean;
    enablePan?: boolean;
    cameraPosition?: { x: number; y: number; z: number; };
    background?: string | 'transparent' | 'skybox';
    lighting?: 'natural' | 'studio' | 'custom';
    animations?: {
      autoPlay?: boolean;
      loop?: boolean;
      speed?: number;
    };
  };
  callbacks?: {
    onLoad?: () => void;
    onError?: (error: Error) => void;
    onClick?: (intersection: any) => void;
    onProgress?: (progress: number) => void;
  };
}
```

### ShowMultimediaPayload

```typescript
interface ShowMultimediaPayload {
  type: 'video' | 'audio' | 'image' | 'gallery' | 'carousel' | 'pdf' | 'presentation';
  source: string | string[];
  title?: string;
  description?: string;
  thumbnail?: string;
  settings?: {
    autoPlay?: boolean;
    loop?: boolean;
    controls?: boolean;
    muted?: boolean;
    volume?: number;
    playbackRate?: number;
    gallery?: {
      showThumbnails?: boolean;
      enableFullscreen?: boolean;
      slideInterval?: number;
      showNavigation?: boolean;
    };
  };
  display?: {
    mode?: 'inline' | 'modal' | 'fullscreen' | 'popup';
    size?: 'small' | 'medium' | 'large' | 'fullscreen';
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    closable?: boolean;
    overlay?: boolean;
  };
  callbacks?: {
    onLoad?: () => void;
    onError?: (error: Error) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnd?: () => void;
    onClose?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
  };
}
```

## 🎯 Mejores Prácticas

1. **Usa tipos específicos**: Siempre especifica el tipo genérico `T` en tus suscripciones
2. **Fuente de eventos**: Incluye `source` en tus eventos para debugging
3. **Cleanup automático**: Usa los hooks de React para cleanup automático
4. **Prioridades**: Usa prioridades para eventos críticos del sistema
5. **Error handling**: Siempre maneja errores en callbacks asíncronos
6. **Debug mode**: Habilita debug en desarrollo para mejor visibilidad

## 🚀 Integración Recomendada

```typescript
// En tu componente principal (layout.tsx o App.tsx)
import { useEffect } from 'react';
import { initializeEventBus } from '@/lib/events';

export default function RootLayout() {
  useEffect(() => {
    // Inicializar EventBus con configuración global
    initializeEventBus({
      debug: process.env.NODE_ENV === 'development',
      enableHistory: true
    });
  }, []);

  return (
    // Tu layout aquí
  );
}
```

¡Ya tienes un sistema de EventBus completo y listo para usar! 🎉