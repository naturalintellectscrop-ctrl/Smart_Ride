// ============================================
// SMART RIDE MOBILE - ICON INPUT COMPONENT
// ============================================
// Glass input with icon matching admin dashboard
// Pattern: glass-input with icon prefix + glow on focus
// ============================================

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface IconInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  editable?: boolean;
  style?: ViewStyle;
  multiline?: boolean;
  error?: string;
}

export function IconInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  style,
  multiline = false,
  error,
}: IconInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, focused && styles.inputFocused, error && styles.inputError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? COLORS.primary : COLORS.textDim}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDim}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={COLORS.textDim} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: 'rgba(37, 37, 48, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputFocused: {
    borderColor: 'rgba(0, 255, 136, 0.5)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  leftIcon: {
    paddingLeft: 14,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingRight: 14,
    paddingLeft: iconPaddingLeft(),
    fontSize: 15,
    color: COLORS.text,
    height: 48,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  rightIcon: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
});

function iconPaddingLeft(): number {
  return 0; // When icon is present, it handles the left padding
}
