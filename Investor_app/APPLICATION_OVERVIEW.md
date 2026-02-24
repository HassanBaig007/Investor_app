# 📱 SplitFlow (InvestFlow) - Application Overview
### First Prototype Meeting Documentation
**Date:** January 20, 2026  
**Version:** 1.0.0 Prototype  
**Platform:** Cross-platform Mobile Application (iOS, Android, Web)

---

## 📋 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Problem Statement](#-problem-statement)
3. [Solution Overview](#-solution-overview)
4. [User Types & Roles](#-user-types--roles)
5. [Application Flow](#-application-flow)
6. [Feature Breakdown](#-feature-breakdown)
7. [Technology Stack](#-technology-stack)
8. [Screen Inventory](#-screen-inventory)
9. [Current Prototype Status](#-current-prototype-status)
10. [Future Roadmap](#-future-roadmap)
11. [Demo Credentials](#-demo-credentials)

---

## 🎯 Executive Summary

**SplitFlow** is a comprehensive **investment portfolio management mobile application** designed to bridge the communication gap between **investors** and **fund administrators**. The app provides a centralized platform for:

- 📊 **Portfolio Tracking** - Real-time investment monitoring
- 📝 **Quarterly Reports** - Access financial performance reports
- ✅ **Approval Workflows** - Democratic decision-making for project modifications
- 💼 **Project Management** - Complete oversight of investment projects
- 🔔 **Notifications** - Stay updated on important events

> **Key Value Proposition:** Transparency, accessibility, and streamlined communication in investment management.

---

## ❓ Problem Statement

### Current Industry Challenges:

| Challenge | Impact |
|-----------|--------|
| **Fragmented Communication** | Investors rely on emails/calls for updates |
| **Limited Transparency** | Difficulty tracking portfolio performance |
| **Manual Approval Processes** | Slow decision-making for project changes |
| **Report Access Issues** | Hard to find historical financial data |
| **No Unified Platform** | Multiple tools needed for basic operations |

### Our Solution:
A **single, unified mobile platform** that puts everything at the investor's fingertips while giving administrators powerful management tools.

---

## 💡 Solution Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      SplitFlow App                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐              ┌─────────────────┐         │
│   │  INVESTORS  │              │  ADMINISTRATORS │         │
│   │   (Users)   │              │    (Managers)   │         │
│   └──────┬──────┘              └────────┬────────┘         │
│          │                              │                   │
│          ▼                              ▼                   │
│   ┌─────────────┐              ┌─────────────────┐         │
│   │ • Dashboard │              │ • KPI Overview  │         │
│   │ • Portfolio │              │ • Approvals     │         │
│   │ • Reports   │              │ • Projects      │         │
│   │ • Approvals │              │ • Investors     │         │
│   │ • Analytics │              │ • Reports Gen.  │         │
│   └─────────────┘              └─────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 User Types & Roles

### 1. 💼 Investor/Client
Primary users who have invested in various projects.

| Capability | Description |
|------------|-------------|
| **View Portfolio** | Track all investments with real-time values |
| **Access Reports** | Download quarterly performance reports |
| **Vote on Modifications** | Approve/reject project changes |
| **Track Returns** | Monitor ROI, dividends, and growth |
| **View Projects** | See detailed information about each investment |
| **Manage Spendings** | Review and approve project expenditures |

### 2. 🛠️ Administrator
Fund managers who oversee projects and investor relations.

| Capability | Description |
|------------|-------------|
| **Monitor AUM** | Track total Assets Under Management |
| **Manage Projects** | Create and oversee investment projects |
| **Handle Approvals** | Process withdrawal and investment requests |
| **Generate Reports** | Create and publish quarterly reports |
| **Add Investors** | Onboard new investors to the platform |
| **Send Announcements** | Communicate with all investors |

---

## 🔄 Application Flow

### User Journey Map

```
                            ┌──────────────┐
                            │   App Start  │
                            └──────┬───────┘
                                   │
                            ┌──────▼───────┐
                            │    Login     │
                            │   Screen     │
                            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
             ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
             │   Sign Up   │ │  Investor │ │   Admin   │
             │   (New)     │ │   Login   │ │   Login   │
             └──────┬──────┘ └─────┬─────┘ └─────┬─────┘
                    │              │              │
                    └──────────────┤              │
                                   │              │
                            ┌──────▼───────┐      │
                            │  Onboarding  │      │
                            │   (3 Steps)  │      │
                            └──────┬───────┘      │
                                   │              │
                            ┌──────▼───────┐ ┌────▼─────┐
                            │   Investor   │ │  Admin   │
                            │  Dashboard   │ │Dashboard │
                            └──────────────┘ └──────────┘
```

### Onboarding Steps (For New Investors)
1. **Welcome** - Introduction to the platform
2. **Features Overview** - Key capabilities explained
3. **Get Started** - Begin using the app

---

## 📱 Feature Breakdown

### A. Authentication Module

| Feature | Status | Description |
|---------|--------|-------------|
| Role-Based Login | ✅ Complete | Investor vs Admin selection |
| Animated UI | ✅ Complete | Glassmorphism design with animations |
| Secure Password Entry | ✅ Complete | Masked input fields |
| Sign Up Flow | ✅ Complete | New user registration |
| Session Management | ✅ Complete | Login state persistence |
| Multi-Account Testing | ✅ Complete | Quick switch between test users |

### B. Investor Dashboard

| Feature | Status | Description |
|---------|--------|-------------|
| Portfolio Summary | ✅ Complete | Total value, invested amount, returns |
| Quick Actions | ✅ Complete | Navigation to key features |
| Projects List | ✅ Complete | Active investments with progress |
| Recent Updates | ✅ Complete | Notifications and activity feed |
| Tab Navigation | ✅ Complete | Home, Projects, Analytics |

### C. Projects Module

| Feature | Status | Description |
|---------|--------|-------------|
| Project List View | ✅ Complete | All projects with status badges |
| Project Detail View | ✅ Complete | Comprehensive project information |
| Investor Management | ✅ Complete | Add/view project investors |
| Spending Tracking | ✅ Complete | Track project expenditures |
| Spending Approval | ✅ Complete | Democratic approval process |
| Create New Project | ✅ Complete | Project creation form |

### D. Reports Module

| Feature | Status | Description |
|---------|--------|-------------|
| Quarterly Reports Access | ✅ Complete | Q1, Q2, Q3, Q4 reports |
| Financial Year Selection | ✅ Complete | Switch between fiscal years |
| Performance Highlights | ✅ Complete | Growth, returns, dividends |
| Download Reports | ✅ Complete | Save to device |
| Share Reports | ✅ Complete | Share via apps |

### E. Approvals/Voting Module

| Feature | Status | Description |
|---------|--------|-------------|
| Pending Modifications List | ✅ Complete | Project changes needing votes |
| Voting Interface | ✅ Complete | Approve/Reject with comments |
| Voting Progress | ✅ Complete | Visual progress indicators |
| Threshold Tracking | ✅ Complete | Required approval percentage |

### F. Admin Dashboard

| Feature | Status | Description |
|---------|--------|-------------|
| KPI Overview | ✅ Complete | AUM, Projects, Investors count |
| Quick Actions | ✅ Complete | Common admin tasks |
| Approval Management | ✅ Complete | Handle withdrawal/investment requests |
| Project Oversight | ✅ Complete | Monitor all projects |
| Create Project | ✅ Complete | New project form |
| Add Investor | ✅ Complete | Investor onboarding |
| Announcements | ✅ Complete | Bulk communications |

### G. Profile & Settings

| Feature | Status | Description |
|---------|--------|-------------|
| Profile View | ✅ Complete | User information display |
| Notifications | ✅ Complete | Push notification support |
| Settings Screen | ✅ Complete | App preferences |
| Logout | ✅ Complete | Session termination |

### H. Expense History (PhonePe-Style Transaction Viewer)

| Feature | Status | Description |
|---------|--------|-------------|
| Transaction History | ✅ Complete | Read-only view of all expenses (PhonePe style) |
| Combined View | ✅ Complete | Personal + Project expenses in one place |
| Filter by Source | ✅ Complete | Filter: All / Personal / Project |
| Date Grouping | ✅ Complete | Transactions grouped by date |
| Transaction Details | ✅ Complete | Detailed modal with all transaction info |
| Project Auto-Sync | ✅ Complete | Approved project spendings auto-appear |
| Category Insights | ✅ Complete | Visual breakdown by spending category |
| Budget Tracking | ✅ Complete | Monthly spending summary card |
| Export to Excel (CSV) | ✅ Complete | Export with project-specific columns |
| Export Report (HTML) | ✅ Complete | Printable styled report with all details |
| Data Backup (JSON) | ✅ Complete | Full data backup for import/restore |


---

## 🛠️ Technology Stack

### Framework & Platform
```
┌─────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📱 Frontend Framework                                   │
│  ├── React Native 0.81.5                                │
│  └── Expo SDK 54.0.31                                   │
│                                                          │
│  🧭 Navigation                                          │
│  └── React Navigation 7.x (Native Stack)                │
│                                                          │
│  🎨 UI & Styling                                        │
│  ├── Custom Theme System                                │
│  ├── Expo Linear Gradient                               │
│  ├── React Native Reanimated                            │
│  └── Ionicons (Vector Icons)                            │
│                                                          │
│  📊 State Management                                    │
│  ├── React Hooks (useState, useEffect)                  │
│  └── Context API (AuthContext)                          │
│                                                          │
│  🔔 Services                                            │
│  └── Expo Notifications                                 │
│                                                          │
│  📦 Current Data Layer                                  │
│  └── Mock Data (mockData.js) - To be replaced with API  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Why These Technologies?

| Technology | Reason |
|------------|--------|
| **React Native** | Cross-platform development (iOS, Android, Web) |
| **Expo** | Rapid development, easy testing, OTA updates |
| **React Navigation** | Native-like navigation performance |
| **Reanimated** | Smooth 60fps animations |
| **Linear Gradient** | Premium visual design |

---

## 📂 Screen Inventory

### Complete List of Screens

```
📁 SCREENS STRUCTURE
│
├── 🔐 Authentication
│   ├── LoginScreen.js         - Role-based login
│   └── SignUpScreen.js        - New user registration
│
├── 🎯 Onboarding
│   └── OnboardingScreen.js    - Welcome walkthrough
│
├── 💼 Investor Screens
│   ├── InvestorDashboard.js         - Main investor home
│   ├── ProjectDetailScreen.js       - Project information
│   ├── CreateProjectInvestorScreen.js - Create new project
│   ├── ManageProjectInvestorsScreen.js - Manage members
│   └── ProjectApprovalDetailScreen.js - Voting details
│
├── 📊 Client Screens
│   ├── ReportsScreen.js           - Quarterly reports
│   ├── ApprovalsScreen.js         - Voting on modifications
│   └── PortfolioAnalyticsScreen.js - Portfolio insights
│
├── 🛠️ Admin Screens
│   ├── AdminDashboard.js          - Admin home
│   ├── CreateProjectScreen.js     - New project form
│   ├── AddInvestorScreen.js       - Onboard investor
│   └── AnnouncementsScreen.js     - Bulk messaging
│
├── 💰 Expense Tracking Screens
│   ├── DailyExpensesScreen.js     - Personal expense tracker (notebook style)
│   └── ExpenseAnalyticsScreen.js  - Expense insights & trends
│
└── ⚙️ Shared Screens
    ├── ProfileScreen.js           - User profile
    ├── SettingsScreen.js          - App settings
    └── NotificationScreen.js      - All notifications
```

**Total Screens: 18**

---

## 📈 Current Prototype Status

### What's Working ✅

| Category | Status | Details |
|----------|--------|---------|
| **Authentication** | 100% | Login, Sign Up, Role Selection |
| **Navigation** | 100% | All screen transitions smooth |
| **Investor Dashboard** | 100% | All tabs functional |
| **Project Views** | 100% | List, detail, creation |
| **Reports** | 100% | View, download, share |
| **Approvals** | 100% | Voting mechanism complete |
| **Spending Management** | 100% | Add, approve, reject spendings |
| **Admin Functions** | 100% | All core features |
| **Personal Expenses** | 100% | Notebook-style tracker with analytics |
| **UI/UX** | 100% | Premium design implemented |
| **Animations** | 100% | Smooth transitions |
| **Notifications** | 100% | Push notification ready |

### Data Layer Status

| Component | Current | Production Ready |
|-----------|---------|------------------|
| User Data | Mock | ⏳ Needs API |
| Portfolio Data | Mock | ⏳ Needs API |
| Project Data | Mock | ⏳ Needs API |
| Report Data | Mock | ⏳ Needs API |
| Notification Data | Mock | ⏳ Needs API |
| Expense Data | Mock | ⏳ Needs API |

---

## 🗺️ Future Roadmap

### Phase 1: API Integration (Critical)
- [ ] Backend API development
- [ ] User authentication (JWT/OAuth)
- [ ] Real database integration
- [ ] Secure data transmission

### Phase 2: Enhanced Features
- [ ] Push notification server
- [ ] Document upload/download
- [ ] In-app chat support
- [ ] Advanced analytics charts

### Phase 3: Advanced Features
- [ ] Biometric authentication
- [ ] Dark/Light theme toggle
- [ ] Multi-language support
- [ ] Offline mode

### Phase 4: Optimization
- [ ] Performance optimization
- [ ] App size reduction
- [ ] Load time improvements
- [ ] Accessibility compliance

---

## 🔑 Demo Credentials

### For Live Demo

| Role | Email/Username | Password |
|------|----------------|----------|
| **Investor 1 (Lohith)** | lohith@investflow.com | investor123 |
| **Investor 2 (Rahul)** | rahul@investflow.com | investor123 |
| **Investor 3 (Priya)** | priya@investflow.com | investor123 |
| **Admin** | admin@splitflow.com | admin123 |

### Quick Access (Test Mode)
The login screen includes a "Quick Debug Mode" with pre-configured test accounts for rapid switching between different user perspectives.

---

## 🎨 Design Highlights

### Visual Design System

| Element | Value | Purpose |
|---------|-------|---------|
| **Primary Color** | #6366F1 (Indigo) | Brand identity |
| **Success Color** | #10B981 (Green) | Positive actions |
| **Danger Color** | #EF4444 (Red) | Alerts, negative |
| **Warning Color** | #F59E0B (Amber) | Cautions |
| **Background** | Gradient Dark | Premium feel |

### Design Principles
1. **Glassmorphism** - Modern frosted glass effect
2. **Gradient Accents** - Dynamic visual appeal
3. **Micro-animations** - Enhanced user engagement
4. **Consistent Spacing** - Clean, organized layout
5. **Clear Typography** - Easy readability

---

## 📊 Key Metrics Display

### Investor View
- **Portfolio Value** - ₹XX,XX,XXX
- **Total Invested** - ₹XX,XX,XXX
- **Total Returns** - ₹X,XX,XXX (+XX.X%)
- **Active Projects** - X projects

### Admin View
- **Total AUM** - ₹12.5 Cr
- **Active Projects** - 4
- **Total Investors** - 48
- **Pending Approvals** - 2
- **Monthly Growth** - +2.3%

---

## 🤝 Conclusion

The **SplitFlow** prototype demonstrates a fully functional, production-ready UI/UX for investment portfolio management. The application successfully addresses the core challenges of:

1. ✅ **Centralized Portfolio View** - All investments in one place
2. ✅ **Transparent Reporting** - Easy access to quarterly reports
3. ✅ **Democratic Decision Making** - Voting on project modifications
4. ✅ **Real-time Updates** - Notifications and activity feeds
5. ✅ **Role-based Access** - Separate interfaces for investors and admins

### Next Steps:
1. API integration for production deployment
2. User acceptance testing (UAT)
3. Security audit
4. App store submission preparation

---

**Prepared by:** Development Team  
**Date:** January 20, 2026  
**Document Version:** 1.0

---

*This document is intended for internal meeting purposes and prototype demonstration.*
