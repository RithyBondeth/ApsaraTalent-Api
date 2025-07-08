export const AUTH_SERVICE = {
    NAME: 'AUTH_SERVICE', 
    ACTIONS: {
        LOGIN: { cmd: 'login' },
        LOGIN_OTP: { cmd: 'login-otp' },
        VERIFY_OTP: { cmd: 'verify-otp' },
        REGISTER_EMPLOYEE: { cmd: 'register-employee' },
        REGISTER_COMPANY: { cmd: 'register-company' },
        FORGOT_PASSWORD: { cmd: 'forgot-password' },
        RESET_PASSWORD: { cmd: 'reset-password' },
        REFRESH_TOKEN: { cmd: 'refresh-token' },
        VERIFY_EMAIL: { cmd: 'verify-email' },
        GOOGLE_AUTH: { cmd: 'google-auth' },
        LINKEDIN_AUTH: { cmd: 'linkedin-auth' },
        GITHUB_AUTH: { cmd: 'github-auth' },
        FACEBOOK_AUTH: { cmd: 'facebook-auth' },
    }
}