import React, { useContext } from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/services/NavigationService';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { CallProvider } from './src/context/CallContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AuthScreen from './src/screens/AuthScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import CallScreen from './src/screens/CallScreen';
import StoriesListScreen from './src/screens/StoriesListScreen';
import StoryScreen from './src/screens/StoryScreen';
import MediaShareScreen from './src/screens/MediaShareScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StreaksScreen from './src/screens/StreaksScreen';
import { Home, MessageCircle, SquarePlus, Video, User } from 'lucide-react-native';

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
  }
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const FeedScreen = ({ navigation }) => <StoriesListScreen navigation={navigation} />;
const CreateScreen = ({ navigation }) => <MediaShareScreen navigation={navigation} />;
const VideoScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
    <Video color="#7B61FF" size={64} strokeWidth={1.5} />
    <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 20 }}>Live Streams</Text>
    <Text style={{ color: '#A0A0A0', fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }}>
      Live streaming feature is coming soon. Stay tuned!
    </Text>
  </View>
);

const ChatStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: THEME.colors.background } }}>
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
    <Stack.Screen name="NewChat" component={NewChatScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
      tabBarIcon: ({ focused }) => {
        let IconComponent;
        if (route.name === 'Home') IconComponent = Home;
        else if (route.name === 'Chats') IconComponent = MessageCircle;
        else if (route.name === 'Create') IconComponent = SquarePlus;
        else if (route.name === 'Videos') IconComponent = Video;
        else if (route.name === 'Profile') IconComponent = User;
        return <IconComponent color={focused ? THEME.colors.secondary : THEME.colors.textDim} size={28} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={FeedScreen} />
    <Tab.Screen name="Chats" component={ChatStack} />
    <Tab.Screen name="Create" component={CreateScreen} />
    <Tab.Screen name="Videos" component={VideoScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  React.useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) return <View style={styles.container}><Text style={styles.title}>Loading...</Text></View>;

  return (
    <NavigationContainer 
      ref={navigationRef} 
      theme={{ colors: { background: THEME.colors.background }}}
    >
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CallScreen" component={CallScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="StoryScreen" component={StoryScreen} options={{ presentation: 'fullScreenModal' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Prevent Splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return null; // Keep splash screen visible until fonts are loaded
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <CallProvider>
            <AppNavigator />
          </CallProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, paddingTop: 50 },
  title: { color: THEME.colors.text, fontSize: 24, alignSelf: 'center', marginTop: 100 },
  tabBar: { backgroundColor: 'rgba(10, 10, 10, 0.9)', borderTopWidth: 0, elevation: 0, height: 90 },
});
