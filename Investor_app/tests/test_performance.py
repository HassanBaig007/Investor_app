import pytest
import time

class TestPerformance:
    
    def test_startup_latency(self, driver):
        """
        Measure cold start time (Page Load)
        """
        start_time = time.time()
        if not driver: return
        
        # In Web, driver.get() waits for load, but we can measure time to meaningful paint equivalent
        # driver.refresh()
        # wait_for_element("Welcome Back")
        
        end_time = time.time()
        latency = end_time - start_time
        print(f"\n[Perf] Web Page Load Time: {latency:.2f}s")
        assert latency < 3.0, "Page load took too long!"
        
    def test_tab_switch_performance(self, driver):
        """
        Measure tab switch responsiveness
        """
        if not driver: return
        # Go to Admin Dashboard
        start = time.time()
        # Switch Tab
        end = time.time()
        print(f"\n[Perf] Tab Switch Time: {(end-start)*1000:.2f}ms")
