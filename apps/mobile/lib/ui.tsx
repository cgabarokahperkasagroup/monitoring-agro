// =====================================================================
// Komponen UI dasar — NativeWind (Tailwind RN). Gaya: putih, bersih,
// dominan hijau sawit, target sentuh besar (min 52px), kontras tinggi.
// API komponen tetap sama spt sebelumnya agar layar minim perubahan.
// =====================================================================
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from './theme';

// ----------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BTN_BASE =
  'min-h-[52px] flex-row items-center justify-center rounded-xl px-5 border active:opacity-80';
const BTN_VARIANT: Record<ButtonVariant, { box: string; label: string; spinner: string }> = {
  primary: { box: 'bg-primary border-primary', label: 'text-white', spinner: '#FFFFFF' },
  secondary: { box: 'bg-white border-border', label: 'text-ink', spinner: colors.text },
  ghost: { box: 'bg-transparent border-transparent', label: 'text-primary', spinner: colors.primary },
  danger: { box: 'bg-white border-danger-soft', label: 'text-danger', spinner: colors.danger },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  className = '',
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const isDisabled = disabled || loading;
  const v = BTN_VARIANT[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${BTN_BASE} ${v.box} ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <Text className={`text-base font-bold ${v.label}`}>{title}</Text>
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
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-ink">
        {label}
        {required ? <Text className="text-danger"> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text className="mt-1 text-xs text-muted">{hint}</Text> : null}
    </View>
  );
}

// ----------------------------------------------------------------------
const INPUT_CLASS =
  'min-h-[52px] rounded-xl border border-border bg-white px-4 text-base text-ink';

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
      className={`${INPUT_CLASS} ${multiline ? 'h-24 py-3' : ''}`}
      textAlignVertical={multiline ? 'top' : 'center'}
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
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`${INPUT_CLASS} flex-row items-center justify-between active:opacity-80`}
      >
        <Text className={`text-base ${selected ? 'text-ink' : 'text-faint'}`}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text className="text-base text-faint">▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/35" onPress={() => setOpen(false)} />
        <View className="rounded-t-2xl bg-white pt-2">
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
          <Text className="px-5 py-2 text-lg font-bold text-ink">{title}</Text>
          {options.length === 0 ? (
            <Text className="p-5 text-sm text-muted">
              Belum ada data. Tunggu sinkron selesai atau hubungi admin.
            </Text>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center border-t border-card px-5 py-3 active:bg-card"
                >
                  <View className="flex-1">
                    <Text className="text-base text-ink">{item.label}</Text>
                    {item.sub ? <Text className="mt-1 text-xs text-muted">{item.sub}</Text> : null}
                  </View>
                  {item.value === value ? <Text className="text-lg text-primary">✓</Text> : null}
                </Pressable>
              )}
            />
          )}
          <Button title="Tutup" variant="secondary" onPress={() => setOpen(false)} className="m-5" />
        </View>
      </Modal>
    </>
  );
}

// ----------------------------------------------------------------------
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-card-border bg-white p-5 ${className}`}>{children}</View>
  );
}

type BadgeTone = 'neutral' | 'ok' | 'warn' | 'info';
const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-card',
  ok: 'bg-primary-soft',
  warn: 'bg-warn-soft',
  info: 'bg-accent-soft',
};
const BADGE_TEXT: Record<BadgeTone, string> = {
  neutral: 'text-muted',
  ok: 'text-primary-dark',
  warn: 'text-warn',
  info: 'text-accent',
};

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: BadgeTone }) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${BADGE_TONE[tone]}`}>
      <Text className={`text-xs font-semibold ${BADGE_TEXT[tone]}`}>{text}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="items-center justify-center p-8">
      <Text className="text-center text-lg font-semibold text-ink">{title}</Text>
      {subtitle ? <Text className="mt-2 text-center text-sm text-muted">{subtitle}</Text> : null}
    </View>
  );
}
