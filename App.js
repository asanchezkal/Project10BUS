import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SchoolDashboardScreen from './src/screens/SchoolDashboardScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import ParentDashboardScreen from './src/screens/ParentDashboardScreen';
import BusTrackingScreen from './src/screens/BusTrackingScreen';
import RouteManagementScreen from './src/screens/RouteManagementScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';
import ETAScreen from './src/screens/ETAScreen';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { NotificationProvider } from './src/context/NotificationContext';

// Import theme
import { theme } from './src/theme/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// School Admin Navigation
const SchoolDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: '#fff',
      drawerActiveTintColor: theme.colors.primary,
    }}
  >
    <Drawer.Screen 
      name="Dashboard" 
      component={SchoolDashboardScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Bus Management" 
      component={BusManagementStack}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="bus" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Route Management" 
      component={RouteManagementScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="map" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="User Management" 
      component={UserManagementScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="people" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="settings" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// Bus Management Stack for School Admin
const BusManagementStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="BusList" 
      component={BusListScreen}
      options={{ title: 'Bus Management' }}
    />
    <Stack.Screen 
      name="BusDetails" 
      component={BusDetailsScreen}
      options={{ title: 'Bus Details' }}
    />
    <Stack.Screen 
      name="AddBus" 
      component={AddBusScreen}
      options={{ title: 'Add New Bus' }}
    />
  </Stack.Navigator>
);

// Driver Navigation
const DriverTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Map') {
          iconName = focused ? 'map' : 'map-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DriverDashboardScreen}
      options={{ title: 'Driver Dashboard' }}
    />
    <Tab.Screen 
      name="Map" 
      component={MapScreen}
      options={{ title: 'Live Map' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

// Parent Navigation
const ParentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'ETA') {
          iconName = focused ? 'time' : 'time-outline';
        } else if (route.name === 'Map') {
          iconName = focused ? 'map' : 'map-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={ParentDashboardScreen}
      options={{ title: 'Parent Dashboard' }}
    />
    <Tab.Screen 
      name="ETA" 
      component={ETAScreen}
      options={{ title: 'Bus ETA' }}
    />
    <Tab.Screen 
      name="Map" 
      component={MapScreen}
      options={{ title: 'Live Map' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

// Main Navigation
const Navigation = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Role-based navigation
          <>
            {user.role === 'school' && (
              <Stack.Screen name="SchoolAdmin" component={SchoolDrawer} />
            )}
            {user.role === 'driver' && (
              <Stack.Screen name="Driver" component={DriverTabs} />
            )}
            {user.role === 'parent' && (
              <Stack.Screen name="Parent" component={ParentTabs} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Loading Screen
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

// Main App Component
export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
    });

    // Listen for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <LocationProvider>
          <NotificationProvider>
            <Navigation />
            <StatusBar style="auto" />
          </NotificationProvider>
        </LocationProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

// Register for push notifications
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }
  
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Expo push token:', token);

  return token;
}

// Import missing components
import { View, ActivityIndicator, Platform } from 'react-native';
import BusListScreen from './src/screens/BusListScreen';
import BusDetailsScreen from './src/screens/BusDetailsScreen';
import AddBusScreen from './src/screens/AddBusScreen'; 