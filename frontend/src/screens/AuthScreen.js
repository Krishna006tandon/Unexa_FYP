import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

import ENVIRONMENT from '../config/environment';

const THEME = {
  colors: {
    background: '#04040A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.03)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    inputBg: 'rgba(0, 0, 0, 0.3)',
  }
};

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);

  const handleSubmit = async () => {
    if ((!isLogin && !username) || !email || !password) {
      return Alert.alert("Hold on", "Please fill out all the fields");
    }

    setIsLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth";
      const payload = isLogin ? { email: email.trim(), password } : { username: username.trim(), email: email.trim(), password };

      const { data } = await axios.post(`${ENVIRONMENT.API_URL}${endpoint}`, payload);

      await login(data); // Move to main app automatically
      
      // Auto-create profile after successful login
      try {
        const profileData = {
          username: data.username,
          fullName: data.username,
          email: data.email,
          bio: 'Welcome to UNEXA! 🎉',
        };
        
        await axios.post(`${ENVIRONMENT.API_URL}/api/profile`, profileData, {
          headers: { Authorization: `Bearer ${data.token}` }
        });
      } catch (profileError) {
        console.log('❌ Auto-profile error:', profileError.message);
      }
    } catch (error) {
      Alert.alert("Auth Failed", error.response?.data?.error || error.message);
    }
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={['#1A0B2E', '#04040A']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
            <View style={styles.logoGlow}>
              <Image 
                  source={require('../../assets/Unexalogo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>UNEXA</Text>
            <Text style={styles.subtitle}>{isLogin ? "Welcome back to universe." : "Join the universe."}</Text>
        </View>

        <View style={styles.formContainer}>
            {!isLogin && (
              <View style={styles.inputWrapper}>
                <User color={THEME.colors.textDim} size={20} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={THEME.colors.textDim}
                    value={username}
                    onChangeText={setUsername}
                    selectionColor={THEME.colors.primary}
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Mail color={THEME.colors.textDim} size={20} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={THEME.colors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  selectionColor={THEME.colors.primary}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock color={THEME.colors.textDim} size={20} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={THEME.colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  selectionColor={THEME.colors.primary}
              />
            </View>

            <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8} style={styles.buttonWrapper}>
              <LinearGradient 
                  colors={[THEME.colors.primary, THEME.colors.secondary]} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={styles.button}
              >
                  {isLoading ? 
                    <ActivityIndicator color="#FFF" /> : 
                    <Text style={styles.buttonText}>{isLogin ? "Login Now" : "Create Account"}</Text>
                  }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchContainer}>
              <Text style={styles.switchText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={styles.switchHighlight}>
                      {isLogin ? "Sign Up" : "Login"}
                  </Text>
              </Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 45,
  },
  logoGlow: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.2)',
  },
  logo: {
    width: 75,
    height: 75,
  },
  title: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: THEME.colors.textDim,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  formContainer: {
    backgroundColor: THEME.colors.glass,
    padding: 30,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.inputBg,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    height: 60,
  },
  inputIcon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonWrapper: {
    marginTop: 15,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 15,
    elevation: 8,
  },
  button: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  switchContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  switchText: {
    color: THEME.colors.textDim,
    fontSize: 14,
    fontWeight: '500',
  },
  switchHighlight: {
    fontWeight: '800', 
    color: THEME.colors.secondary,
  }
});

export default AuthScreen;
