import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Sparkles, DownloadCloud, X, ArrowRight, ShieldCheck } from 'lucide-react-native';

const UpdatePromptModal = ({ visible, updateInfo, onDismiss }) => {
  if (!updateInfo) return null;

  const handleUpdatePress = async () => {
    try {
      const url =
        updateInfo.storeUrl ||
        (Platform.OS === 'android'
          ? 'market://details?id=com.unexa.application'
          : 'https://play.google.com/store/apps/details?id=com.unexa.application');

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(
          'https://play.google.com/store/apps/details?id=com.unexa.application'
        );
      }
    } catch (err) {
      console.warn('Could not open store URL:', err);
      Linking.openURL(
        'https://play.google.com/store/apps/details?id=com.unexa.application'
      );
    }
  };

  const isForced = !!updateInfo.forceUpdate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForced && onDismiss) {
          onDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <DownloadCloud color="#7B61FF" size={36} />
          </View>

          {/* Version Transition Badge */}
          <View style={styles.versionBadge}>
            <Text style={styles.versionTextOld}>v{updateInfo.currentVersion}</Text>
            <ArrowRight color="#7B61FF" size={14} style={{ marginHorizontal: 6 }} />
            <Text style={styles.versionTextNew}>v{updateInfo.latestVersion}</Text>
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{updateInfo.title || 'Update Available!'}</Text>
          <Text style={styles.message}>
            {updateInfo.message ||
              'A new version of UNEXA is ready with important improvements and bug fixes.'}
          </Text>

          {/* Release Notes */}
          {Array.isArray(updateInfo.releaseNotes) &&
            updateInfo.releaseNotes.length > 0 && (
              <View style={styles.notesContainer}>
                <View style={styles.notesHeader}>
                  <Sparkles color="#A78BFA" size={14} />
                  <Text style={styles.notesTitle}>What's New:</Text>
                </View>
                <ScrollView
                  style={{ maxHeight: 110 }}
                  showsVerticalScrollIndicator={false}
                >
                  {updateInfo.releaseNotes.map((note, idx) => (
                    <View key={idx} style={styles.noteItem}>
                      <ShieldCheck color="#10B981" size={14} style={{ marginRight: 6, marginTop: 2 }} />
                      <Text style={styles.noteText}>{note}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdatePress}
            activeOpacity={0.85}
          >
            <Text style={styles.updateButtonText}>Update Now</Text>
          </TouchableOpacity>

          {!isForced && (
            <TouchableOpacity
              style={styles.laterButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#16161E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.4)',
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  versionTextOld: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  versionTextNew: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: '#A0A0AB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  notesTitle: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  noteText: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  updateButton: {
    width: '100%',
    backgroundColor: '#7B61FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UpdatePromptModal;
