# InvestFlow - Software Requirements Specification (SRS)

**Application Name:** InvestFlow (SplitFlow)  
**Version:** 1.0.0  
**Platform:** Cross-platform Mobile Application (iOS, Android, Web)  
**Technology Stack:** React Native, Expo SDK 54  
**Document Date:** January 14, 2026  

---

## 1. Executive Summary

InvestFlow is a comprehensive investment portfolio management mobile application designed for both investors and administrators. The application enables investors to track their investments, view quarterly reports, and participate in project modification approvals, while administrators can manage projects, approve transactions, and monitor overall portfolio performance.

---

## 2. System Overview

### 2.1 Purpose
The application serves as a centralized platform for managing investment portfolios, facilitating communication between investors and fund administrators, and streamlining approval workflows.

### 2.2 Target Users

| User Type | Description |
|-----------|-------------|
| **Investor/Client** | Individual investors who have invested in various projects and need to track their portfolio performance, view reports, and participate in voting |
| **Administrator** | Fund managers who oversee projects, approve/reject transactions, and manage investor relations |

### 2.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.81.5 |
| Development Platform | Expo SDK 54.0.31 |
| Navigation | React Navigation 7.x |
| State Management | React Hooks (useState, useEffect) |
| UI Components | Custom components with LinearGradient, Reanimated |
| Icons | @expo/vector-icons (Ionicons) |
| Styling | StyleSheet with Theme System |

---

## 3. Functional Requirements

### 3.1 Authentication Module

#### FR-AUTH-01: Role-Based Login
- The system shall provide two login options: Investor and Admin
- Users shall select their role before entering credentials
- The system shall validate credentials against role-specific passwords
- **Investor Password:** investor123
- **Admin Password:** admin123

#### FR-AUTH-02: Login Interface
- Animated login screen with glassmorphism design
- Role selection cards with visual feedback
- Email/Login and Password input fields
- Secure password entry (masked input)
- Role switching capability before final login

#### FR-AUTH-03: Session Management
- The system shall maintain user session state
- Logout functionality shall be available from profile menu
- Session shall be cleared upon logout

---

### 3.2 Investor/Client Module

#### FR-INV-01: Dashboard
- Display portfolio summary with total value, invested amount, and returns
- Show returns percentage with visual indicators (positive/negative)
- Quick action buttons for Approvals, Reports, Portfolio, Support
- Display active investments list with progress indicators
- Show recent updates/notifications

#### FR-INV-02: Portfolio Tracking
- Display current portfolio value
- Show total invested amount
- Calculate and display returns (amount and percentage)
- Visual progress bars for individual investments
- Investment categorization (Real Estate, Venture Capital, etc.)

#### FR-INV-03: Investments
Each investment shall display:
- Investment name and type
- Invested amount
- Current value
- Returns percentage
- Project progress percentage
- Start date and expected end date

#### FR-INV-04: Quarterly Reports
- Access quarterly financial reports by fiscal year
- View Q1, Q2, Q3, Q4 reports
- Report details include:
  - Period covered
  - Publication date
  - File size
  - Performance highlights (Portfolio Growth, Total Returns, Dividends)
  - Investment-wise breakdown
- Download report functionality
- Share report functionality

#### FR-INV-05: Project Approvals (Voting)
- View pending project modifications requiring investor vote
- Display modification details:
  - Project name and modification type
  - Impact analysis (timeline/financial)
  - Current vs proposed changes
  - Voting progress and statistics
- Cast approve/reject votes
- View voting threshold and current approval percentage
- Show user's vote status

#### FR-INV-06: Recent Updates
- View project updates and notifications
- Read/unread status indicators
- Update categorization (reports, milestones, approvals)
- Timestamp and relative time display

---

### 3.3 Administrator Module

#### FR-ADM-01: Admin Dashboard
- Display total Assets Under Management (AUM)
- Show KPI summary:
  - Active Projects count
  - Total Investors count
  - Pending Approvals count
  - Monthly growth percentage
- Tab-based navigation (Overview, Approvals, Projects)

#### FR-ADM-02: Quick Actions
- Create New Project
- Create Announcements
- Generate Reports
- Add Investor
- *(Note: Currently showing "Coming Soon" for features under development)*

#### FR-ADM-03: Approval Management
- View pending withdrawal requests
- View pending investment requests
- Approve/Reject requests with confirmation
- Display request details:
  - Investor name
  - Amount
  - Project name
  - Request timestamp

#### FR-ADM-04: Project Management
- View all projects with status
- Display project details:
  - Name and type
  - Current phase
  - Investor count
  - Amount raised
  - Progress percentage
- Project status indicators (Active, Completed, etc.)
- Create new project option

#### FR-ADM-05: Activity Feed
- View recent investor activities
- New investment notifications
- Report publication logs

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-PERF-01:** App shall load within 3 seconds
- **NFR-PERF-02:** Animations shall run at 60fps
- **NFR-PERF-03:** API responses shall be simulated with configurable delays

### 4.2 User Interface
- **NFR-UI-01:** Consistent dark/light theme across all screens
- **NFR-UI-02:** Responsive layout for various screen sizes
- **NFR-UI-03:** Smooth transitions between screens (slide animations)
- **NFR-UI-04:** Glassmorphism and gradient design elements
- **NFR-UI-05:** Accessibility support for screen readers

### 4.3 Security
- **NFR-SEC-01:** Password input shall be masked
- **NFR-SEC-02:** Role-based access control (RBAC)
- **NFR-SEC-03:** Session isolation between user roles

### 4.4 Compatibility
- **NFR-COMP-01:** iOS 13+ support
- **NFR-COMP-02:** Android 8.0+ support
- **NFR-COMP-03:** Web browser support (responsive)

---

## 5. Data Requirements

### 5.1 User Data
```
User {
  id: String
  name: String
  email: String
  role: "investor" | "admin"
  avatar: String (initials)
}
```

### 5.2 Investment Data
```
Investment {
  id: String
  name: String
  type: "Real Estate" | "Venture Capital" | etc.
  invested: Number
  currentValue: Number
  returns: Number
  returnsPercent: Number
  status: "active" | "completed"
  progress: Number (0-100)
  startDate: Date
  expectedEndDate: Date
}
```

### 5.3 Project Data
```
Project {
  id: String
  name: String
  type: String
  phase: String
  status: "active" | "completed" | "pending"
  investorCount: Number
  raised: Number
  target: Number
  progress: Number
}
```

### 5.4 Report Data
```
QuarterlyReport {
  id: String
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  year: String
  period: String
  status: "available" | "pending"
  publishedDate: Date
  fileSize: String
  highlights: {
    portfolioGrowth: Number
    totalReturns: Number
    dividendsReceived: Number
  }
  investments: Investment[]
}
```

---

## 6. Screen Navigation Map

```
App
├── Login Screen
│   ├── Role Selection (Investor/Admin)
│   └── Credentials Entry
│
├── Client Flow (Investor)
│   ├── Client Dashboard
│   │   ├── Portfolio Summary
│   │   ├── Quick Actions
│   │   ├── Investments List
│   │   └── Recent Updates
│   ├── Reports Screen
│   │   └── Quarterly Report Details
│   └── Approvals Screen
│       └── Voting Interface
│
└── Admin Flow
    └── Admin Dashboard
        ├── Overview Tab
        │   ├── Quick Actions Grid
        │   └── Activity Feed
        ├── Approvals Tab
        │   └── Approval Cards
        └── Projects Tab
            └── Project Cards
```

---

## 7. UI/UX Requirements

### 7.1 Design System
- **Primary Color:** #6366F1 (Indigo)
- **Success Color:** #10B981 (Green)
- **Danger Color:** #EF4444 (Red)
- **Warning Color:** #F59E0B (Amber)
- **Background:** Gradient dark theme (#1a1a2e to #0f3460)

### 7.2 Component Patterns
- Glass-morphism cards with blur effects
- Linear gradient buttons and accents
- Animated floating orbs on login
- Smooth spring animations for transitions
- Progress bars with gradient fills

### 7.3 Typography
- Headers: Bold, 24-36px
- Body: Regular, 14-16px
- Captions: Regular, 12px
- Currency: Semibold with ₹ prefix

---

## 8. Future Enhancements (Roadmap)

| Feature | Priority | Status |
|---------|----------|--------|
| Profile Management | High | Planned |
| Settings Screen | High | Planned |
| Push Notifications | Medium | Planned |
| Document Downloads | High | Planned |
| Share Reports | Medium | Planned |
| Portfolio Analytics | Medium | Planned |
| New Project Creation | High | Planned |
| Add Investor Flow | High | Planned |
| Announcements System | Medium | Planned |
| Real API Integration | Critical | Pending |

---

## 9. Dependencies

### 9.1 NPM Packages
| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~54.0.31 | Development platform |
| react | 19.1.0 | UI framework |
| react-native | 0.81.5 | Mobile framework |
| @react-navigation/native | ^7.1.27 | Navigation |
| @react-navigation/native-stack | ^7.9.1 | Stack navigation |
| expo-linear-gradient | ^15.0.8 | Gradient UI effects |
| react-native-reanimated | ^4.2.1 | Animations |
| react-native-safe-area-context | ^5.6.2 | Safe area handling |
| react-native-screens | 4.16.0 | Screen optimization |
| prop-types | ^15.8.1 | Runtime type checking |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| AUM | Assets Under Management - Total value of investments managed |
| KPI | Key Performance Indicator |
| Portfolio | Collection of investments owned by an investor |
| Quarterly Report | Financial report published every 3 months |
| Modification Request | Proposal to change project terms requiring investor approval |

---

**Document prepared by:** Development Team  
**Last Updated:** January 14, 2026  
**Version:** 1.0
