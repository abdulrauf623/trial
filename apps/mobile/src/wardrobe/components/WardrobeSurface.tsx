import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useAppTheme } from '../../theme';

interface WardrobeSurfaceProps {
  width: number;
  height: number;
}

const DOT_COUNT = 36;

export function WardrobeSurface({ width, height }: WardrobeSurfaceProps) {
  const { theme } = useAppTheme();

  const dots = useMemo(() => {
    return Array.from({ length: DOT_COUNT }).map((_, index) => {
      const xSeed = deterministic(index * 31 + 17);
      const ySeed = deterministic(index * 47 + 91);
      const radiusSeed = deterministic(index * 53 + 7);
      return {
        x: xSeed * width,
        y: ySeed * height,
        r: 0.8 + radiusSeed * 1.5,
        opacity: theme.mode === 'dark' ? 0.05 : 0.045,
      };
    });
  }, [height, theme.mode, width]);

  const startColor = theme.mode === 'dark' ? '#0f1117' : '#f5f2ee';
  const endColor = theme.mode === 'dark' ? '#121722' : '#f0ece6';
  const dotRgb = theme.mode === 'dark' ? [255, 255, 255] : [16, 24, 40];

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height} color={startColor} />
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[startColor, endColor]}
        />
      </Rect>
      {dots.map((dot, index) => (
        <Circle
          key={`grain-dot-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          color={`rgba(${dotRgb[0]}, ${dotRgb[1]}, ${dotRgb[2]}, ${dot.opacity})`}
        />
      ))}
    </Canvas>
  );
}

function deterministic(seed: number): number {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}
