import React, { useContext } from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import CallScreen from './src/screens/CallScreen';
import StoriesListScreen from './src/screens/StoriesListScreen';
import StoryScreen from './src/screens/StoryScreen';
import { Home, MessageCircle, PlusSquare, Video, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  }
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const FeedScreen = ({ navigation }) => <StoriesListScreen navigation={navigation} />;
const CreateScreen = () => <View style={styles.container}><Text style={styles.title}>Create</Text></View>;
const VideoScreen = () => <View style={styles.container}><Text style={styles.title}>Stream</Text></View>;
const ProfileScreen = () => {
   const { logout } = useContext(AuthContext);
   return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
         <Text style={styles.title}>Profile</Text>
         <Text onPress={logout} style={{color: THEME.colors.primary, marginTop: 20, fontSize: 18}}>Logout</Text>
      </View>
   );
};

const ChatStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: THEME.colors.background } }}>
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
    <Stack.Screen name="NewChat" component={NewChatScreen} />
    <Stack.Screen name="CallScreen" component={CallScreen} options={{ presentation: 'fullScreenModal' }} />
    <Stack.Screen name="StoryScreen" component={StoryScreen} options={{ presentation: 'fullScreenModal' }} />
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
        else if (route.name === 'Create') IconComponent = PlusSquare;
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

  if (loading) return <View style={styles.container}><Text style={styles.title}>Loading...</Text></View>;

  return (
    <NavigationContainer theme={{ colors: { background: THEME.colors.background }}}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="StoryScreen" component={StoryScreen} options={{ presentation: 'fullScreenModal' }} />
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
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingTop: 50,
  },
  title: {
    color: THEME.colors.text,
    fontSize: 24,
    alignSelf: 'center',
    marginTop: 100,
  },
  tabBar: {
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderTopWidth: 0,
    elevation: 0,
    height: 90,
  }
});
