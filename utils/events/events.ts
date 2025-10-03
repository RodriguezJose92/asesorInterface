import { useRefElementsStore } from '@/store/RefElements'
import { useMultimediaViewStore } from '@/store/useMultimediaViewStore'
import { EventBusService } from '@/lib/events/EventBusService';
import { EventTypes } from '@/lib/events';
import { ProductCard } from '@/components/popup-product-card';
import { ProductInfo } from '@/lib/types';
import { useImageCarouselStore} from "@/store/useImageCarouselStore"

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

      
      const showCarousel  = useImageCarouselStore.getState().showCarousel
      const setterProductInfo = useImageCarouselStore.getState().setterProductInfo
      showCarousel(productInfo)
      setterProductInfo(productInfo)



      // const arrcards = document.querySelectorAll('.productSliderMudi')
      // const currentCard = arrcards[arrcards.length - 1]
      // const arr:  NodeListOf<HTMLButtonElement> | never[] =  currentCard.querySelectorAll(".btnMultimediaAsesorAi") ? [] : currentCard.querySelectorAll(".btnMultimediaAsesorAi")
      // if(arr.length >0){
      //   arr[arr.length - 1].click()
      // }

    }
  
    view3D(productInfo: ProductInfo | null = null ) {
      this.multimedia(productInfo)
      useMultimediaViewStore.getState().setActiveView("3D")
    }
  
    viewImages(productInfo: ProductInfo | null = null ) {
      this.multimedia(productInfo)
      useMultimediaViewStore.getState().setActiveView("IMAGENES")
    }
  
    viewTechinalDetails(productInfo: ProductInfo | null = null ) {
      this.multimedia(productInfo)
      useMultimediaViewStore.getState().setActiveView("TECNICOS")
    }
  
    viewAR(productInfo: ProductInfo | null = null ) {
      this.multimedia(productInfo)
      useMultimediaViewStore.getState().setActiveView("AR")
    }

    viewVideo(productInfo: ProductInfo | null = null ) {
      this.multimedia(productInfo)
      useMultimediaViewStore.getState().setActiveView("VIDEO")
      
    }

    closeCanvas(){
      alert('saludando')
      useImageCarouselStore.getState().hideCarousel()
    }

    // closeCarousel() {
    //   const element = document.getElementById('multiMediaPopUp') as HTMLDivElement;
    //   setTimeout(() => {
    //     element && element.remove();
    //   }, 2000);
      
    // }
  
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
  eventBus.subscribe<ProductInfo>(EventTypes.SHOW_IMAGES, (event: any) => events.viewImages(event.payload));
  eventBus.subscribe<ProductInfo>(EventTypes.SHOW_VIDEO, (event: any) => events.viewVideo(event.payload));
  eventBus.subscribe(EventTypes.UI_UPDATE, () => events.hiddenMessagePolitices());
  eventBus.subscribe(EventTypes.MUTED, () => events.muted());
}

export function unSubscribeEventListeners() {
  const eventBus = EventBusService.getInstance({ debug: true });
  eventBus.unsubscribeAll(EventTypes.SHOW_3D);
  eventBus.unsubscribeAll(EventTypes.SHOW_MULTIMEDIA);
  eventBus.unsubscribeAll(EventTypes.SHOW_IMAGES);
  eventBus.unsubscribeAll(EventTypes.SHOW_VIDEO);
  eventBus.unsubscribeAll(EventTypes.HIDE_3D);
  eventBus.unsubscribeAll(EventTypes.HIDE_MULTIMEDIA);
  eventBus.unsubscribeAll(EventTypes.UI_UPDATE);
  eventBus.unsubscribeAll(EventTypes.USER_INTERACTION);
}


// Registrar todos los métodos como listeners
// registerEventListeners();

  // Ejemplo: lanzar un evento manual
// document.dispatchEvent(new Event("hiddenQuickQuestions"));