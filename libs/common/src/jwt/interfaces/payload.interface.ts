export interface IPayload {
    id: string;
    email: string;
    role: string;
    exp?: number;
    iat?: number;
}