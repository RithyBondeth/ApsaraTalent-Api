export interface IHealthController {
  checkHealth(): Promise<any> | any;
}
