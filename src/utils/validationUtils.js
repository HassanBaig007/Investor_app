/**
 * Validation Utilities - Industry Standard STRICT Validation
 * Enterprise-grade validation rules
 */

// Email validation regex - STRICT version
// Domain part: Must start with a letter, can contain letters, numbers, hyphens, but not start/end with hyphen
// TLD: Must be 2-10 letters only (no numbers)
const EMAIL_LOCAL_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?$/;
const EMAIL_DOMAIN_REGEX = /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const EMAIL_TLD_REGEX = /^[a-zA-Z]{2,10}$/;

// Disallowed email domains (temporary/disposable email services)
const DISALLOWED_EMAIL_DOMAINS = [
    'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
    '10minutemail.com', 'yopmail.com', 'trashmail.com', 'fakeinbox.com',
    'temp-mail.org', 'throwawaymail.com', 'maildrop.cc', 'sharklasers.com',
    'getairmail.com', 'discard.email', 'getnada.com', 'trbvm.com',
    'mohmal.com', 'mailnesia.com', 'tempail.com', 'tmpmail.org'
];

// Common free email providers (allowed, just for reference)
const KNOWN_EMAIL_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'protonmail.com', 'mail.com', 'aol.com', 'zoho.com', 'live.com',
    'msn.com', 'ymail.com', 'googlemail.com', 'gmx.com', 'rediffmail.com'
];

// Password requirements - configurable from backend via updateFromBackendConfig()
let PASSWORD_MIN_LENGTH = 10;
let PASSWORD_MAX_LENGTH = 128;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_NUMBER_REGEX = /\d/;
const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const PASSWORD_NO_SPACES_REGEX = /^\S+$/;
let PASSWORD_REQUIRE_UPPERCASE = true;
let PASSWORD_REQUIRE_LOWERCASE = true;
let PASSWORD_REQUIRE_NUMBER = true;
let PASSWORD_REQUIRE_SPECIAL = true;

// Common weak passwords to reject
const COMMON_WEAK_PASSWORDS = [
    'password', 'password123', 'password1', '12345678', '123456789', '1234567890',
    'qwerty123', 'qwertyuiop', 'letmein', 'welcome', 'admin123', 'abc123',
    'iloveyou', 'monkey', 'dragon', 'master', 'login', 'passw0rd', 'hello123'
];

/**
 * Update validation rules from backend appConfig.
 * Call once after login with the result of api.getAppConfig().
 * @param {object} config - Backend app config (passwordPolicy, disposableEmailDomains)
 */
export const updateFromBackendConfig = (config) => { // NOSONAR
    if (!config) return;
    if (config.passwordPolicy) {
        const p = config.passwordPolicy;
        if (typeof p.minLength === 'number') PASSWORD_MIN_LENGTH = p.minLength;
        if (typeof p.maxLength === 'number') PASSWORD_MAX_LENGTH = p.maxLength;
        if (typeof p.requireUppercase === 'boolean') PASSWORD_REQUIRE_UPPERCASE = p.requireUppercase;
        if (typeof p.requireLowercase === 'boolean') PASSWORD_REQUIRE_LOWERCASE = p.requireLowercase;
        if (typeof p.requireNumber === 'boolean') PASSWORD_REQUIRE_NUMBER = p.requireNumber;
        if (typeof p.requireSpecial === 'boolean') PASSWORD_REQUIRE_SPECIAL = p.requireSpecial;
    }
    if (Array.isArray(config.disposableEmailDomains) && config.disposableEmailDomains.length > 0) {
        // Merge backend disposable domains with local list
        config.disposableEmailDomains.forEach(domain => {
            if (!DISALLOWED_EMAIL_DOMAINS.includes(domain)) {
                DISALLOWED_EMAIL_DOMAINS.push(domain);
            }
        });
    }
};

/**
 * Reset validation rules to defaults (primarily for testing).
 */
export const resetToDefaultConfig = () => {
    PASSWORD_MIN_LENGTH = 10;
    PASSWORD_MAX_LENGTH = 128;
    PASSWORD_REQUIRE_UPPERCASE = true;
    PASSWORD_REQUIRE_LOWERCASE = true;
    PASSWORD_REQUIRE_NUMBER = true;
    PASSWORD_REQUIRE_SPECIAL = true;
    // Note: DISALLOWED_EMAIL_DOMAINS is a const array, but we could clear injected ones if needed
};

// Name validation - STRICT
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const NAME_REGEX = /^[a-zA-Z]+(?:\s[a-zA-Z]+)*$/;

/**
 * Validate email format - STRICT
 * @param {string} email 
 * @returns {{ isValid: boolean, message: string }}
 */
export const validateEmail = (email) => { // NOSONAR
    if (!email || !email.trim()) {
        return { isValid: false, message: 'Email address is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if @ exists
    if (!trimmedEmail.includes('@')) {
        return { isValid: false, message: 'Email must contain @ symbol' };
    }

    // Split into local and domain parts
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2) {
        return { isValid: false, message: 'Email must have exactly one @ symbol' };
    }

    const [localPart, domainPart] = parts;

    // Validate local part (before @)
    if (!localPart || localPart.length === 0) {
        return { isValid: false, message: 'Email must have a username before @' };
    }

    if (localPart.length < 1) {
        return { isValid: false, message: 'Email username is too short' };
    }

    if (localPart.length > 64) {
        return { isValid: false, message: 'Email username is too long (max 64 characters)' };
    }

    if (!EMAIL_LOCAL_REGEX.test(localPart)) {
        return { isValid: false, message: 'Email username contains invalid characters' };
    }

    // Check for consecutive dots in local part
    if (localPart.includes('..')) {
        return { isValid: false, message: 'Email username cannot contain consecutive dots' };
    }

    // Validate domain part (after @)
    if (!domainPart || domainPart.length === 0) {
        return { isValid: false, message: 'Email must have a domain after @' };
    }

    // Domain must contain at least one dot for TLD
    if (!domainPart.includes('.')) {
        return { isValid: false, message: 'Email domain must have a valid extension (e.g., .com)' };
    }

    // Split domain into parts
    const domainParts = domainPart.split('.');

    // Must have at least domain name and TLD
    if (domainParts.length < 2) {
        return { isValid: false, message: 'Email must have a valid domain (e.g., example.com)' };
    }

    // Validate each domain part
    for (let i = 0; i < domainParts.length - 1; i++) {
        const part = domainParts[i];

        if (!part || part.length === 0) {
            return { isValid: false, message: 'Email domain contains empty segment' };
        }

        // Domain part CANNOT contain ANY numbers - only letters and hyphens allowed
        if (/\d/.test(part)) {
            return { isValid: false, message: 'Email domain cannot contain numbers (e.g., use gmail.com not gmail1.com)' };
        }

        // Domain must be letters and hyphens only (no numbers)
        if (!/^[a-zA-Z]([a-zA-Z-]*[a-zA-Z])?$/.test(part) && part.length > 1) {
            return { isValid: false, message: 'Email domain must contain only letters' };
        }

        // Single character domain parts must be a letter
        if (part.length === 1 && !/^[a-zA-Z]$/.test(part)) {
            return { isValid: false, message: 'Email domain must contain only letters' };
        }

        // Domain part length check
        if (part.length > 63) {
            return { isValid: false, message: 'Email domain segment is too long' };
        }

        // Cannot start or end with hyphen
        if (part.startsWith('-') || part.endsWith('-')) {
            return { isValid: false, message: 'Email domain cannot start or end with hyphen' };
        }
    }

    // Validate TLD (last part must be letters only, 2-10 chars)
    const tld = domainParts[domainParts.length - 1];

    if (!tld || tld.length < 2) {
        return { isValid: false, message: 'Email must have a valid domain extension (at least 2 letters)' };
    }

    if (tld.length > 10) {
        return { isValid: false, message: 'Email domain extension is too long' };
    }

    if (!EMAIL_TLD_REGEX.test(tld)) {
        return { isValid: false, message: 'Email domain extension must contain only letters (e.g., com, org, in)' };
    }

    // Check overall email length
    if (trimmedEmail.length < 6) {
        return { isValid: false, message: 'Email address is too short' };
    }

    if (trimmedEmail.length > 254) {
        return { isValid: false, message: 'Email address is too long' };
    }

    // Check for disallowed domains
    if (DISALLOWED_EMAIL_DOMAINS.includes(domainPart)) {
        return { isValid: false, message: 'Temporary or disposable email addresses are not allowed' };
    }

    return { isValid: true, message: '' };
};

/**
 * Validate password strength - STRICT Enterprise Grade
 * @param {string} password 
 * @param {string} email - optional, to check if password contains email
 * @param {string} name - optional, to check if password contains name
 * @returns {{ isValid: boolean, message: string, strength: 'weak' | 'medium' | 'strong', requirements: object }}
 */
export const validatePassword = (password, email = '', name = '') => { // NOSONAR
    const requirements = {
        minLength: false,
        maxLength: true,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecial: false,
        noSpaces: false,
        notCommon: false,
        noPersonalInfo: false,
        noSequential: false,
        noRepeating: false,
    };

    if (!password) {
        return {
            isValid: false,
            message: 'Password is required',
            strength: 'weak',
            requirements
        };
    }

    // Check minimum length
    requirements.minLength = password.length >= PASSWORD_MIN_LENGTH;
    if (!requirements.minLength) {
        return {
            isValid: false,
            message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
            strength: 'weak',
            requirements
        };
    }

    // Check maximum length
    requirements.maxLength = password.length <= PASSWORD_MAX_LENGTH;
    if (!requirements.maxLength) {
        return {
            isValid: false,
            message: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`,
            strength: 'weak',
            requirements
        };
    }

    // Check for no spaces
    requirements.noSpaces = PASSWORD_NO_SPACES_REGEX.test(password);
    if (!requirements.noSpaces) {
        return {
            isValid: false,
            message: 'Password cannot contain spaces',
            strength: 'weak',
            requirements
        };
    }

    // Check uppercase
    requirements.hasUppercase = PASSWORD_UPPERCASE_REGEX.test(password);

    // Check lowercase
    requirements.hasLowercase = PASSWORD_LOWERCASE_REGEX.test(password);

    // Check numbers
    requirements.hasNumber = PASSWORD_NUMBER_REGEX.test(password);

    // Check special characters
    requirements.hasSpecial = PASSWORD_SPECIAL_REGEX.test(password);

    // Check for common weak passwords
    requirements.notCommon = !COMMON_WEAK_PASSWORDS.some(weak =>
        password.toLowerCase().includes(weak.toLowerCase())
    );

    // Check for personal info in password
    const lowerPassword = password.toLowerCase();
    const emailPart = email ? email.split('@')[0].toLowerCase() : '';
    const nameParts = name ? name.toLowerCase().split(' ') : [];

    requirements.noPersonalInfo = true;
    if (emailPart && emailPart.length > 2 && lowerPassword.includes(emailPart)) {
        requirements.noPersonalInfo = false;
    }
    if (nameParts.some(part => part.length > 2 && lowerPassword.includes(part))) {
        requirements.noPersonalInfo = false;
    }

    // Check for sequential characters (abc, 123, etc.)
    requirements.noSequential = !hasSequentialChars(password, 4);

    // Check for repeating characters (aaaa, 1111, etc.)
    requirements.noRepeating = !hasRepeatingChars(password, 3);

    // Count how many requirements are met
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    const totalRequirements = Object.keys(requirements).length;

    // Determine strength
    let strength = 'weak';
    if (metRequirements === totalRequirements) {
        strength = 'strong';
    } else if (metRequirements >= totalRequirements - 2) {
        strength = 'medium';
    }

    // Build error message for missing requirements
    const errors = [];
    if (!requirements.hasUppercase) errors.push('one uppercase letter (A-Z)');
    if (!requirements.hasLowercase) errors.push('one lowercase letter (a-z)');
    if (!requirements.hasNumber) errors.push('one number (0-9)');
    if (!requirements.hasSpecial) errors.push('one special character (!@#$%^&*)');
    if (!requirements.notCommon) errors.push('avoid common passwords');
    if (!requirements.noPersonalInfo) errors.push('not contain your name or email');
    if (!requirements.noSequential) errors.push('not have sequential characters (abc, 123)');
    if (!requirements.noRepeating) errors.push('not have repeating characters (aaa, 111)');

    if (errors.length > 0) {
        return {
            isValid: false,
            message: `Password must include: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
            strength,
            requirements
        };
    }

    return { isValid: true, message: '', strength: 'strong', requirements };
};

/**
 * Check for sequential characters
 */
function hasSequentialChars(str, minLength) {
    const sequences = [
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '0123456789',
        'qwertyuiop',
        'asdfghjkl',
        'zxcvbnm',
        'QWERTYUIOP',
        'ASDFGHJKL',
        'ZXCVBNM'
    ];

    for (const seq of sequences) {
        for (let i = 0; i <= seq.length - minLength; i++) {
            const subseq = seq.substring(i, i + minLength);
            if (str.includes(subseq)) {
                return true;
            }
            // Also check reverse
            if (str.includes(subseq.split('').reverse().join(''))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check for repeating characters
 */
function hasRepeatingChars(str, minLength) {
    const regex = new RegExp(String.raw`(.)\1{${minLength - 1},}`);
    return regex.test(str);
}

/**
 * Validate name - STRICT
 * @param {string} name 
 * @returns {{ isValid: boolean, message: string }}
 */
export const validateName = (name) => {
    if (!name || !name.trim()) {
        return { isValid: false, message: 'Full name is required' };
    }

    const trimmedName = name.trim();

    // Check minimum length
    if (trimmedName.length < NAME_MIN_LENGTH) {
        return { isValid: false, message: `Name must be at least ${NAME_MIN_LENGTH} characters` };
    }

    // Check maximum length
    if (trimmedName.length > NAME_MAX_LENGTH) {
        return { isValid: false, message: `Name cannot exceed ${NAME_MAX_LENGTH} characters` };
    }

    // Check for numbers - names should not contain numbers
    if (/\d/.test(trimmedName)) {
        return { isValid: false, message: 'Name cannot contain numbers' };
    }

    // Check for special characters - only letters and spaces allowed
    if (/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?`~]/.test(trimmedName)) {
        return { isValid: false, message: 'Name cannot contain special characters' };
    }

    // Check format (letters and single spaces only)
    if (!NAME_REGEX.test(trimmedName)) {
        return { isValid: false, message: 'Name can only contain letters and single spaces between words' };
    }

    // Check for multiple consecutive spaces
    if (/\s{2,}/.test(trimmedName)) {
        return { isValid: false, message: 'Name cannot have multiple consecutive spaces' };
    }

    // Must have at least first and last name
    const nameParts = trimmedName.split(' ').filter(part => part.length > 0);
    if (nameParts.length < 2) {
        return { isValid: false, message: 'Please enter your full name (first and last name)' };
    }

    // Each name part must be at least 2 characters
    if (nameParts.some(part => part.length < 2)) {
        return { isValid: false, message: 'Each name part must be at least 2 characters' };
    }

    // Check for all same letters (e.g., "aaaa bbbb")
    for (const part of nameParts) {
        if (/^(.)\1+$/.test(part.toLowerCase())) {
            return { isValid: false, message: 'Please enter a valid name' };
        }
    }

    // Check if name starts with a letter (not space or special char)
    if (!/^[a-zA-Z]/.test(trimmedName)) {
        return { isValid: false, message: 'Name must start with a letter' };
    }

    // Optional: Check for proper capitalization (warn but don't block)
    // This is just for display - actual validation passes

    return { isValid: true, message: '' };
};

/**
 * Validate password confirmation
 * @param {string} password 
 * @param {string} confirmPassword 
 * @returns {{ isValid: boolean, message: string }}
 */
export const validatePasswordMatch = (password, confirmPassword) => {
    if (!confirmPassword) {
        return { isValid: false, message: 'Please confirm your password' };
    }

    if (password !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }

    return { isValid: true, message: '' };
};

/**
 * Get password strength color
 * @param {'weak' | 'medium' | 'strong'} strength 
 * @returns {string}
 */
export const getPasswordStrengthColor = (strength) => {
    switch (strength) {
        case 'strong':
            return '#10B981'; // Green
        case 'medium':
            return '#F59E0B'; // Orange
        case 'weak':
        default:
            return '#EF4444'; // Red
    }
};

/**
 * Get password strength label
 * @param {'weak' | 'medium' | 'strong'} strength 
 * @returns {string}
 */
export const getPasswordStrengthLabel = (strength) => {
    switch (strength) {
        case 'strong':
            return 'Strong Password';
        case 'medium':
            return 'Medium Strength';
        case 'weak':
        default:
            return 'Weak Password';
    }
};

/**
 * Validate entire signup form - STRICT
 * @param {{ name: string, email: string, password: string, confirmPassword: string }} formData 
 * @returns {{ isValid: boolean, errors: { name?: string, email?: string, password?: string, confirmPassword?: string } }}
 */
export const validateSignupForm = (formData) => {
    const errors = {};

    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
        errors.name = nameValidation.message;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
        errors.email = emailValidation.message;
    }

    const passwordValidation = validatePassword(formData.password, formData.email, formData.name);
    if (!passwordValidation.isValid) {
        errors.password = passwordValidation.message;
    }

    const confirmValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
    if (!confirmValidation.isValid) {
        errors.confirmPassword = confirmValidation.message;
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate login form
 * @param {{ email: string, password: string }} formData 
 * @returns {{ isValid: boolean, errors: { email?: string, password?: string } }}
 */
export const validateLoginForm = (formData) => {
    const errors = {};

    if (!formData.email || !formData.email.trim()) {
        errors.email = 'Email or username is required';
    }

    if (!formData.password) {
        errors.password = 'Password is required';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
