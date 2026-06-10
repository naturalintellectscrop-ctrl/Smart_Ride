declare module 'mapbox-gl' {
  const mapboxgl: {
    accessToken: string;
    Map: typeof Map;
    Marker: typeof Marker;
    Popup: typeof Popup;
    NavigationControl: typeof NavigationControl;
    GeolocateControl: typeof GeolocateControl;
    ScaleControl: typeof ScaleControl;
    LngLatBounds: typeof LngLatBounds;
  };
  export default mapboxgl;
  
  export class Map {
    constructor(options: any);
    on(event: string, handler: (...args: any[]) => void): this;
    off(event: string, handler?: (...args: any[]) => void): this;
    remove(): void;
    addLayer(layer: any): this;
    addSource(id: string, source: any): this;
    getSource(id: string): any;
    getCanvas(): HTMLCanvasElement;
    resize(): this;
    flyTo(options: any): this;
    setCenter(center: [number, number]): this;
    getCenter(): { lng: number; lat: number };
    getZoom(): number;
    setZoom(zoom: number): this;
    addControl(control: any, position?: string): this;
    removeControl(control: any): this;
    fitBounds(bounds: LngLatBounds, options?: any): this;
    project(lnglat: [number, number]): { x: number; y: number };
  }
  export class Marker {
    constructor(options?: any);
    setLngLat(lngLat: [number, number]): this;
    addTo(map: Map): this;
    remove(): this;
    setPopup(popup: Popup): this;
    getElement(): HTMLElement;
  }
  export class Popup {
    constructor(options?: any);
    setHTML(html: string): this;
    setText(text: string): this;
    setLngLat(lngLat: [number, number]): this;
    addTo(map: Map): this;
    remove(): this;
  }
  export class NavigationControl {
    constructor(options?: any);
  }
  export class GeolocateControl {
    constructor(options?: any);
  }
  export class ScaleControl {
    constructor(options?: any);
  }
  export class LngLatBounds {
    constructor(sw: [number, number], ne: [number, number]);
    extend(lnglat: [number, number]): this;
  }
}
