import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function ScreenHeader({ title, onBack, right }) {
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backHit} hitSlop={12}>
          <ChevronLeft color={THEME.text} size={26} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backSpacer} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right || null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },
  backHit: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  backSpacer: { width: 42, height: 42 },
  title: {
    flex: 1,
    marginLeft: 12,
    color: THEME.text,
    fontSize: 18,
    fontWeight: '700',
  },
  right: { width: 42, alignItems: 'flex-end' },
});
