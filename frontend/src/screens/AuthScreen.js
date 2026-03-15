import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

// Use your local Wi-Fi IP address instead of localhost so your actual phone can reach it.
// E.g., http://192.168.29.104:5000
export const API_URL = "http://192.168.29.104:5000"; //wifi4g
// export const API_URL = "http://10.168.102.180:5000"; //mobile

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
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
      return Alert.alert("Error", "Please fill all fields");
    }

    setIsLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth";
      const payload = isLogin ? { email, password } : { username, email, password };

      const { data } = await axios.post(`${API_URL}${endpoint}`, payload);

      Alert.alert("Success", "Authenticated Successfully");
      await login(data); // Move to main app automatically
    } catch (error) {
      Alert.alert("Auth Failed", error.response?.data?.error || error.message);
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UNEXA</Text>
      <Text style={styles.subtitle}>{isLogin ? "Welcome Back" : "Create Account"}</Text>

      <View style={styles.formContainer}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={THEME.colors.textDim}
            value={username}
            onChangeText={setUsername}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={THEME.colors.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={THEME.colors.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
          <LinearGradient colors={[THEME.colors.primary, THEME.colors.secondary]} style={styles.button}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isLogin ? "Login" : "Sign Up"}</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 5,
  },
  subtitle: {
    color: THEME.colors.textDim,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  formContainer: {
    backgroundColor: THEME.colors.glass,
    padding: 20,
    borderRadius: 20,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    color: THEME.colors.secondary,
    textAlign: 'center',
    fontSize: 14,
  }
});
