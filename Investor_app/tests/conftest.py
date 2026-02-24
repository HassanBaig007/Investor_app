import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

@pytest.fixture(scope="function")
def driver(request):
    """
    Setup Selenium WebDriver for Web Testing
    """
    options = Options()
    # options.add_argument("--headless") # Uncomment for headless mode
    
    print("\n[Setup] Initializing Chrome Driver...")
    try:
        driver = webdriver.Chrome(options=options)
        driver.maximize_window()
        driver.get("http://localhost:8081") # Default Expo Web Port
        
        yield driver
        
        print("\n[Teardown] Quitting Driver...")
        driver.quit()
    except Exception as e:
        print(f"Failed to initialize driver: {e}")
        yield None

@pytest.fixture
def wait_for_element(driver):
    """
    Helper to wait for elements by text or selector
    """
    pass
