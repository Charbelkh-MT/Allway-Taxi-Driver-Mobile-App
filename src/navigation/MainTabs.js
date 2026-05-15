import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TripsScreen from '../screens/TripsScreen';
import AccountScreen from '../screens/AccountScreen';
import CustomTabBar from '../components/CustomTabBar';
import { useDriver, DRIVER_STATE } from '../context/DriverContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { driverState } = useDriver();
  const isActive = driverState === DRIVER_STATE.ACTIVE;

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute' },
      }}
      initialRouteName="Home"
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      {/* Disable Trips and Account tabs while on an active trip so the driver
          can't accidentally navigate away from the active trip screen */}
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{ tabBarEnabled: !isActive }}
        listeners={isActive ? { tabPress: e => e.preventDefault() } : undefined}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarEnabled: !isActive }}
        listeners={isActive ? { tabPress: e => e.preventDefault() } : undefined}
      />
    </Tab.Navigator>
  );
}
