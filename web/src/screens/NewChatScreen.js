import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from 'react-native';
import { useUI } from '../context/UIContext';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

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
  const { showAlert } = useUI();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");

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
        const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/auth?search=${search}`, config);
        setResults(data);
      } catch (e) { console.log(e); }
      setLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const accessChat = async (userId) => {
    try {
       const config = { headers: { Authorization: `Bearer ${user.token}` } };
       
       if (isGroupMode) {
         // Toggle selection
         if (selectedUsers.includes(userId)) {
           setSelectedUsers(selectedUsers.filter(id => id !== userId));
         } else {
           setSelectedUsers([...selectedUsers, userId]);
         }
         return;
       }

       // Create or fetch 1v1 chat with this user
       const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/chat`, { userId }, config);
       let name = data.isGroupChat ? data.chatName : data.users.find(u => u._id !== user._id)?.username;
       navigation.replace('ChatScreen', { chatId: data._id, name: name });
    } catch(err) { console.log(err); }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) {
      showAlert("Error", "Please enter group name and select users.", 'warning');
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/chat/group`, { 
        users: JSON.stringify(selectedUsers),
        name: groupName 
      }, config);
      navigation.replace('ChatScreen', { chatId: data._id, name: groupName });
    } catch(err) { 
      console.log(err);
      showAlert("Error", "Failed to create group.", 'error');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
       <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()}>
           <Text style={styles.backButton}>{"< "}</Text>
         </TouchableOpacity>
         <Text style={styles.title}>{isGroupMode ? "Create Group" : "New Chat"}</Text>
         <TouchableOpacity 
           style={styles.groupToggleBtn} 
           onPress={() => {
             setIsGroupMode(!isGroupMode);
             if (!isGroupMode) setSelectedUsers([]);
           }}
         >
           <Text style={styles.groupToggleText}>{isGroupMode ? "Cancel" : "New Group"}</Text>
         </TouchableOpacity>
       </View>

       {isGroupMode && (
         <View style={styles.groupInputContainer}>
           <TextInput 
             placeholder="Group Name" 
             placeholderTextColor={THEME.colors.textDim}
             style={styles.groupInput}
             value={groupName}
             onChangeText={setGroupName}
           />
           <TouchableOpacity 
             style={[styles.createBtn, selectedUsers.length === 0 && { opacity: 0.5 }]} 
             onPress={createGroup}
             disabled={selectedUsers.length === 0}
           >
             <Text style={styles.createBtnText}>Create ({selectedUsers.length})</Text>
           </TouchableOpacity>
         </View>
       )}

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
             <TouchableOpacity 
               style={[styles.userCard, selectedUsers.includes(item._id) && styles.selectedCard]} 
               onPress={() => accessChat(item._id)}
             >
                  <Image source={{uri: item.profilePhoto}} style={styles.avatar} />
                  <View style={styles.userInfo}>
                     <Text style={styles.name}>{item.username}</Text>
                  </View>
                  {isGroupMode && (
                    <View style={[styles.checkbox, selectedUsers.includes(item._id) && styles.checkboxActive]}>
                      {selectedUsers.includes(item._id) && <Text style={{color: '#FFF', fontSize: 10}}>✓</Text>}
                    </View>
                  )}
             </TouchableOpacity>
         )}
       />
    </View>
  )
};

export default NewChatScreen;

const styles = StyleSheet.create({
   container: { 
     flex: 1, 
     backgroundColor: THEME.colors.background, 
     paddingTop: 65 
   },
   header: { 
     flexDirection: 'row', 
     alignItems: 'center', 
     paddingHorizontal: 25, 
     paddingBottom: 20 
   },
   backButton: { 
     color: THEME.colors.primary, 
     fontSize: 28, 
     fontWeight: 'bold', 
     marginRight: 15 
   },
   title: { 
     color: '#FFF', 
     fontSize: 24, 
     fontWeight: 'bold',
     letterSpacing: 0.5 
   },
   input: { 
     backgroundColor: 'rgba(255,255,255,0.05)', 
     color: '#FFF', 
     padding: 18, 
     marginHorizontal: 25, 
     borderRadius: 15, 
     borderWidth: 1, 
     borderColor: 'rgba(255,255,255,0.08)',
     fontSize: 16,
     marginBottom: 15
   },
   userCard: { 
     flexDirection: 'row', 
     alignItems: 'center', 
     paddingVertical: 18, 
     paddingHorizontal: 25, 
     borderBottomWidth: 1, 
     borderColor: 'rgba(255,255,255,0.05)' 
   },
   avatar: { 
     width: 54, 
     height: 54, 
     borderRadius: 27, 
     marginRight: 15,
     backgroundColor: '#1E1E1E' 
   },
   userInfo: {
     flex: 1,
     justifyContent: 'center'
   },
   name: { 
     color: '#FFF', 
     fontSize: 17, 
     fontWeight: '700',
     marginBottom: 2 
   },
   email: { 
     color: THEME.colors.textDim, 
     fontSize: 14 
   },
   groupToggleBtn: {
     marginLeft: 'auto',
     backgroundColor: THEME.colors.glass,
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 10,
   },
   groupToggleText: {
     color: THEME.colors.primary,
     fontWeight: '600',
   },
   groupInputContainer: {
     paddingHorizontal: 25,
     paddingBottom: 15,
     flexDirection: 'row',
     gap: 10,
   },
   groupInput: {
     flex: 1,
     backgroundColor: 'rgba(255,255,255,0.05)',
     color: '#FFF',
     padding: 12,
     borderRadius: 12,
     borderWidth: 1,
     borderColor: THEME.colors.glassBorder,
   },
   createBtn: {
     backgroundColor: THEME.colors.primary,
     paddingHorizontal: 15,
     justifyContent: 'center',
     borderRadius: 12,
   },
   createBtnText: {
     color: '#FFF',
     fontWeight: 'bold',
   },
   selectedCard: {
     backgroundColor: 'rgba(123, 97, 255, 0.1)',
   },
   checkbox: {
     width: 20,
     height: 20,
     borderRadius: 10,
     borderWidth: 2,
     borderColor: THEME.colors.glassBorder,
     justifyContent: 'center',
     alignItems: 'center',
   },
   checkboxActive: {
     backgroundColor: THEME.colors.primary,
     borderColor: THEME.colors.primary,
   },
});
