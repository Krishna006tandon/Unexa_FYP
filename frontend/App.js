import React from 'react';
import { StyleSheet, Text, View, StatusBar, SafeAreaView, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatDetailScreen from './src/screens/ChatScreen';
import { Home, MessageCircle, PlusSquare, Video, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Theme configuration matching UNEXA requirements
const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',   // Electric Purple
    secondary: '#3DDCFF', // Neon Blue
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  }
};

const Tab = createBottomTabNavigator();

// Dummy Placeholder Screens for standardizing UI

const FeedScreen = () => (
  <View style={styles.container}>
    <LinearGradient
      colors={[THEME.colors.primary, 'transparent']}
      style={styles.glow}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    <Text style={styles.headerTitle}>UNEXA</Text>
    {/* Story Bubbles */}
    <View style={styles.storiesContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.storyBubble}>
          <LinearGradient
             colors={[THEME.colors.primary, THEME.colors.secondary]}
             style={styles.storyGradient}
          >
            <View style={styles.storyInner} />
          </LinearGradient>
        </View>
      ))}
    </View>
    {/* Post Card */}
    <BlurView intensity={20} tint="dark" style={styles.glassCard}>
      <View style={styles.cardHeader}>
         <View style={styles.avatarMini} />
         <Text style={styles.username}>@cryptoninja</Text>
      </View>
      <View style={styles.postMedia} />
      <View style={styles.cardActions}>
         <Text style={styles.actionText}>Like • Comment • Share</Text>
      </View>
    </BlurView>
  </View>
);

const Stack = createNativeStackNavigator();

const ChatStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: THEME.colors.background } }}>
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatScreen" component={ChatDetailScreen} />
  </Stack.Navigator>
);
const CreateScreen = () => <View style={styles.container}><Text style={styles.title}>Create</Text></View>;
const VideoScreen = () => <View style={styles.container}><Text style={styles.title}>Stream</Text></View>;
const ProfileScreen = () => <View style={styles.container}><Text style={styles.title}>Profile</Text></View>;

export default function App() {
  return (
    <NavigationContainer theme={{ colors: { background: THEME.colors.background }}}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
          tabBarIcon: ({ focused, color, size }) => {
            let IconComponent;

            if (route.name === 'Home') IconComponent = Home;
            else if (route.name === 'Chats') IconComponent = MessageCircle;
            else if (route.name === 'Create') IconComponent = PlusSquare;
            else if (route.name === 'Videos') IconComponent = Video;
            else if (route.name === 'Profile') IconComponent = User;

            return (
               <IconComponent 
                 color={focused ? THEME.colors.secondary : THEME.colors.textDim} 
                 size={28} 
               />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={FeedScreen} />
        <Tab.Screen name="Chats" component={ChatStack} />
        <Tab.Screen name="Create" component={CreateScreen} />
        <Tab.Screen name="Videos" component={VideoScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingTop: 50,
  },
  glow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 20,
    fontFamily: 'sans-serif', // 'Inter' ideally once loaded
    letterSpacing: 2,
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
  },
  storiesContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  storyBubble: {
    marginRight: 15,
  },
  storyGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 3,
  },
  storyInner: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: THEME.colors.background,
  },
  glassCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: THEME.colors.glass,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    marginRight: 10,
  },
  username: {
    color: THEME.colors.text,
    fontWeight: '600',
  },
  postMedia: {
    width: '100%',
    height: 300,
    backgroundColor: '#1E1E1E',
  },
  cardActions: {
    padding: 15,
  },
  actionText: {
    color: THEME.colors.textDim,
  }
});
