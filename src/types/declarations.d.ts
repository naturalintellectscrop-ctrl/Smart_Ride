// ============================================
// Module Declarations for Third-Party Libraries
// ============================================

declare module 'mapbox-gl' {
  export default class Map {
    constructor(options: any);
    on(event: string, handler: (...args: any[]) => void): this;
    remove(): void;
    addLayer(layer: any): this;
    addSource(id: string, source: any): this;
    getCanvas(): HTMLCanvasElement;
    resize(): this;
    flyTo(options: any): this;
    setCenter(center: [number, number]): this;
    getCenter(): { lng: number; lat: number };
    getZoom(): number;
  }
  export class Marker {
    constructor(options?: any);
    setLngLat(lngLat: [number, number]): this;
    addTo(map: Map): this;
    remove(): this;
  }
  export class Popup {
    constructor(options?: any);
    setHTML(html: string): this;
    setLngLat(lngLat: [number, number]): this;
    addTo(map: Map): this;
    remove(): this;
  }
  export class NavigationControl {
    constructor();
  }
  export class GeolocateControl {
    constructor(options?: any);
  }
}

declare module 'bun:test';

declare module 'bcrypt' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function genRounds(salt?: number): Promise<string>;
}

declare module '@capacitor/cli';

// App.tsx is likely a React Native entry - ignore
declare module './app/_layout' {
  const _layout: any;
  export default _layout;
}
