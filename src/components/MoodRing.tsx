import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, font } from "../theme";
import { moodColorForScore } from "../utils/moodColor";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZES = {
  sm: { outer: 44, stroke: 3.5, fontSize: 12 },
  md: { outer: 72, stroke: 5, fontSize: 18 },
  lg: { outer: 112, stroke: 7, fontSize: 28 },
} as const;

type MoodRingProps = {
  score: number | null;
  size?: keyof typeof SIZES;
  showValue?: boolean;
  /** Animate ring fill on mount / score change (default true). */
  animate?: boolean;
};

export function MoodRing({
  score,
  size = "md",
  showValue = true,
  animate = true,
}: MoodRingProps) {
  const spec = SIZES[size];
  const { outer, stroke, fontSize } = spec;
  const radius = (outer - stroke) / 2;
  const center = outer / 2;
  const circumference = 2 * Math.PI * radius;
  const targetProgress = score != null ? Math.max(0, Math.min(1, score / 10)) : 0;
  const ringColor = score != null ? moodColorForScore(score) : colors.border;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const valueAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let shouldAnimate = animate;
      if (animate) {
        try {
          shouldAnimate = !(await AccessibilityInfo.isReduceMotionEnabled());
        } catch {
          shouldAnimate = animate;
        }
      }

      if (cancelled) return;

      if (!shouldAnimate || score == null) {
        progressAnim.setValue(targetProgress);
        valueAnim.setValue(score ?? 0);
        return;
      }

      progressAnim.setValue(0);
      valueAnim.setValue(0);

      Animated.parallel([
        Animated.timing(progressAnim, {
          toValue: targetProgress,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(valueAnim, {
          toValue: score,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [score, targetProgress, animate, progressAnim, valueAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  const displayScore =
    score != null
      ? score % 1 === 0
        ? String(Math.round(score))
        : score.toFixed(1)
      : "—";

  return (
    <View style={[styles.wrap, { width: outer, height: outer }]}>
      <Svg width={outer} height={outer}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.borderSubtle}
          strokeWidth={stroke}
          fill="none"
        />
        {score != null && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </Svg>
      {showValue && (
        <View style={styles.labelWrap} pointerEvents="none">
          <AnimatedScoreLabel
            anim={valueAnim}
            fallback={displayScore}
            fontSize={fontSize}
            color={score != null ? ringColor : colors.text}
            hasScore={score != null}
          />
        </View>
      )}
    </View>
  );
}

function AnimatedScoreLabel({
  anim,
  fallback,
  fontSize,
  color,
  hasScore,
}: {
  anim: Animated.Value;
  fallback: string;
  fontSize: number;
  color: string;
  hasScore: boolean;
}) {
  const [label, setLabel] = React.useState(hasScore ? "0" : fallback);

  useEffect(() => {
    if (!hasScore) {
      setLabel(fallback);
      return;
    }
    const id = anim.addListener(({ value }) => {
      setLabel(value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1));
    });
    return () => anim.removeListener(id);
  }, [anim, fallback, hasScore]);

  return (
    <Text style={[styles.value, { fontSize, color: hasScore ? color : colors.text }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: font,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
