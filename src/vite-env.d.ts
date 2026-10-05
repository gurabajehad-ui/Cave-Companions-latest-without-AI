/// <reference types="vite/client" />

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module 'motion/react' {
  export * from 'framer-motion';
}

declare module 'adhan' {
  const content: any;
  export default content;
  export const Coordinates: any;
  export const CalculationMethod: any;
  export const PrayerTimes: any;
  export const SunnahTimes: any;
  export const Qibla: any;
  export const Madhab: any;
  export const HighLatitudeRule: any;
}

declare module 'leaflet' {
  const content: any;
  export default content;
  export const icon: any;
  export const divIcon: any;
  export const latLngBounds: any;
  export const polyline: any;
  export const map: any;
  export const tileLayer: any;
  export const marker: any;
  export const control: any;
  export type Map = any;
  export type Marker = any;
  export type LeafletMouseEvent = any;
}

declare namespace L {
  const icon: any;
  const divIcon: any;
  const latLngBounds: any;
  const polyline: any;
  const map: any;
  const tileLayer: any;
  const marker: any;
  const control: any;
  type Map = any;
  type Marker = any;
  type LatLng = any;
  type Icon = any;
  type LatLngExpression = any;
  type DivIcon = any;
  type Polyline = any;
  type LatLngTuple = [number, number];
  type LeafletMouseEvent = any;
}

declare module 'react-leaflet' {
  export const MapContainer: any;
  export const TileLayer: any;
  export const Marker: any;
  export const Popup: any;
  export const Polyline: any;
  export const useMap: any;
  export const useMapEvents: any;
  export const Tooltip: any;
  export const Circle: any;
}

declare module 'qrcode' {
  const content: any;
  export default content;
  export const toDataURL: any;
}

declare module 'html5-qrcode' {
  export class Html5Qrcode {
    isScanning?: boolean;
    constructor(elementId: string, config?: any);
    start(camera: any, config: any, qrCodeSuccessCallback: any, qrCodeErrorCallback?: any): Promise<any>;
    stop(): Promise<any>;
    clear(): Promise<any>;
    static getCameras(): Promise<any[]>;
  }
  export const Html5QrcodeSupportedFormats: any;
}



