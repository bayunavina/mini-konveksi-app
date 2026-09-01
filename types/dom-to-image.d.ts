declare module 'dom-to-image' {
  export function toPng(node: HTMLElement, options?: {
    quality?: number;
    pixelRatio?: number;
    width?: number;
    height?: number;
    style?: Record<string, string>;
  }): Promise<string>;
  
  export function toJpeg(node: HTMLElement, options?: {
    quality?: number;
    pixelRatio?: number;
  }): Promise<string>;
  
  export function toSvg(node: HTMLElement, options?: any): Promise<string>;
}
