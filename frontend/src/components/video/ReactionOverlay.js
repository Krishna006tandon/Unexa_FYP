import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';

export default function ReactionOverlay({ reactions }) {
  const animsRef = useRef([]);

  useEffect(() => {
    // keep only last 20 reactions
    animsRef.current = reactions.slice(-20).map((r) => r._anim || r);
  }, [reactions]);

  return null;
}

export function FloatingReaction({ emoji }) {
  const { width, height } = Dimensions.get('window');
  const y = useRef(new Animated.Value(height - 140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(width * (0.25 + Math.random() * 0.5))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(y, { toValue: height - 360, duration: 1400, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <Animated.Text style={[styles.emoji, { transform: [{ translateX: x }, { translateY: y }], opacity }]}>
      {emoji}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  emoji: {
    position: 'absolute',
    fontSize: 28,
  },
});

