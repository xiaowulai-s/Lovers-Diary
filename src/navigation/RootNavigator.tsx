import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import { AppTabBar } from '../components/AppTabBar';
import { useAuth } from '../providers/AuthProvider';
import { AccessErrorScreen } from '../screens/AccessErrorScreen';
import { AnniversariesScreen } from '../screens/AnniversariesScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { FoodScreen } from '../screens/FoodScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LaunchScreen } from '../screens/LaunchScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { PlansScreen } from '../screens/PlansScreen';
import { colors } from '../theme';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.canvas,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.accent,
  },
};

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading' || status === 'checking') {
    return <LaunchScreen />;
  }

  if (status === 'error') {
    return <AccessErrorScreen />;
  }

  if (status === 'signedOut') {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          sceneStyle: styles.scene,
        }}
      >
        <Tab.Screen name="Anniversaries" component={AnniversariesScreen} />
        <Tab.Screen name="Photos" component={PhotosScreen} />
        <Tab.Screen name="Nest" component={HomeScreen} />
        <Tab.Screen name="Food" component={FoodScreen} />
        <Tab.Screen name="Plans" component={PlansScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.canvas,
  },
});
