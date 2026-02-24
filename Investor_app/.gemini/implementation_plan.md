# Major App Restructuring Implementation Plan

## Changes to Implement:

### 1. Login/SignUp Validation (Industry Standard)
- Email: Valid format, not empty
- Password: Min 8 chars, uppercase, lowercase, number, special char
- Name: Min 2 chars, only letters and spaces
- Confirm Password: Must match

### 2. Remove Portfolio Dashboard
- Remove the Portfolio Summary Card from InvestorDashboard
- Keep only projects-focused content

### 3. Bottom Tab Navigation (Footer)
- Create AppNavigator with bottom tabs
- Tabs: Home, Projects, Approvals, Analytics, Invite Friends
- Move Quick Actions logic to footer

### 4. Settings - Account Statistics
- Show only "Active Projects" count
- Remove "Active Investments" and "Total Returns"

### 5. Approvals First
- Move Pending Approvals section above the project list
- Make it more prominent

### 6. Replace "Investment" with "Projects"
- Change tab labels and references
- Remove investment-related terminology

### 7. Spending Approval System (Major Feature)
- New state: pendingSpendings (awaiting approval)
- New state: approvedSpendings (shown in recent)
- Add approval UI with approve/reject buttons
- Track approvals per member
- Only show in "Recent" after ALL approve

### 8. Categories: Service & Product Only
- Replace current 7 categories with just 2

### 9. Exit Project Icon
- Add exit/leave icon in top-left of header
- Move add member button to top-right (already there)

### 10. Spending Detail View
- Create modal/screen showing:
  - Time added
  - Amount
  - Category
  - Description
  - All member approvals status
  - Who added it
