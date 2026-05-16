import { View, type ViewProps } from 'react-native';
import { useTheme } from 'tamagui';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const backgroundColor = lightColor ?? darkColor ?? theme.background?.get();

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
