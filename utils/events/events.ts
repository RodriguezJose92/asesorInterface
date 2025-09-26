import { useRefElementsStore } from '@/store/RefElements'
import { useMultimediaViewStore } from '@/store/useMultimediaViewStore'
import { EventBusService } from '@/lib/events/EventBusService';
import { EventTypes } from '@/lib/events';
import { ProductCard } from '@/components/popup-product-card';
import { ProductInfo } from '@/lib/types';

class Events {
    // Método para esconder el mensaje de políticas de privacidad
    hiddenMessagePolitices() {
      const element = useRefElementsStore.getState().hiddenMessagePolitices;
    
      if (element) {
        element.querySelector("h1")?.click();
      }
    }
  
    // Método para mutear
    muted() {
      const element = useRefElementsStore.getState().muted;
      if (element ) {
        element.click();
      }
    }
  
    // Método para finalizar la llamada
    stopCall() {
      const element = useRefElementsStore.getState().stopCall;
      if (element ) {
        element.click();
      }
    }
  
    shop() {
      console.log("Ejecutando shop...");
    }
  
    multimedia(productInfo: ProductInfo | null = null ) {
      const arrcards = document.querySelectorAll('.productSliderMudi')
      const currentCard = arrcards[arrcards.length - 1]
      const arr:  NodeListOf<HTMLButtonElement> | never[] =  currentCard.querySelectorAll(".btnMultimediaAsesorAi") ? [] : currentCard.querySelectorAll(".btnMultimediaAsesorAi")
      if(arr.length >0){
        arr[arr.length - 1].click()
      }
    }
  
    view3D(ProductInfo: ProductInfo) {
      console.log("[EventBus] Evento para ver 3D recibido:", ProductInfo);
      this.multimedia()
      useMultimediaViewStore.getState().setActiveView("3D")
    }
  
    viewImages() {
      this.multimedia()
      useMultimediaViewStore.getState().setActiveView("IMAGENES")
    }
  
    viewTechinalDetails() {
      this.multimedia()
      useMultimediaViewStore.getState().setActiveView("TECNICOS")
    }
  
    viewAR() {
      this.multimedia()
      useMultimediaViewStore.getState().setActiveView("AR")
    }

    viewVideo() {
      this.multimedia()
      useMultimediaViewStore.getState().setActiveView("VIDEO")
      
    }

    // closeCarousel() {
    //   const element = document.getElementById('multiMediaPopUp') as HTMLDivElement;
    //   setTimeout(() => {
    //     element && element.remove();
    //   }, 2000);
      
    // }
  
    hiddenQuickQuestions() {
      console.log("Ejecutando hiddenQuickQuestions...");
    }
}
  
// Instancia de la clase
const events = new Events();

// Set para rastrear los event listeners ya registrados
const registeredEvents = new Set<string>();

// Función para crear listeners dinámicos
export function registerEventListeners() {
  console.log("[EventBus] Registrando event listeners...");
  const eventBus = EventBusService.getInstance({ debug: true });
  
  eventBus.subscribe<ProductInfo>(EventTypes.SHOW_3D, (event: any) => events.view3D(event.payload));
  eventBus.subscribe<ProductInfo>(EventTypes.SHOW_MULTIMEDIA, (event: any) => events.multimedia(event.payload));
  eventBus.subscribe(EventTypes.HIDE_3D, () => events.hiddenQuickQuestions());
  eventBus.subscribe(EventTypes.HIDE_MULTIMEDIA, () => events.hiddenQuickQuestions());
  eventBus.subscribe(EventTypes.UI_UPDATE, () => events.hiddenMessagePolitices());
  eventBus.subscribe(EventTypes.USER_INTERACTION, () => events.muted());
}

export function unSubscribeEventListeners() {
  const eventBus = EventBusService.getInstance({ debug: true });
  eventBus.unsubscribeAll(EventTypes.SHOW_3D);
  eventBus.unsubscribeAll(EventTypes.SHOW_MULTIMEDIA);
  eventBus.unsubscribeAll(EventTypes.HIDE_3D);
  eventBus.unsubscribeAll(EventTypes.HIDE_MULTIMEDIA);
  eventBus.unsubscribeAll(EventTypes.UI_UPDATE);
  eventBus.unsubscribeAll(EventTypes.USER_INTERACTION);
}


// Registrar todos los métodos como listeners
// registerEventListeners();

  // Ejemplo: lanzar un evento manual
// document.dispatchEvent(new Event("hiddenQuickQuestions"));