import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

// Production cloud backend URL
export const API_URL = "https://unexa-fyp.onrender.com"; // Production backend

const THEME = {
  colors: {
    background: '#000000',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
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

      await login(data); // Move to main app automatically
      
      // Auto-create profile after successful login
      try {
        const profileData = {
          username: data.username,
          fullName: data.username,
          email: data.email,
          bio: 'Welcome to UNEXA! 🎉',
        };
        
        await axios.post(`${API_URL}/api/profile`, profileData, {
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
            <Image 
                source={require('../../assets/icon.jpg')} 
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>UNEXA</Text>
            <Text style={styles.subtitle}>{isLogin ? "Welcome Back" : "Create Account"}</Text>
        </View>

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

            <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8}>
            <LinearGradient colors={[THEME.colors.primary, THEME.colors.secondary]} style={styles.button}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isLogin ? "Login" : "Sign Up"}</Text>}
            </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 25 }}>
            <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Text style={{fontWeight: 'bold', color: THEME.colors.secondary}}>
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
    paddingHorizontal: 25,
    paddingVertical: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  title: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    color: THEME.colors.textDim,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: THEME.colors.glass,
    padding: 25,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFF',
    padding: 16,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontSize: 16,
  },
  button: {
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchText: {
    color: THEME.colors.textDim,
    textAlign: 'center',
    fontSize: 14,
  }
});

export default AuthScreen;
