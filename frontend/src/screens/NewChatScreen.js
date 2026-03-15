import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from './AuthScreen';

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

const NewChatScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced Search implementation
  useEffect(() => {
    if (!search.trim()) {
        setResults([]);
        return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`${API_URL}/api/auth?search=${search}`, config);
        setResults(data);
      } catch (e) { console.log(e); }
      setLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const accessChat = async (userId) => {
    try {
       const config = { headers: { Authorization: `Bearer ${user.token}` } };
       // Create or fetch 1v1 chat with this user
       const { data } = await axios.post(`${API_URL}/api/chat`, { userId }, config);
       
       let name = data.isGroupChat ? data.chatName : data.users.find(u => u._id !== user._id)?.username;
       
       navigation.replace('ChatScreen', { chatId: data._id, name: name });
    } catch(err) { console.log(err); }
  };

  return (
    <View style={styles.container}>
       <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()}>
           <Text style={styles.backButton}>{"< "}</Text>
         </TouchableOpacity>
         <Text style={styles.title}>New Chat</Text>
       </View>

       <TextInput 
         placeholder="Search username or email..." 
         placeholderTextColor={THEME.colors.textDim}
         style={styles.input}
         value={search}
         onChangeText={setSearch}
       />

       {loading && <ActivityIndicator color={THEME.colors.primary} style={{marginTop: 20}} />}

       <FlatList 
         data={results}
         keyExtractor={item => item._id}
         renderItem={({item}) => (
            <TouchableOpacity style={styles.userCard} onPress={() => accessChat(item._id)}>
                 <Image source={{uri: item.profilePhoto}} style={styles.avatar} />
                 <View>
                    <Text style={styles.name}>{item.username}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                 </View>
            </TouchableOpacity>
         )}
       />
    </View>
  )
};

export default NewChatScreen;

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: THEME.colors.background, paddingTop: 50 },
   header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
   backButton: { color: THEME.colors.primary, fontSize: 24, marginRight: 15 },
   title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
   input: { backgroundColor: THEME.colors.glass, color: '#FFF', padding: 15, marginHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.glassBorder },
   userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: THEME.colors.glassBorder },
   avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
   name: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
   email: { color: THEME.colors.textDim, fontSize: 14 }
});
