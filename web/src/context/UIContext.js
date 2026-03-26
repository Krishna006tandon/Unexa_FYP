import React, { createContext, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertCircle, X, Info, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const UIContext = createContext();

let staticShowAlert = null;
export const showAlertGlobal = (title, message, type, onConfirm) => {
  if (staticShowAlert) staticShowAlert(title, message, type, onConfirm);
  else console.warn("showAlertGlobal called before UIProvider initialized");
};



export const UIProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState(null);
  const [visible, setVisible] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];
  const translateY = useState(new Animated.Value(-100))[0];

  const showAlert = useCallback((title, message, type = 'info', onConfirm = null) => {
    setAlertConfig({ title, message, type, onConfirm });
    setVisible(true);
    
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    // Auto-hide if no confirm button needed
    if (!onConfirm && type !== 'confirm') {
      setTimeout(() => hideAlert(), 4000);
    }
  }, []);

  staticShowAlert = showAlert;

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: Platform.OS !== 'web' })
    ]).start(() => {
      setVisible(false);
      setAlertConfig(null);
    });
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 color="#4CAF50" size={28} />;
      case 'error': return <AlertCircle color="#FF4B4B" size={28} />;
      case 'warning': return <AlertCircle color="#FF9800" size={28} />;
      case 'info': return <Info color="#3DDCFF" size={28} />;
      default: return <Bell color="#7B61FF" size={28} />;
    }
  };

  const getGradient = (type) => {
    switch (type) {
      case 'success': return ['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.02)'];
      case 'error': return ['rgba(255, 75, 75, 0.1)', 'rgba(255, 75, 75, 0.02)'];
      case 'warning': return ['rgba(255, 152, 0, 0.1)', 'rgba(255, 152, 0, 0.02)'];
      default: return ['rgba(123, 97, 255, 0.1)', 'rgba(123, 97, 255, 0.02)'];
    }
  };

  return (
    <UIContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {visible && alertConfig && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View 
            style={[
              styles.container, 
              { opacity, transform: [{ translateY }] }
            ]}
          >
            <BlurView intensity={80} tint="dark" style={styles.blur}>
              <LinearGradient
                colors={getGradient(alertConfig.type)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <View style={[styles.indicator, { backgroundColor: alertConfig.type === 'error' ? '#FF4B4B' : '#7B61FF' }]} />
                <View style={styles.content}>
                  <View style={styles.iconArea}>
                    {getIcon(alertConfig.type)}
                  </View>
                  <View style={styles.textArea}>
                    <Text style={styles.title}>{alertConfig.title}</Text>
                    <Text style={styles.message}>{alertConfig.message}</Text>
                  </View>
                  <TouchableOpacity onPress={hideAlert} style={styles.closeIcon}>
                    <X color="rgba(255,255,255,0.4)" size={20} />
                  </TouchableOpacity>
                </View>
                
                {alertConfig.onConfirm && (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={hideAlert} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { alertConfig.onConfirm(); hideAlert(); }} 
                      style={styles.confirmBtn}
                    >
                      <LinearGradient colors={['#7B61FF', '#3DDCFF']} style={styles.confirmGradient}>
                        <Text style={styles.confirmText}>Confirm</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </View>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  blur: {
    padding: 0,
  },
  gradient: {
    padding: 16,
    flexDirection: 'column',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 4,
    borderRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconArea: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textArea: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 18,
  },
  closeIcon: {
    marginLeft: 10,
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  confirmBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#000',
    fontWeight: 'bold',
  }
});
