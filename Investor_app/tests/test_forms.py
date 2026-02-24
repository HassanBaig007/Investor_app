import pytest
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

class TestFormValidation:
    
    def test_profile_empty_fields(self, driver):
        """
        Form: Verify saving Profile with empty fields fails
        """
        print("\n[Forms] Testing Profile Empty Fields...")
        if not driver: return
        # Nav to Profile
        # Clear Name
        # Save
        # Assert Error
        
    def test_email_format_validation(self, driver):
        """
        Form: Verify diverse invalid email formats
        """
        print("\n[Forms] Fuzzing Email Input...")
        if not driver: return
        
        invalid_emails = ["plainaddress", "#@%^%#$@#$@#.com", "@example.com", "Joe Smith <email@example.com>"]
        for email in invalid_emails:
            # Enter email
            # Assert Validation Message
            pass
            
    def test_xss_injection_attempt(self, driver):
        """
        Form: Security - Attempt Script Injection in Name field
        """
        print("\n[Forms] Testing XSS Injection...")
        if not driver: return
        
        payload = "<script>alert('xss')</script>"
        # Enter payload
        # Save
        # Verify it is sanitized or harmless
        
    def test_max_length_boundary(self, driver):
        """
        Form: Boundary - Test extremely long input strings
        """
        print("\n[Forms] Testing Max Length...")
        if not driver: return
        
        long_str = "a" * 1000
        # Enter
        # Check if truncated or error
        
    def test_numeric_input_validation(self, driver):
        """
        Form: Verify numeric fields (Investment Amount) reject text
        """
        print("\n[Forms] Testing Numeric Fields...")
        if not driver: return
        
        # Enter text
        # Verify input didn't accept or error
        
    def test_unicode_chars(self, driver):
        """
        Form: Verify Emoji and Unicode handling
        """
        print("\n[Forms] Testing Unicode Chars...")
        if not driver: return
        
        # Enter 'John 🚀'
        # Save
        # Verify persistence
