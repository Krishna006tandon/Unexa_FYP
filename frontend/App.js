import React, { useContext, lazy, Suspense } from 'react';
import { StyleSheet, Text, View, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/services/NavigationService';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { CallProvider } from './src/context/CallContext';
import AuthScreen from './src/screens/AuthScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import StoriesListScreen from './src/screens/StoriesListScreen';
import { Home, MessageCircle, SquarePlus, Video, User } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NotificationService from './src/services/NotificationService';


// Lazy load heavy screens to speed up app cold start
const ChatScreen = React.lazy(() => import('./src/screens/ChatScreen'));
const NewChatScreen = React.lazy(() => import('./src/screens/NewChatScreen'));
const CallScreen = React.lazy(() => import('./src/screens/CallScreen'));
const StoryScreen = React.lazy(() => import('./src/screens/StoryScreen'));
const MediaShareScreen = React.lazy(() => import('./src/screens/MediaShareScreen'));
const ProfileScreen = React.lazy(() => import('./src/screens/ProfileScreen'));
const StreaksScreen = React.lazy(() => import('./src/screens/StreaksScreen'));

const LazyFallback = () => (
  <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator color="#7B61FF" size="large" />
  </View>
);

const withSuspense = (Component) => (props) => (
  <Suspense fallback={<LazyFallback />}>
    <Component {...props} />
  </Suspense>
);

const LazyChatScreen = withSuspense(ChatScreen);
const LazyNewChatScreen = withSuspense(NewChatScreen);
const LazyCallScreen = withSuspense(CallScreen);
const LazyStoryScreen = withSuspense(StoryScreen);
const LazyMediaShareScreen = withSuspense(MediaShareScreen);
const LazyProfileScreen = withSuspense(ProfileScreen);


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Crash Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#AA0000', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>App Crash Caught!</Text>
          <Text style={{ color: 'white', marginTop: 20 }}>{this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
const CreateScreen = ({ navigation }) => (
  <Suspense fallback={<LazyFallback />}>
    <MediaShareScreen navigation={navigation} />
  </Suspense>
);
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
    <Stack.Screen name="ChatScreen" component={LazyChatScreen} />
    <Stack.Screen name="NewChat" component={LazyNewChatScreen} />
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
    <Tab.Screen name="Profile" component={LazyProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <View style={styles.container}><Text style={styles.title}>Loading...</Text></View>;

  React.useEffect(() => {
    // ⚡ Initialize Notification Services
    NotificationService.requestPermissions();
    const cleanup = NotificationService.setupNotificationClickListeners();
    return cleanup;
  }, []);

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
            <Stack.Screen name="CallScreen" component={LazyCallScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="StoryScreen" component={LazyStoryScreen} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="ProfileScreen" component={LazyProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <CallProvider>
              <AppNavigator />
            </CallProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, paddingTop: 50 },
  title: { color: THEME.colors.text, fontSize: 24, alignSelf: 'center', marginTop: 100 },
  tabBar: { backgroundColor: 'rgba(10, 10, 10, 0.9)', borderTopWidth: 0, elevation: 0, height: 90 },
});
