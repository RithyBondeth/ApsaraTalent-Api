export interface IResumeTemplate {
  id: string;
  name: string;
  description: string;
  htmlTemplate: string;
  colors: {
    primary: string;
    text: string;
    background: string;
    secondary: string;
  };
}
