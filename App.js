import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Services
import NotificationService from './src/services/notificationService';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import ReportsScreen from './src/screens/client/ReportsScreen';
import ApprovalsScreen from './src/screens/client/ApprovalsScreen';
import PortfolioAnalyticsScreen from './src/screens/client/PortfolioAnalyticsScreen';

// Investor Screens
import InvestorDashboard from './src/screens/investor/InvestorDashboard';
import CreateProjectInvestorScreen from './src/screens/investor/CreateProjectInvestorScreen';
import ManageProjectInvestorsScreen from './src/screens/investor/ManageProjectInvestorsScreen';
import ProjectApprovalDetailScreen from './src/screens/investor/ProjectApprovalDetailScreen';
import ProjectDetailScreen from './src/screens/investor/ProjectDetailScreen';

// Expense Tracking Screens
import DailyExpensesScreen from './src/screens/expenses/DailyExpensesScreen';
import ExpenseAnalyticsScreen from './src/screens/expenses/ExpenseAnalyticsScreen';

// Admin Screens
import AdminDashboard from './src/screens/admin/AdminDashboard';
import CreateProjectScreen from './src/screens/admin/CreateProjectScreen';
import AddInvestorScreen from './src/screens/admin/AddInvestorScreen';
import AnnouncementsScreen from './src/screens/admin/AnnouncementsScreen';

// Shared Screens
import ProfileScreen from './src/screens/shared/ProfileScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';
import NotificationScreen from './src/screens/shared/NotificationScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isAuthenticated, isOnboarded, login, logout, completeOnboarding, user } = useAuth();
  const userRole = user?.role || 'investor';
  const isAdminUser = ['admin', 'super_admin', 'project_admin'].includes(userRole);

  // Initialize notifications on app start
  useEffect(() => {
    const initNotifications = async () => {
      await NotificationService.initialize();

      // Set up notification listeners
      NotificationService.setupListeners(
        // Called when notification is received while app is in foreground
        (notification) => {
          console.log('Notification received in foreground:', notification.request.content.title);
        },
        // Called when user taps on a notification
        (response) => {
          const data = response.notification.request.content.data;
          console.log('User tapped notification:', data);
          // Handle navigation based on notification type here
        }
      );
    };

    initNotifications();

    return () => {
      NotificationService.removeListeners();
    };
  }, []);

  const renderScreens = () => {
    if (!isAuthenticated) {
      return (
        <>
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={login} />}
          </Stack.Screen>
          <Stack.Screen name="SignUp">
            {(props) => <SignUpScreen {...props} onLogin={login} />}
          </Stack.Screen>
        </>
      );
    }

    if (!isOnboarded) {
      return (
        <Stack.Screen name="Onboarding">
          {(props) => <OnboardingScreen {...props} onComplete={completeOnboarding} />}
        </Stack.Screen>
      );
    }

    return (
      <>
        {/* Dashboards */}
        <Stack.Screen name="InvestorDashboard">
          {(props) => <InvestorDashboard {...props} onLogout={logout} />}
        </Stack.Screen>
        <Stack.Screen name="AdminDashboard">
          {(props) => <AdminDashboard {...props} onLogout={logout} />}
        </Stack.Screen>

        {/* Admin Modules — only available to admin roles */}
        {isAdminUser && (
              <>
                <Stack.Screen
                  name="CreateProject"
                  component={CreateProjectScreen}
                  options={{ animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="AddInvestor"
                  component={AddInvestorScreen}
                  options={{ animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="Announcements"
                  component={AnnouncementsScreen}
                  options={{ animation: 'slide_from_bottom' }}
                />
              </>
            )}

            {/* Client Modules */}
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Approvals"
              component={ApprovalsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="PortfolioAnalytics"
              component={PortfolioAnalyticsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />

            {/* Investor Modules */}
            <Stack.Screen
              name="CreateProjectInvestor"
              component={CreateProjectInvestorScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ManageProjectInvestors"
              component={ManageProjectInvestorsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ProjectDetail"
              component={ProjectDetailScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ProjectApprovalDetail"
              component={ProjectApprovalDetailScreen}
              options={{ animation: 'slide_from_bottom' }}
            />

            {/* Shared Modules */}
            <Stack.Screen name="Profile">
              {(props) => <ProfileScreen {...props} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />

            {/* Expense Modules */}
            <Stack.Screen
              name="DailyExpenses"
              component={DailyExpensesScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ExpenseAnalytics"
              component={ExpenseAnalyticsScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        );
      };

      return (
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            {renderScreens()}
          </Stack.Navigator>
        </NavigationContainer>
      );
}

// Components
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    Ionicons.loadFont();
    MaterialCommunityIcons.loadFont();
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
