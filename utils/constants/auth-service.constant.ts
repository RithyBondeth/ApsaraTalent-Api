export const AUTH_SERVICE = {
    NAME: 'AUTH_SERVICE', 
    ACTIONS: {
        LOGIN: { cmd: 'login' },
        REGISTER: { cmd: 'register' },
        FORGOT_PASSWORD: { cmd: 'forgot-password' },
        RESET_PASSWORD: { cmd: 'reset-password' },
        REFRESH_TOKEN: { cmd: 'refresh-token' },
        VERIFY_EMAIL: { cmd: 'verify-email' },
        GOOGLE_AUTH: { cmd: 'google-auth' },
        LINKEDIN_AUTH: { cmd: 'linkedin-auth' },
    }
}