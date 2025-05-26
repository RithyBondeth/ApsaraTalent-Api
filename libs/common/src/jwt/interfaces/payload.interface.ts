export interface IPayload {
    id: string;
    info: string; // Can be email or phone number
    role: string;
    exp?: number;
    iat?: number;
}