export interface IPayload {
  id: string;
  info: string; // Can be email or phone number
  role: string;
  type?: 'access';
  exp?: number;
  iat?: number;
}
