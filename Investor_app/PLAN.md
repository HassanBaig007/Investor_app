# PLAN.md - Production Level Refactoring

> **Protocol:** DO NOT EDIT WITHOUT USER APPROVAL.
> **Role:** Distinguished Architect v3.0

## Phase 1: Clean Up & Core Logic (The Foundation)
**Goal:** Remove technical debt and solidy the application shell.

- [ ] **Dead Code Elimination**
    - [ ] `rm src/screens/DashboardScreen.js` (Superseded by `InvestorDashboard.js`)
    - [ ] `rm src/screens/AdminDashboardScreen.js` (Superseded by `admin/AdminDashboard.js`)
    - [ ] `rm src/screens/AddExpenseScreen.js` (Functionality moved to `ProjectDetailScreen.js`)
    - [ ] **Verification:** App compiles and runs without missing import errors.

- [ ] **Navigation & Routing Fixes**
    - [ ] **Modify `App.js`**: Add missing Admin Stack Screens.
        - [ ] `AdminDashboard`
        - [ ] `CreateProject`
        - [ ] `AddInvestor`
        - [ ] `Announcements`
    - [ ] **Verification:** Can navigate to Admin screens (temporarily change initial route or use deep link).

- [ ] **Logic Consolidation (DRY Principle)**
    - [ ] **Refactor `AuthContext.js`**: Move `checkOnboardingStatus` and `saveOnboardingComplete` logic *inside* the checkFirstTimeUser flow.
    - [ ] **Refactor `App.js`**: Remove local `hasOnboarded` state and `AsyncStorage` calls. Consume `useAuth().isOnboarded` instead.
    - [ ] **Verification:** Fresh install flow works (Onboarding -> Login -> Dashboard).

## Phase 2: Component Decomposition ("The God Component")
**Goal:** Break down `ProjectDetailScreen.js` (3,918 lines) into manageable chunks.

- [ ] **Extract Modals**
    - [ ] Create `src/components/modals/SpendingModal.js`
    - [ ] Create `src/components/modals/MemberModal.js`
    - [ ] Create `src/components/modals/NoteModal.js`
    - [ ] **Refactor**: Replace inline Modal JSX in `ProjectDetailScreen` with these components.

- [ ] **Extract Logic Hooks**
    - [ ] Create `src/hooks/useProjectData.js` (Fetching & Calculations)
    - [ ] Create `src/hooks/useProjectActions.js` (Handlers for Spending, Members, etc.)

## Phase 3: Reliability & Safety
- [ ] **Global Error Boundary**
    - [ ] Create `src/components/ErrorBoundary.js`.
    - [ ] Wrap `App.js` content.

- [ ] **Security Patch**
    - [ ] Mask plaintext passwords in `mockData.js`.

## Execution Order
1. Phase 1 (Atomic Steps)
2. Phase 2 (Iterative Refactor)
3. Phase 3 (Safety Net)
