require('dotenv').config();

export default class Configuration {
    static isValid() {
        return (
            process.env.SF_USERNAME &&
            process.env.SF_PASSWORD &&
            process.env.SF_TOKEN &&
            process.env.SF_LOGIN_URL
        );
    }

    static getSfLoginUrl() {
        return process.env.SF_LOGIN_URL;
    }

    static getSfUsername() {
        return process.env.SF_USERNAME;
    }

    static getSfSecuredPassword() {
        return process.env.SF_PASSWORD + process.env.SF_TOKEN;
    }

    static isSerialDebugModeEnabled() {
        return (
            process.env.SERIAL_DEBUG_MODE_ENABLED &&
            process.env.SERIAL_DEBUG_MODE_ENABLED.toLowerCase() === 'true'
        );
    }

    static isMockArm() {
        return (
            process.env.MOCK_ARM_ENABLED &&
            process.env.MOCK_ARM_ENABLED.toLowerCase() === 'true'
        );
    }

    static getMockHostname() {
        return process.env.MOCK_HOSTNAME;
    }
}
