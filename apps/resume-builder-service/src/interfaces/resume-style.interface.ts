export interface IResumeStyle {
  template: string;
  colors?: {
    primary?: string;
    text?: string;
    background?: string;
    secondary?: string;
  };
  fontSize?: {
    base?: string;
    title?: string;
    subtitle?: string;
  };
}
