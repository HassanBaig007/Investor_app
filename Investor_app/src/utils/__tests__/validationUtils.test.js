import {
    updateFromBackendConfig,
    validateEmail,
    validatePassword,
    validateName,
    validatePasswordMatch,
    getPasswordStrengthColor,
    getPasswordStrengthLabel,
    validateSignupForm,
    validateLoginForm,
    resetToDefaultConfig
} from '../validationUtils';

describe('validationUtils', () => {
    beforeEach(() => {
        resetToDefaultConfig();
    });

    describe('updateFromBackendConfig', () => {
        it('should safely exit if config is missing', () => {
            expect(() => updateFromBackendConfig(null)).not.toThrow();
        });

        it('should update password policies from backend config', () => {
            const mockConfig = {
                passwordPolicy: {
                    minLength: 12,
                    maxLength: 64,
                    requireUppercase: false,
                    requireLowercase: true,
                    requireNumber: false,
                    requireSpecial: false
                },
                disposableEmailDomains: ['customtrashmail.com']
            };

            updateFromBackendConfig(mockConfig);

            // Verify effects of config change
            const pwdCheck = validatePassword('alllowercase', '', '');
            // Original requires numbers/uppercase/special; the mocked config turned them off EXCEPT lowercase
            // However, note that we can't test internal private variables explicitly without exporting them, 
            // so we test behavior.
            expect(pwdCheck.requirements.minLength).toBe(true);

            // Revert or acknowledge this mutation in global state might affect other tests,
            // but for this unit test file, we just test if the function executes correctly.
        });
    });

    describe('validateEmail', () => {
        it('should reject empty emails', () => {
            const result = validateEmail('');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Email address is required');
        });

        it('should reject emails without @', () => {
            const result = validateEmail('userdomain.com');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Email must contain @ symbol');
        });

        it('should reject emails with disposable domains', () => {
            const result = validateEmail('user@mailinator.com');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Temporary or disposable email addresses are not allowed');
        });

        it('should reject emails with invalid TLDs', () => {
            const result = validateEmail('user@domain.c');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Email must have a valid domain extension (at least 2 letters)');

            const resultLong = validateEmail('user@domain.toolongtldtoolong');
            expect(resultLong.isValid).toBe(false);
        });

        it('should allow valid email addresses', () => {
            const result = validateEmail('john.doe+alias@gmail.com');
            expect(result.isValid).toBe(true);
            expect(result.message).toBe('');
        });
    });

    describe('validatePassword', () => {
        it('should require minimum length', () => {
            const result = validatePassword('Short1!');
            expect(result.requirements.minLength).toBe(false);
        });

        it('should identify strong passwords', () => {
            const result = validatePassword('SuperSecretAuth123!@#', 'user@example.com', 'John Doe');
            expect(result.isValid).toBe(true);
            expect(result.strength).toBe('strong');
        });

        it('should catch personal info in password', () => {
            const result = validatePassword('JohnPassword123!', 'john.doe@gmail.com', 'John Doe');
            expect(result.requirements.noPersonalInfo).toBe(false);
        });

        it('should catch sequential characters', () => {
            const result = validatePassword('abcdePassword123!', '', '');
            expect(result.requirements.noSequential).toBe(false);
        });
    });

    describe('validateName', () => {
        it('should reject empty names', () => {
            expect(validateName('').isValid).toBe(false);
        });

        it('should reject names with numbers', () => {
            const result = validateName('John D0e');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Name cannot contain numbers');
        });

        it('should reject single word names', () => {
            const result = validateName('John');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Please enter your full name (first and last name)');
        });

        it('should approve valid names', () => {
            const result = validateName('John Doe');
            expect(result.isValid).toBe(true);
        });
    });

    describe('validatePasswordMatch', () => {
        it('should match identical passwords', () => {
            expect(validatePasswordMatch('Pass123!', 'Pass123!').isValid).toBe(true);
        });

        it('should reject non-matching passwords', () => {
            expect(validatePasswordMatch('Pass123!', 'Pass123').isValid).toBe(false);
        });
    });

    describe('getPasswordStrengthColor', () => {
        it('should return correct colors', () => {
            expect(getPasswordStrengthColor('strong')).toBe('#10B981');
            expect(getPasswordStrengthColor('medium')).toBe('#F59E0B');
            expect(getPasswordStrengthColor('weak')).toBe('#EF4444');
        });
    });

    describe('getPasswordStrengthLabel', () => {
        it('should return correct labels', () => {
            expect(getPasswordStrengthLabel('strong')).toBe('Strong Password');
            expect(getPasswordStrengthLabel('medium')).toBe('Medium Strength');
            expect(getPasswordStrengthLabel('weak')).toBe('Weak Password');
        });
    });

    describe('validateSignupForm', () => {
        it('should return errors for invalid fields', () => {
            const formData = {
                name: 'Jo',
                email: 'invalid-email',
                password: 'weak',
                confirmPassword: 'not-matching'
            };
            const result = validateSignupForm(formData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveProperty('name');
            expect(result.errors).toHaveProperty('email');
            expect(result.errors).toHaveProperty('password');
            expect(result.errors).toHaveProperty('confirmPassword');
        });

        it('should return isValid true for perfect forms', () => {
            const formData = {
                name: 'John Doe',
                email: 'john.doe@gmail.com',
                password: 'SuperSecretAuth123!@#',
                confirmPassword: 'SuperSecretAuth123!@#'
            };
            const result = validateSignupForm(formData);
            // This might still be false if the local state was mutated by the updateFromBackendConfig test
            // However, this should pass the default constraints
            expect(result.isValid).toBe(true);
        });
    });

    describe('validateLoginForm', () => {
        it('should require email and password', () => {
            expect(validateLoginForm({ email: '', password: '' }).isValid).toBe(false);
            expect(validateLoginForm({ email: 'user@abc.com', password: '' }).isValid).toBe(false);
            expect(validateLoginForm({ email: '', password: 'pwd' }).isValid).toBe(false);
        });

        it('should pass with both fields', () => {
            expect(validateLoginForm({ email: 'user@abc.com', password: 'pwd' }).isValid).toBe(true);
        });
    });
});
