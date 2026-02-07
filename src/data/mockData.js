/**
 * Mock Data Store - Replace with API calls for production
 */

// ============================================
// USER DATA - Multi-Account Support
// ============================================

// All user accounts for testing
// All user accounts for testing
export const userAccounts = {
    'USR000': {
        id: 'USR000',
        name: 'Lohith MS',
        email: 'investor123',     // Login ID
        password: 'investor123',  // Login Password
        role: 'investor',
        avatar: null,
        phone: '+91 98765 43210',
    },
    'USR001': {
        id: 'USR001',
        name: 'Lohith MS',
        email: 'lohith',          // Login ID
        password: 'lohith',       // Login Password
        role: 'investor',
        avatar: null,
        phone: '+91 98765 43210',
    },
    'USR002': {
        id: 'USR002',
        name: 'Rahul Sharma',
        email: 'rahul',           // Login ID
        password: 'rahul',        // Login Password
        role: 'investor',
        avatar: null,
        phone: '+91 98765 12345',
    },
    'USR003': {
        id: 'USR003',
        name: 'Priya Patel',
        email: 'priya',           // Login ID
        password: 'priya',        // Login Password
        role: 'investor',
        avatar: null,
        phone: '+91 87654 32109',
    },
};

// Track current logged-in user (default to Lohith)
let currentUserId = 'USR001';

// Function to switch user (called from login)
export const setCurrentUserId = (userId) => {
    if (userAccounts[userId]) {
        currentUserId = userId;
    }
};

// Register a new user
export const registerUser = (userData) => {
    const newId = `USR${Object.keys(userAccounts).length + 1}`.padStart(6, '0');
    // Add to User Accounts (used for auth)
    userAccounts[newId] = {
        id: newId,
        role: 'investor', // Default role
        avatar: null,
        ...userData,
    };

    // Add to Investors List (used for project members)
    investors.push({
        id: newId,
        name: userData.name,
        email: userData.email,
        phone: '',
        totalInvested: 0,
        activeProjects: 0,
        joinedAt: new Date().toISOString().split('T')[0],
        status: 'active',
        kycVerified: false,
        privacySettings: {},
    });

    return userAccounts[newId];
};

// Get current user object
export const getCurrentUser = () => userAccounts[currentUserId];

// Legacy export for backward compatibility
export const currentUser = userAccounts['USR001'];

// ============================================
// PORTFOLIO DATA (Client View)
// ============================================
export const portfolioSummary = {
    totalInvested: 2500000,
    currentValue: 2875000,
    returns: 375000,
    returnsPercent: 15.0,
    lastUpdated: '2026-01-13T10:30:00Z',
};

export const investments = [
    {
        id: 'INV001',
        projectId: 'PRJ001',
        name: 'Green Valley Real Estate',
        type: 'Real Estate',
        invested: 1500000,
        currentValue: 1725000,
        returns: 225000,
        returnsPercent: 15.0,
        status: 'active',
        progress: 65,
        startDate: '2025-06-15',
        expectedEndDate: '2027-06-15',
    },
    {
        id: 'INV002',
        projectId: 'PRJ002',
        name: 'TechStart Fund II',
        type: 'Venture Capital',
        invested: 1000000,
        currentValue: 1150000,
        returns: 150000,
        returnsPercent: 15.0,
        status: 'active',
        progress: 40,
        startDate: '2025-09-01',
        expectedEndDate: '2028-09-01',
    },
];

export const recentUpdates = [
    {
        id: 'UPD001',
        title: 'Q3 Report Available',
        description: 'Quarterly performance report is now available for download.',
        project: 'Green Valley Real Estate',
        timestamp: '2026-01-12T14:30:00Z',
        type: 'report',
        read: false,
    },
    {
        id: 'UPD002',
        title: 'Approval Required',
        description: 'Project modification requires your approval.',
        project: 'Green Valley Real Estate',
        timestamp: '2026-01-13T09:00:00Z',
        type: 'approval',
        read: false,
    },
];

// ============================================
// PROJECT MODIFICATION APPROVALS (Investor Side)
// ============================================
export const pendingModifications = [
    {
        id: 'MOD001',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        title: 'Timeline Extension Request',
        description: 'Due to regulatory approvals taking longer than expected, we request extending the project completion by 3 months (from June 2027 to September 2027).',
        type: 'timeline',
        proposedBy: 'USR002', // Creator/Admin of PRJ001
        proposedAt: '2026-01-13T09:00:00Z',
        deadline: '2026-01-20T23:59:59Z',
        impact: {
            currentTimeline: 'June 2027',
            proposedTimeline: 'September 2027',
            returnImpact: 'No change in projected returns',
        },
        votes: {
            total: 4,
            approved: 2,
            rejected: 0,
            pending: 2,
        },
        // Privilege Chain: Individual investor approvals
        investorApprovals: {
            'USR001': { status: 'pending', votedAt: null },
            'USR002': { status: 'approved', votedAt: '2026-01-13T09:05:00Z' }, // Creator auto-approves
            'USR003': { status: 'approved', votedAt: '2026-01-13T14:30:00Z' },
            'USR004': { status: 'pending', votedAt: null },
        },
        creatorApproval: { status: 'approved', votedAt: '2026-01-13T09:05:00Z' },
        myVote: null, // null | 'approved' | 'rejected'
        status: 'pending', // 'pending' | 'approved' | 'rejected'
    },
    {
        id: 'MOD002',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        title: 'Additional Capital Call',
        description: 'To capitalize on a promising Series B opportunity in our portfolio company, we are requesting an optional additional investment of up to ₹2L per investor.',
        type: 'capital',
        proposedBy: 'USR001', // Creator/Admin of PRJ002 (current user)
        proposedAt: '2026-01-11T14:00:00Z',
        deadline: '2026-01-18T23:59:59Z',
        impact: {
            minAmount: 0,
            maxAmount: 200000,
            expectedReturn: '+18% projected over 2 years',
        },
        votes: {
            total: 3,
            approved: 2,
            rejected: 0,
            pending: 1,
        },
        // Privilege Chain: Individual investor approvals
        investorApprovals: {
            'USR001': { status: 'approved', votedAt: '2026-01-11T14:05:00Z' }, // Creator auto-approves
            'USR002': { status: 'approved', votedAt: '2026-01-12T10:00:00Z' },
            'USR004': { status: 'pending', votedAt: null },
        },
        creatorApproval: { status: 'approved', votedAt: '2026-01-11T14:05:00Z' },
        myVote: 'approved',
        status: 'pending',
    },
];

// ============================================
// QUARTERLY REPORTS DATA
// ============================================
export const financialYears = [
    { id: 'FY2526', label: 'FY 2025-26', current: true },
    { id: 'FY2425', label: 'FY 2024-25', current: false },
];

export const quarterlyReports = [
    {
        id: 'RPT001',
        quarter: 'Q3',
        year: 'FY 2025-26',
        period: 'Oct - Dec 2025',
        status: 'available',
        publishedDate: '2026-01-10',
        fileSize: '2.4 MB',
        investments: ['Green Valley Real Estate', 'TechStart Fund II'],
        highlights: {
            portfolioGrowth: 15.0,
            totalReturns: 375000,
            dividendsReceived: 50000,
        },
    },
    {
        id: 'RPT002',
        quarter: 'Q2',
        year: 'FY 2025-26',
        period: 'Jul - Sep 2025',
        status: 'available',
        publishedDate: '2025-10-08',
        fileSize: '2.1 MB',
        investments: ['Green Valley Real Estate', 'TechStart Fund II'],
        highlights: {
            portfolioGrowth: 8.5,
            totalReturns: 212500,
            dividendsReceived: 25000,
        },
    },
    {
        id: 'RPT003',
        quarter: 'Q1',
        year: 'FY 2025-26',
        period: 'Apr - Jun 2025',
        status: 'available',
        publishedDate: '2025-07-12',
        fileSize: '1.9 MB',
        investments: ['Green Valley Real Estate'],
        highlights: {
            portfolioGrowth: 3.2,
            totalReturns: 80000,
            dividendsReceived: 0,
        },
    },
];

// ============================================
// ADMIN DATA
// ============================================
export const adminKPIs = {
    totalAUM: 125000000,
    activeProjects: 4,
    totalInvestors: 48,
    pendingApprovals: 2,
    monthlyGrowth: 2.3,
    lastUpdated: '2026-01-13T10:00:00Z',
};

export const projects = [
    {
        id: 'PRJ001',
        name: 'Green Valley Real Estate',
        type: 'Real Estate',
        status: 'active',
        investorCount: 12,
        raised: 25000000,
        target: 30000000,
        progress: 83,
        startDate: '2025-06-15',
        phase: 'Construction',
        // Privilege Chain Fields
        createdBy: 'USR002', // Rahul Sharma created this
        projectAdmins: ['USR000', 'USR001', 'USR002', 'USR003', 'USR004'], // All members are admins for testing
        projectInvestors: ['USR000', 'USR001', 'USR002', 'USR003', 'USR004'],
        privilegeChain: {
            modificationsRequireAllApproval: true,
            approvalThreshold: 100,
        },
        // Member Roles: 'active' = full access, 'passive' = view only
        investorRoles: {
            'USR000': 'active',
            'USR001': 'active',
            'USR002': 'active',  // Creator is always active
            'USR003': 'passive',
            'USR004': 'passive',
        },
        ledgers: [
            { id: 'LDG001', name: 'Electrical', subLedgers: ['Ramesh Electricals', 'City Power', 'Standard Fittings'] },
            { id: 'LDG002', name: 'Transport', subLedgers: ['Fast Logistics', 'Local Tempo', 'Driver Kumar'] },
            { id: 'LDG003', name: 'Earthwork', subLedgers: ['JCB Operator', 'Soil Disposal Co'] },
            { id: 'LDG004', name: 'Civil Works', subLedgers: ['Mason Raju', 'Cement Supplier'] },
            { id: 'LDG005', name: 'Plumbing', subLedgers: ['Pipe House', 'Plumber John'] },
            { id: 'LDG006', name: 'Painting', subLedgers: ['Asian Paints Dealer', 'Painter Team'] },
            { id: 'LDG007', name: 'Carpentry', subLedgers: ['Wood Works'] },
            { id: 'LDG008', name: 'Flooring', subLedgers: ['Tiles World'] },
            { id: 'LDG009', name: 'Fabrication', subLedgers: ['Steel Works'] },
            { id: 'LDG010', name: 'Consultancy', subLedgers: ['Architect Firm', 'Structural Engineer'] },
            { id: 'LDG011', name: 'Legal', subLedgers: ['Advocate Sharma'] },
            { id: 'LDG012', name: 'Marketing', subLedgers: ['Digital Ads', 'Brochure Printing'] },
            { id: 'LDG013', name: 'Site Expenses', subLedgers: ['Tea & Snacks', 'Daily Labor'] },
            { id: 'LDG014', name: 'Fuel', subLedgers: ['Petrol Pump'] },
            { id: 'LDG015', name: 'Machinery', subLedgers: ['Rental Co'] },
            { id: 'LDG016', name: 'Safety', subLedgers: ['Helmets & Boots'] },
            { id: 'LDG017', name: 'Permissions', subLedgers: ['Municipal Corp'] },
            { id: 'LDG018', name: 'Water Supply', subLedgers: ['Tanker Service'] },
            { id: 'LDG019', name: 'Electricity', subLedgers: ['Bescom Bill'] },
            { id: 'LDG020', name: 'Miscellaneous', subLedgers: [] }
        ],
        pendingSpendings: [],
        spendings: [
            {
                id: 'SPD001',
                amount: 15000,
                description: 'Site inspection equipment',
                category: 'Product',
                date: '2026-01-15',
                time: '10:30 AM',
                addedBy: 'USR002',
                status: 'approved',
                approvals: { 'USR000': { status: 'approved', at: '2026-01-15T10:30:00Z' }, 'USR001': { status: 'approved', at: '2026-01-15T11:00:00Z' }, 'USR002': { status: 'approved', at: '2026-01-15T10:30:00Z' } }
            },
            {
                id: 'SPD002',
                amount: 8500,
                description: 'Architecture consultation',
                category: 'Service',
                date: '2026-01-12',
                time: '02:45 PM',
                addedBy: 'USR001',
                status: 'approved',
                approvals: { 'USR001': { status: 'approved', at: '2026-01-12T14:45:00Z' }, 'USR002': { status: 'approved', at: '2026-01-12T15:00:00Z' } }
            }
        ],
    },
    {
        id: 'PRJ002',
        name: 'TechStart Fund II',
        type: 'Venture Capital',
        status: 'active',
        investorCount: 24,
        raised: 15000000,
        target: 20000000,
        progress: 75,
        startDate: '2025-09-01',
        phase: 'Investment',
        // Privilege Chain Fields
        createdBy: 'USR001', // Lohith created this (current user)
        projectAdmins: ['USR000', 'USR001', 'USR002', 'USR003', 'USR004'], // All members are admins for testing
        projectInvestors: ['USR000', 'USR001', 'USR002', 'USR004'],
        privilegeChain: {
            modificationsRequireAllApproval: true,
            approvalThreshold: 100,
        },
        // Member Roles: 'active' = full access, 'passive' = view only
        investorRoles: {
            'USR000': 'active',
            'USR001': 'active',  // Creator is always active
            'USR002': 'passive',
            'USR004': 'active',
        },
        ledgers: [
            { id: 'LDG001', name: 'Marketing', subLedgers: ['Facebook Ads', 'Google Ads', 'Agency Fee'] },
            { id: 'LDG002', name: 'Legal Fees', subLedgers: ['Law Firm A', 'Registration'] },
            { id: 'LDG003', name: 'Operations', subLedgers: ['Server Cost', 'Office Rent'] },
            { id: 'LDG004', name: 'Salaries', subLedgers: ['Dev Team', 'Sales Team'] },
            { id: 'LDG005', name: 'Travel', subLedgers: ['Flight Tickets', 'Hotels'] }
        ],
        pendingSpendings: [
            {
                id: 'PND001',
                amount: 25000,
                description: 'Marketing campaign materials',
                category: 'Product',
                date: '2026-01-18',
                time: '09:15 AM',
                addedBy: 'USR002',
                status: 'pending',
                approvals: { 'USR002': { status: 'approved', at: '2026-01-18T09:15:00Z' } },
                rejections: {},
                totalMembers: 4
            }
        ],
        spendings: [
            {
                id: 'SPD003',
                amount: 45000,
                description: 'Legal consulting fees',
                category: 'Service',
                date: '2026-01-10',
                time: '11:00 AM',
                addedBy: 'USR001',
                status: 'approved',
                approvals: { 'USR000': { status: 'approved', at: '2026-01-10T12:00:00Z' }, 'USR001': { status: 'approved', at: '2026-01-10T11:00:00Z' }, 'USR002': { status: 'approved', at: '2026-01-10T13:00:00Z' }, 'USR004': { status: 'approved', at: '2026-01-10T14:00:00Z' } }
            }
        ],
        pendingInvitations: [],
    },
];

export const pendingApprovals = [
    {
        id: 'APR001',
        type: 'withdrawal',
        investor: { id: 'USR002', name: 'Rahul Sharma' },
        amount: 500000,
        project: 'Green Valley Real Estate',
        reason: 'Personal requirement',
        requestedAt: '2026-01-13T08:30:00Z',
        status: 'pending',
    },
    {
        id: 'APR002',
        type: 'investment',
        investor: { id: 'USR003', name: 'Priya Patel' },
        amount: 1000000,
        project: 'TechStart Fund II',
        requestedAt: '2026-01-12T16:00:00Z',
        status: 'pending',
    },
];

// ============================================
// USER SETTINGS
// ============================================
export const userSettings = {
    theme: 'light', // 'light' | 'dark'
    notifications: {
        pushEnabled: true,
        emailEnabled: true,
        reportAlerts: true,
        approvalReminders: true,
        marketUpdates: false,
    },
    language: 'en',
    currency: 'INR',
    biometricEnabled: false,
};

// ============================================
// PORTFOLIO ANALYTICS DATA
// ============================================
export const portfolioAnalytics = {
    monthlyReturns: [
        { month: 'Aug', value: 2.1 },
        { month: 'Sep', value: 3.5 },
        { month: 'Oct', value: 4.2 },
        { month: 'Nov', value: 2.8 },
        { month: 'Dec', value: 5.1 },
        { month: 'Jan', value: 3.2 },
    ],
    assetAllocation: [
        { type: 'Real Estate', percentage: 60, amount: 1725000, color: '#4F46E5' },
        { type: 'Venture Capital', percentage: 40, amount: 1150000, color: '#14B8A6' },
    ],
    performanceMetrics: {
        cagr: 15.0,
        sharpeRatio: 1.8,
        maxDrawdown: -5.2,
        volatility: 8.5,
    },
    yearlyReturns: [
        { year: '2024', return: 12.5 },
        { year: '2025', return: 18.2 },
        { year: '2026 YTD', return: 15.0 },
    ],
};

// ============================================
// ANNOUNCEMENTS DATA
// ============================================
export const announcements = [
    {
        id: 'ANN001',
        title: 'New Investment Opportunity',
        content: 'We are excited to announce a new real estate project in Bangalore. Early investors will get preferential rates.',
        priority: 'high',
        createdAt: '2026-01-14T10:00:00Z',
        createdBy: 'Admin',
        targetAudience: 'all', // 'all' | 'investors' | 'admins'
        read: false,
    },
    {
        id: 'ANN002',
        title: 'Platform Maintenance Notice',
        content: 'Scheduled maintenance on January 20th, 2026 from 2 AM to 4 AM IST. Please plan accordingly.',
        priority: 'medium',
        createdAt: '2026-01-13T15:00:00Z',
        createdBy: 'System',
        targetAudience: 'all',
        read: true,
    },
    {
        id: 'ANN003',
        title: 'Q3 Reports Published',
        content: 'Quarterly reports for all active projects are now available in the Reports section.',
        priority: 'low',
        createdAt: '2026-01-10T09:00:00Z',
        createdBy: 'Admin',
        targetAudience: 'investors',
        read: true,
    },
];

// ============================================
// PROJECT TEMPLATES (for Admin)
// ============================================
export const projectTypes = [
    { id: 'real_estate', label: 'Real Estate', icon: 'business' },
    { id: 'venture_capital', label: 'Venture Capital', icon: 'rocket' },
    { id: 'fixed_income', label: 'Fixed Income', icon: 'trending-up' },
    { id: 'private_equity', label: 'Private Equity', icon: 'briefcase' },
];

export const riskLevels = [
    { id: 'low', label: 'Low Risk', color: '#10B981' },
    { id: 'medium', label: 'Medium Risk', color: '#F59E0B' },
    { id: 'high', label: 'High Risk', color: '#EF4444' },
];

// ============================================
// INVESTORS LIST (for Admin)
// ============================================
export const investors = [
    {
        id: 'USR000',
        name: 'Lohith MS',
        email: 'investor123',
        phone: '+91 98765 43210',
        totalInvested: 10000000,
        activeProjects: 3,
        joinedAt: '2025-01-01',
        status: 'active',
        kycVerified: true,
        privacySettings: {},
    },
    {
        id: 'USR001',
        name: 'Lohith MS',
        email: 'lohith@investflow.com',
        phone: '+91 98765 43210',
        totalInvested: 2500000,
        activeProjects: 2,
        joinedAt: '2025-05-01',
        status: 'active',
        kycVerified: true,
        // Privacy settings per project
        privacySettings: {
            // Not anonymous in any project
        },
    },
    {
        id: 'USR002',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@email.com',
        phone: '+91 98765 12345',
        totalInvested: 3500000,
        activeProjects: 2,
        joinedAt: '2025-03-15',
        status: 'active',
        kycVerified: true,
        privacySettings: {
            // Visible in all projects (as creator of PRJ001)
        },
    },
    {
        id: 'USR003',
        name: 'Priya Patel',
        email: 'priya.patel@email.com',
        phone: '+91 87654 32109',
        totalInvested: 1000000,
        activeProjects: 1,
        joinedAt: '2025-08-20',
        status: 'active',
        kycVerified: true,
        // Anonymous in PRJ001 (doesn't want Rahul to know her identity)
        privacySettings: {
            'PRJ001': {
                isAnonymous: true,
                displayName: 'Anonymous Investor',
                showInvestmentAmount: false,
            },
        },
    },
    {
        id: 'USR004',
        name: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '+91 76543 21098',
        totalInvested: 5000000,
        activeProjects: 2,
        joinedAt: '2025-01-10',
        status: 'active',
        kycVerified: true,
        // Anonymous in PRJ002 (doesn't want Lohith's other investors to know)
        privacySettings: {
            'PRJ002': {
                isAnonymous: true,
                displayName: 'Private Investor',
                showInvestmentAmount: false,
            },
        },
    },
];

// Generate more investors for testing
const names = ['Suresh Raina', 'Vikram Singh', 'Anjali Gupta', 'Meera Reddy', 'Rajesh Koothrappali', 'Sheldon Cooper', 'Leonard Hofstadter', 'Howard Wolowitz', 'Penny Lane', 'Bernadette R', 'Amy Farrah Fowler', 'Stuart Bloom', 'Wil Wheaton', 'Barry Kripke', 'Leslie Winkle', 'Zack Johnson', 'Priya Koothrappali', 'Debbie Wolowitz', 'Mary Cooper', 'Missy Cooper', 'Georgie Cooper', 'Meemaw Const', 'Dale Ballard', 'John Sturgis', 'Dr. Linkletter'];
names.forEach((name, index) => {
    const id = `USR${(index + 5).toString().padStart(3, '0')}`;
    investors.push({
        id,
        name,
        email: `${name.toLowerCase().replace(/ /g, '.')}@email.com`,
        phone: `+91 ${9000000000 + index}`,
        totalInvested: Math.floor(Math.random() * 10000000),
        activeProjects: Math.floor(Math.random() * 5),
        joinedAt: '2025-01-01',
        status: 'active',
        kycVerified: true,
        privacySettings: {},
    });
});

// ============================================
// HELPER FUNCTIONS
// ============================================
export const simulateApiDelay = (ms = 1000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
};

export const getDaysRemaining = (deadlineString) => {
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffMs = deadline - now;
    const diffDays = Math.ceil(diffMs / 86400000);
    return diffDays;
};

// ============================================
// DAILY EXPENSES DATA - Personal Finance Tracker
// ============================================

// Expense Categories
export const expenseCategories = [
    { id: 'food', label: 'Food', icon: 'food' },
    { id: 'transport', label: 'Transport', icon: 'car' },
    { id: 'shopping', label: 'Shopping', icon: 'shopping' },
    { id: 'bills', label: 'Bills', icon: 'receipt' },
    { id: 'entertainment', label: 'Entertainment', icon: 'movie-open' },
    { id: 'health', label: 'Health', icon: 'medical-bag' },
    { id: 'education', label: 'Education', icon: 'school' },
    { id: 'grocery', label: 'Grocery', icon: 'cart' },
    { id: 'other', label: 'Other', icon: 'dots-horizontal' },
];

// ============================================
// DAILY EXPENSES DATA
// TODO: Replace with API call: GET /api/expenses?userId={userId}&startDate={date}&endDate={date}
// ============================================

// Daily Expenses - Mutable array for adding new expenses
export const dailyExpenses = [
    // === TODAY'S EXPENSES (USR001) ===
    {
        id: 'EXP001',
        userId: 'USR001',
        amount: 250,
        note: 'Morning coffee & breakfast at Starbucks',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        time: '08:30',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'EXP002',
        userId: 'USR001',
        amount: 50,
        note: 'Metro card recharge',
        category: 'transport',
        date: new Date().toISOString().split('T')[0],
        time: '09:15',
        createdAt: new Date().toISOString(),
    },
    // === TODAY'S EXPENSES (USR000) - For fallback ===
    {
        id: 'EXP001_0',
        userId: 'USR000',
        amount: 250,
        note: 'Morning coffee & breakfast at Starbucks',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        time: '08:30',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'EXP002_0',
        userId: 'USR000',
        amount: 50,
        note: 'Metro card recharge',
        category: 'transport',
        date: new Date().toISOString().split('T')[0],
        time: '09:15',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'EXP003',
        userId: 'USR001',
        amount: 380,
        note: 'Lunch with colleagues at Mainland China',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        time: '13:00',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'EXP004',
        userId: 'USR001',
        amount: 1850,
        note: 'Weekly groceries - BigBasket',
        category: 'grocery',
        date: new Date().toISOString().split('T')[0],
        time: '18:45',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'EXP004B',
        userId: 'USR001',
        amount: 299,
        note: 'Spotify Premium subscription',
        category: 'entertainment',
        date: new Date().toISOString().split('T')[0],
        time: '20:00',
        createdAt: new Date().toISOString(),
    },
    // === YESTERDAY'S EXPENSES ===
    {
        id: 'EXP005',
        userId: 'USR001',
        amount: 500,
        note: 'Movie tickets',
        category: 'entertainment',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        time: '19:00',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'EXP006',
        userId: 'USR001',
        amount: 350,
        note: 'Dinner at restaurant',
        category: 'food',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        time: '21:30',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'EXP007',
        userId: 'USR001',
        amount: 2500,
        note: 'Electricity bill',
        category: 'bills',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        time: '11:00',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    // Older expenses for variety
    {
        id: 'EXP008',
        userId: 'USR001',
        amount: 800,
        note: 'Cab to airport',
        category: 'transport',
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        time: '06:00',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
        id: 'EXP009',
        userId: 'USR001',
        amount: 1500,
        note: 'Online course subscription',
        category: 'education',
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        time: '10:30',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
        id: 'EXP010',
        userId: 'USR001',
        amount: 450,
        note: 'Medicine & vitamins',
        category: 'health',
        date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        time: '17:15',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    // More test data for export testing
    {
        id: 'EXP011',
        userId: 'USR001',
        amount: 3500,
        note: 'New headphones',
        category: 'shopping',
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        time: '14:30',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
        id: 'EXP012',
        userId: 'USR001',
        amount: 220,
        note: 'Auto ride to mall',
        category: 'transport',
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        time: '13:00',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
        id: 'EXP013',
        userId: 'USR001',
        amount: 890,
        note: 'Pizza party with friends',
        category: 'food',
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        time: '20:00',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
        id: 'EXP014',
        userId: 'USR001',
        amount: 1800,
        note: 'Internet bill',
        category: 'bills',
        date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
        time: '10:00',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
        id: 'EXP015',
        userId: 'USR001',
        amount: 650,
        note: 'Gym membership renewal',
        category: 'health',
        date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
        time: '07:30',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
        id: 'EXP016',
        userId: 'USR001',
        amount: 2200,
        note: 'Weekly vegetables & fruits',
        category: 'grocery',
        date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        time: '11:30',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
        id: 'EXP017',
        userId: 'USR001',
        amount: 380,
        note: 'Netflix subscription',
        category: 'entertainment',
        date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        time: '09:00',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
        id: 'EXP018',
        userId: 'USR001',
        amount: 150,
        note: 'Morning chai & snacks',
        category: 'food',
        date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
        time: '08:00',
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
        id: 'EXP019',
        userId: 'USR001',
        amount: 4500,
        note: 'New shoes - Nike',
        category: 'shopping',
        date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
        time: '16:45',
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
        id: 'EXP020',
        userId: 'USR001',
        amount: 320,
        note: 'Uber to work',
        category: 'transport',
        date: new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0],
        time: '09:15',
        createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    },
    {
        id: 'EXP021',
        userId: 'USR001',
        amount: 750,
        note: 'Book - JavaScript Mastery',
        category: 'education',
        date: new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0],
        time: '14:00',
        createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    },
    {
        id: 'EXP022',
        userId: 'USR001',
        amount: 1200,
        note: 'Concert tickets',
        category: 'entertainment',
        date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        time: '19:00',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
        id: 'EXP023',
        userId: 'USR001',
        amount: 95,
        note: 'Cold coffee',
        category: 'food',
        date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        time: '15:30',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
        id: 'EXP024',
        userId: 'USR001',
        amount: 5000,
        note: 'Mobile phone repair',
        category: 'other',
        date: new Date(Date.now() - 11 * 86400000).toISOString().split('T')[0],
        time: '12:00',
        createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    },
    {
        id: 'EXP025',
        userId: 'USR001',
        amount: 180,
        note: 'Lunch - biryani',
        category: 'food',
        date: new Date(Date.now() - 11 * 86400000).toISOString().split('T')[0],
        time: '13:30',
        createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    },
    {
        id: 'EXP026',
        userId: 'USR001',
        amount: 3200,
        note: 'Gas cylinder refill',
        category: 'bills',
        date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
        time: '10:00',
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
        id: 'EXP027',
        userId: 'USR001',
        amount: 550,
        note: 'Haircut & grooming',
        category: 'other',
        date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
        time: '11:00',
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
        id: 'EXP028',
        userId: 'USR001',
        amount: 1600,
        note: 'Dairy products - milk, curd, paneer',
        category: 'grocery',
        date: new Date(Date.now() - 13 * 86400000).toISOString().split('T')[0],
        time: '08:30',
        createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
    },
    {
        id: 'EXP029',
        userId: 'USR001',
        amount: 280,
        note: 'Eye drops & tissues',
        category: 'health',
        date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        time: '18:00',
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
        id: 'EXP030',
        userId: 'USR001',
        amount: 420,
        note: 'Parking charges - weekly',
        category: 'transport',
        date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        time: '17:00',
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
];

// Add a new daily expense
export const addDailyExpense = (expenseData) => {
    const currentUser = getCurrentUser();
    const newExpense = {
        id: `EXP${Date.now()}`,
        userId: currentUser.id,
        amount: expenseData.amount,
        note: expenseData.note,
        category: expenseData.category || 'other',
        date: expenseData.date || new Date().toISOString().split('T')[0],
        time: expenseData.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
    };

    dailyExpenses.unshift(newExpense); // Add to beginning
    return newExpense;
};

// Get expenses by date
export const getExpensesByDate = (dateStr) => {
    const currentUser = getCurrentUser();
    return dailyExpenses
        .filter(exp => exp.userId === currentUser.id && exp.date === dateStr)
        .sort((a, b) => a.time.localeCompare(b.time));
};

// Get expenses by date range
export const getExpensesByDateRange = (startDate, endDate) => {
    const currentUser = getCurrentUser();
    return dailyExpenses
        .filter(exp => {
            return exp.userId === currentUser.id &&
                exp.date >= startDate &&
                exp.date <= endDate;
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
};

// Get expense summary for current month
export const getDailyExpenseSummary = () => {
    const currentUser = getCurrentUser();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthExpenses = dailyExpenses.filter(exp =>
        exp.userId === currentUser.id &&
        exp.date >= startOfMonth &&
        exp.date <= endOfMonth
    );

    const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Category breakdown
    const categoryBreakdown = {};
    expenseCategories.forEach(cat => {
        categoryBreakdown[cat.id] = 0;
    });
    monthExpenses.forEach(exp => {
        if (categoryBreakdown[exp.category] !== undefined) {
            categoryBreakdown[exp.category] += exp.amount;
        } else {
            categoryBreakdown.other += exp.amount;
        }
    });

    // Daily average
    const daysInMonth = now.getDate();
    const dailyAverage = Math.round(monthTotal / daysInMonth);

    return {
        monthTotal,
        categoryBreakdown,
        dailyAverage,
        transactionCount: monthExpenses.length,
        budget: 30000, // Default monthly budget
    };
};

// Get expense trends (last 7 days)
export const getExpenseTrends = () => {
    const currentUser = getCurrentUser();
    const trends = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });

        const dayTotal = dailyExpenses
            .filter(exp => exp.userId === currentUser.id && exp.date === dateStr)
            .reduce((sum, exp) => sum + exp.amount, 0);

        trends.push({
            date: dateStr,
            dayName,
            total: dayTotal,
        });
    }

    return trends;
};

// Delete expense
export const deleteDailyExpense = (expenseId) => {
    const index = dailyExpenses.findIndex(exp => exp.id === expenseId);
    if (index > -1) {
        dailyExpenses.splice(index, 1);
        return true;
    }
    return false;
};

// Update expense
export const updateDailyExpense = (expenseId, updates) => {
    const expense = dailyExpenses.find(exp => exp.id === expenseId);
    if (expense) {
        Object.assign(expense, updates, { updatedAt: new Date().toISOString() });
        return expense;
    }
    return null;
};

// ============================================
// PROJECT SPENDINGS INTEGRATION
// Central store for approved project spendings to sync with expense tracker
// 
// TODO: Replace with API calls for backend integration:
// - GET  /api/project-spendings?userId={userId}&status=approved
// - POST /api/project-spendings (when spending is approved)
// - GET  /api/project-spendings/{projectId}
// ============================================

// Centralized project spendings storage
// NOTE: This data auto-syncs when project spending is approved by all members
export const projectSpendings = [
    // === TODAY'S PROJECT EXPENSES (USR001) ===
    {
        id: 'PSPND001',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR001',
        amount: 45000,
        description: 'Electrical wiring materials - Phase 1',
        category: 'Product',
        paidTo: null,
        materialType: 'Electronics',
        date: new Date().toISOString().split('T')[0],
        time: '08:30',
        status: 'approved',
        addedBy: 'USR001',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    },
    // === TODAY'S PROJECT EXPENSES (USR000) ===
    {
        id: 'PSPND001_0',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR000',
        amount: 45000,
        description: 'Electrical wiring materials - Phase 1',
        category: 'Product',
        paidTo: null,
        materialType: 'Electronics',
        date: new Date().toISOString().split('T')[0],
        time: '08:30',
        status: 'approved',
        addedBy: 'USR000',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    },
    {
        id: 'PSPND002',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        userId: 'USR001',
        amount: 12500,
        description: 'Team meeting & lunch - client presentation',
        category: 'Service',
        paidTo: { person: 'Taj Hotels', place: 'Conference Room B' },
        materialType: null,
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        status: 'approved',
        addedBy: 'USR002',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    },
    // === YESTERDAY'S PROJECT EXPENSES (USR001) ===
    {
        id: 'PSPND003',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        userId: 'USR001',
        amount: 8500,
        description: 'Marketing consultant fees - SEO audit',
        category: 'Service',
        paidTo: { person: 'Digital Marketers Co', place: 'Virtual Meeting' },
        materialType: null,
        date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        time: '16:00',
        status: 'approved',
        addedBy: 'USR001',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    // === YESTERDAY'S PROJECT EXPENSES (USR000) ===
    {
        id: 'PSPND003_0',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        userId: 'USR000',
        amount: 8500,
        description: 'Marketing consultant fees - SEO audit',
        category: 'Service',
        paidTo: { person: 'Digital Marketers Co', place: 'Virtual Meeting' },
        materialType: null,
        date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        time: '16:00',
        status: 'approved',
        addedBy: 'USR000',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
        id: 'PSPND004',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR001',
        amount: 28000,
        description: 'Plumber payment - bathroom fittings install',
        category: 'Service',
        paidTo: { person: 'Sharma Plumbing Works', place: 'Site A - Block 2' },
        materialType: null,
        date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        time: '11:00',
        status: 'approved',
        addedBy: 'USR003',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
        id: 'PSPND005',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR001',
        amount: 650,
        description: 'Diesel for generator',
        category: 'Product',
        paidTo: null,
        materialType: 'Raw Materials',
        date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        time: '09:30',
        status: 'approved',
        addedBy: 'USR001',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    // === 2 DAYS AGO ===
    {
        id: 'PSPND006',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        userId: 'USR001',
        amount: 25000,
        description: 'AWS server hosting - 6 months advance',
        category: 'Service',
        paidTo: { person: 'Amazon Web Services', place: 'Online Payment' },
        materialType: null,
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        time: '10:30',
        status: 'approved',
        addedBy: 'USR001',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
        id: 'PSPND007',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR001',
        amount: 78500,
        description: 'Tiles and flooring - Italian marble',
        category: 'Product',
        paidTo: null,
        materialType: 'Construction',
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        time: '15:00',
        status: 'approved',
        addedBy: 'USR002',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    // === 3 DAYS AGO ===
    {
        id: 'PSPND008',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        userId: 'USR001',
        amount: 15000,
        description: 'Office supplies - Stationery and printer ink',
        category: 'Product',
        paidTo: null,
        materialType: 'Office Supplies',
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        time: '14:00',
        status: 'approved',
        addedBy: 'USR002',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    // === 4 DAYS AGO ===
    {
        id: 'PSPND009',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR001',
        amount: 75000,
        description: 'Contractor payment - Foundation work completion',
        category: 'Service',
        paidTo: { person: 'Raj Kumar Constructions', place: 'Site A' },
        materialType: null,
        date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        time: '09:00',
        status: 'approved',
        addedBy: 'USR001',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    // === 5 DAYS AGO ===
    {
        id: 'PSPND010',
        projectId: 'PRJ001',
        projectName: 'Green Valley Real Estate',
        userId: 'USR001',
        amount: 125000,
        description: 'Cement & Steel - bulk purchase',
        category: 'Product',
        paidTo: null,
        materialType: 'Construction',
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        time: '11:30',
        status: 'approved',
        addedBy: 'USR003',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
        id: 'PSPND011',
        projectId: 'PRJ002',
        projectName: 'TechStart Fund II',
        userId: 'USR001',
        amount: 5500,
        description: 'Domain renewal - 3 years',
        category: 'Service',
        paidTo: { person: 'GoDaddy', place: 'Online' },
        materialType: null,
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        time: '18:00',
        status: 'approved',
        addedBy: 'USR001',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
];

// ============================================
// PROJECT SPENDING API FUNCTIONS
// TODO: Replace mock implementations with actual API calls
// ============================================

/**
 * Add a project spending to the central store
 * Called when a spending is approved by all project members
 * 
 * TODO: Replace with API call:
 * POST /api/project-spendings
 * Body: { projectId, amount, description, category, paidTo, materialType, ... }
 */
export const addProjectSpending = (spending, projectInfo) => {
    const newProjectSpending = {
        id: `PSPND${Date.now()}`,
        projectId: projectInfo.id,
        projectName: projectInfo.name,
        userId: getCurrentUser().id,
        ...spending,
        createdAt: new Date().toISOString(),
    };
    projectSpendings.unshift(newProjectSpending);
    return newProjectSpending;
};

/**
 * Get all project spendings for the current user
 * 
 * TODO: Replace with API call:
 * GET /api/project-spendings?userId={userId}&status=approved
 */
export const getProjectSpendingsByUser = () => {
    const currentUser = getCurrentUser();
    return projectSpendings
        .filter(s => s.userId === currentUser.id && s.status === 'approved')
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
};

/**
 * Get project spendings by date range
 * 
 * TODO: Replace with API call:
 * GET /api/project-spendings?userId={userId}&startDate={startDate}&endDate={endDate}
 */
export const getProjectSpendingsByDateRange = (startDate, endDate) => {
    const currentUser = getCurrentUser();
    return projectSpendings
        .filter(s =>
            s.userId === currentUser.id &&
            s.status === 'approved' &&
            s.date >= startDate &&
            s.date <= endDate
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
};

/**
 * Get project spendings by specific date
 * 
 * TODO: Replace with API call:
 * GET /api/project-spendings?userId={userId}&date={dateStr}
 */
export const getProjectSpendingsByDate = (dateStr) => {
    const currentUser = getCurrentUser();
    return projectSpendings
        .filter(s => s.userId === currentUser.id && s.date === dateStr && s.status === 'approved')
        .sort((a, b) => a.time.localeCompare(b.time));
};

// ============================================
// COMBINED EXPENSES API FUNCTIONS (Personal + Project)
// These functions aggregate data from both sources for the expense history view
// ============================================

// Get all combined expenses for the current user (for export)
export const getAllCombinedExpenses = (startDate, endDate) => {
    const currentUser = getCurrentUser();

    // Get personal expenses
    const personalExpenses = dailyExpenses
        .filter(exp =>
            exp.userId === currentUser.id &&
            exp.date >= startDate &&
            exp.date <= endDate
        )
        .map(exp => ({
            ...exp,
            source: 'personal',
            projectId: null,
            projectName: null,
            paidTo: null,
            materialType: null,
        }));

    // Get project spendings
    const projectExp = projectSpendings
        .filter(s =>
            s.userId === currentUser.id &&
            s.status === 'approved' &&
            s.date >= startDate &&
            s.date <= endDate
        )
        .map(s => ({
            id: s.id,
            userId: s.userId,
            amount: s.amount,
            note: s.description,
            category: s.category === 'Service' ? 'project_service' : 'project_product',
            date: s.date,
            time: s.time,
            createdAt: s.createdAt,
            source: 'project',
            projectId: s.projectId,
            projectName: s.projectName,
            paidTo: s.paidTo,
            materialType: s.materialType,
        }));

    // Combine and sort by date and time
    return [...personalExpenses, ...projectExp]
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
};

// Get combined expenses by date
export const getCombinedExpensesByDate = (dateStr) => {
    const currentUser = getCurrentUser();

    // Personal expenses
    const personal = dailyExpenses
        .filter(exp => exp.userId === currentUser.id && exp.date === dateStr)
        .map(exp => ({
            ...exp,
            source: 'personal',
            projectName: null,
        }));

    // Project spendings
    const project = projectSpendings
        .filter(s => s.userId === currentUser.id && s.date === dateStr && s.status === 'approved')
        .map(s => ({
            id: s.id,
            userId: s.userId,
            amount: s.amount,
            note: s.description,
            category: s.category,
            date: s.date,
            time: s.time,
            createdAt: s.createdAt,
            source: 'project',
            projectName: s.projectName,
            paidTo: s.paidTo,
            materialType: s.materialType,
        }));

    return [...personal, ...project].sort((a, b) => a.time.localeCompare(b.time));
};

/**
 * Get project expenses added by the current logged-in user
 * This filters to show only expenses that the user personally added
 * 
 * TODO: Replace with API call:
 * GET /api/project-expenses?addedBy={userId}&startDate={startDate}&endDate={endDate}
 */
export const getProjectExpensesByUserInvestments = (startDate, endDate) => {
    const currentUser = getCurrentUser();

    // Get projects where the current user is an investor/member
    const userProjectIds = projects
        .filter(p => p.projectInvestors && p.projectInvestors.includes(currentUser.id))
        .map(p => p.id);

    // Get project spendings ONLY added by the current user from their projects
    return projectSpendings
        .filter(s =>
            s.status === 'approved' &&
            s.addedBy === currentUser.id && // Only transactions added by this user
            userProjectIds.includes(s.projectId) &&
            s.date >= startDate &&
            s.date <= endDate
        )
        .map(s => ({
            id: s.id,
            userId: s.userId,
            amount: s.amount,
            note: s.description,
            category: s.category === 'Service' ? 'project_service' : 'project_product',
            date: s.date,
            time: s.time,
            createdAt: s.createdAt,
            source: 'project',
            projectId: s.projectId,
            projectName: s.projectName,
            paidTo: s.paidTo,
            materialType: s.materialType,
            addedBy: s.addedBy,
        }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
};

/**
 * Get summary of project expenses added by the current logged-in user
 */
export const getProjectExpenseSummaryByUserInvestments = () => {
    const currentUser = getCurrentUser();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Get projects where the current user is an investor/member
    const userProjectIds = projects
        .filter(p => p.projectInvestors && p.projectInvestors.includes(currentUser.id))
        .map(p => p.id);

    // Get project spendings ONLY added by the current user
    const projectExp = projectSpendings.filter(s =>
        s.status === 'approved' &&
        s.addedBy === currentUser.id && // Only transactions added by this user
        userProjectIds.includes(s.projectId) &&
        s.date >= startOfMonth &&
        s.date <= endOfMonth
    );

    const projectTotal = projectExp.reduce((sum, s) => sum + s.amount, 0);

    // Category breakdown for project categories
    const categoryBreakdown = {
        'project_service': 0,
        'project_product': 0,
    };

    projectExp.forEach(s => {
        if (s.category === 'Service') {
            categoryBreakdown['project_service'] += s.amount;
        } else {
            categoryBreakdown['project_product'] += s.amount;
        }
    });

    const daysInMonth = now.getDate();

    return {
        projectTotal,
        monthTotal: projectTotal,
        categoryBreakdown,
        dailyAverage: Math.round(projectTotal / daysInMonth),
        transactionCount: projectExp.length,
        projectCount: userProjectIds.length,
    };
};

// Get combined summary for month
export const getCombinedExpenseSummary = () => {
    const currentUser = getCurrentUser();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Personal expenses total
    const personalTotal = dailyExpenses
        .filter(exp =>
            exp.userId === currentUser.id &&
            exp.date >= startOfMonth &&
            exp.date <= endOfMonth
        )
        .reduce((sum, exp) => sum + exp.amount, 0);

    // Project spendings total
    const projectTotal = projectSpendings
        .filter(s =>
            s.userId === currentUser.id &&
            s.status === 'approved' &&
            s.date >= startOfMonth &&
            s.date <= endOfMonth
        )
        .reduce((sum, s) => sum + s.amount, 0);

    // Category breakdown including project categories
    const categoryBreakdown = {};
    expenseCategories.forEach(cat => {
        categoryBreakdown[cat.id] = 0;
    });
    categoryBreakdown['project_service'] = 0;
    categoryBreakdown['project_product'] = 0;

    // Personal expenses by category
    dailyExpenses
        .filter(exp =>
            exp.userId === currentUser.id &&
            exp.date >= startOfMonth &&
            exp.date <= endOfMonth
        )
        .forEach(exp => {
            if (categoryBreakdown[exp.category] !== undefined) {
                categoryBreakdown[exp.category] += exp.amount;
            } else {
                categoryBreakdown.other += exp.amount;
            }
        });

    // Project spendings by category
    projectSpendings
        .filter(s =>
            s.userId === currentUser.id &&
            s.status === 'approved' &&
            s.date >= startOfMonth &&
            s.date <= endOfMonth
        )
        .forEach(s => {
            if (s.category === 'Service') {
                categoryBreakdown['project_service'] += s.amount;
            } else {
                categoryBreakdown['project_product'] += s.amount;
            }
        });

    const grandTotal = personalTotal + projectTotal;
    const daysInMonth = now.getDate();

    return {
        personalTotal,
        projectTotal,
        monthTotal: grandTotal,
        categoryBreakdown,
        dailyAverage: Math.round(grandTotal / daysInMonth),
        transactionCount: dailyExpenses.filter(exp =>
            exp.userId === currentUser.id &&
            exp.date >= startOfMonth &&
            exp.date <= endOfMonth
        ).length + projectSpendings.filter(s =>
            s.userId === currentUser.id &&
            s.status === 'approved' &&
            s.date >= startOfMonth &&
            s.date <= endOfMonth
        ).length,
        budget: 50000, // Increased budget for combined expenses
    };
};
