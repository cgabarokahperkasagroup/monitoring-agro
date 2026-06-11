// =====================================================================
// Komponen UI dasar — tanpa dependensi eksternal (RN core saja).
// Gaya: putih, bersih, target sentuh besar, kontras tinggi.
// =====================================================================
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, space, TOUCH } from './theme';

// ----------------------------------------------------------------------
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    secondary: { bg: colors.white, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.white, fg: colors.danger, border: colors.dangerSoft },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.btnText, { color: palette.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ----------------------------------------------------------------------
export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ----------------------------------------------------------------------
export function TextField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      style={[styles.input, multiline && { height: 96, textAlignVertical: 'top' }]}
    />
  );
}

// ----------------------------------------------------------------------
export type PickerOption = { value: string; label: string; sub?: string };

export function PickerField({
  value,
  options,
  onSelect,
  placeholder = 'Pilih…',
  title = 'Pilih',
}: {
  value?: string | null;
  options: PickerOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.input, styles.pickerBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={{ color: selected ? colors.text : colors.textFaint, fontSize: font.md }}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: font.md }}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {options.length === 0 ? (
            <Text style={[styles.hint, { padding: space.lg }]}>
              Belum ada data. Tunggu sinkron selesai atau hubungi admin.
            </Text>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: colors.card }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: font.md, color: colors.text }}>{item.label}</Text>
                    {item.sub ? <Text style={styles.hint}>{item.sub}</Text> : null}
                  </View>
                  {item.value === value ? (
                    <Text style={{ color: colors.primary, fontSize: font.lg }}>✓</Text>
                  ) : null}
                </Pressable>
              )}
              style={{ maxHeight: 380 }}
            />
          )}
          <Button title="Tutup" variant="secondary" onPress={() => setOpen(false)} style={{ margin: space.lg }} />
        </View>
      </Modal>
    </>
  );
}

// ----------------------------------------------------------------------
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'ok' | 'warn' | 'info' }) {
  const map = {
    neutral: { bg: colors.card, fg: colors.textMuted },
    ok: { bg: colors.primarySoft, fg: colors.primaryDark },
    warn: { bg: colors.warnSoft, fg: colors.warn },
    info: { bg: '#E0F2FE', fg: colors.accent },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={{ color: map.fg, fontSize: font.xs, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: font.lg, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.hint, { textAlign: 'center', marginTop: space.sm }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  btn: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  btnText: { fontSize: font.md, fontWeight: '700' },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.text, marginBottom: space.sm },
  hint: { fontSize: font.xs, color: colors.textMuted, marginTop: space.xs },
  input: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: space.lg,
    fontSize: font.md,
    color: colors.text,
  },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: space.sm,
  },
  sheetTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text, paddingHorizontal: space.lg, paddingVertical: space.sm },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.card,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.lg,
  },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
});
