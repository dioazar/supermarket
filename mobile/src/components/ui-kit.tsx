import { ReactNode } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from 'react-native';
import { colors, shadow } from '../lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: object }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    disabled,
    small,
}: {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
    small?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.button,
                small && styles.buttonSmall,
                variant === 'primary' && { backgroundColor: colors.primary },
                variant === 'secondary' && {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                },
                variant === 'danger' && { backgroundColor: colors.danger },
                variant === 'ghost' && { backgroundColor: 'transparent' },
                (pressed || disabled) && { opacity: 0.6 },
            ]}
        >
            <Text
                style={[
                    styles.buttonText,
                    small && { fontSize: 13 },
                    (variant === 'secondary' || variant === 'ghost') && {
                        color: colors.text,
                    },
                    variant === 'ghost' && { color: colors.danger },
                ]}
            >
                {title}
            </Text>
        </Pressable>
    );
}

export function Input(props: TextInputProps & { label?: string }) {
    return (
        <View style={{ gap: 4 }}>
            {props.label && <Text style={styles.label}>{props.label}</Text>}
            <TextInput
                placeholderTextColor={colors.muted}
                {...props}
                style={[styles.input, props.style]}
            />
        </View>
    );
}

export function Badge({
    text,
    tone = 'accent',
}: {
    text: string;
    tone?: 'accent' | 'danger' | 'success' | 'warning';
}) {
    const tones = {
        accent: { bg: colors.accentSoft, fg: colors.accent },
        danger: { bg: colors.dangerSoft, fg: colors.danger },
        success: { bg: colors.primarySoft, fg: colors.primary },
        warning: { bg: colors.warningSoft, fg: colors.warning },
    };
    return (
        <View style={[styles.badge, { backgroundColor: tones[tone].bg }]}>
            <Text style={{ color: tones[tone].fg, fontSize: 12, fontWeight: '600' }}>
                {text}
            </Text>
        </View>
    );
}

export function Loading() {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}

export function EmptyState({ text }: { text: string }) {
    return (
        <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
        </Card>
    );
}

/** Selector simple: abre un modal con opciones grandes, pensado para el dedo. */
export function Picker({
    label,
    value,
    options,
    onChange,
    visible,
    setVisible,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    visible: boolean;
    setVisible: (visible: boolean) => void;
}) {
    const selected = options.find((option) => option.value === value);

    return (
        <View style={{ gap: 4 }}>
            <Text style={styles.label}>{label}</Text>
            <Pressable style={styles.input} onPress={() => setVisible(true)}>
                <Text style={{ color: selected ? colors.text : colors.muted }}>
                    {selected?.label ?? 'Elegir…'}
                </Text>
            </Pressable>
            <Modal visible={visible} animationType="slide" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>{label}</Text>
                        <ScrollView style={{ maxHeight: 420 }}>
                            {options.map((option) => (
                                <Pressable
                                    key={option.value}
                                    style={[
                                        styles.option,
                                        option.value === value && {
                                            backgroundColor: colors.primarySoft,
                                        },
                                    ]}
                                    onPress={() => {
                                        onChange(option.value);
                                        setVisible(false);
                                    }}
                                >
                                    <Text style={{ fontSize: 16 }}>{option.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Button
                            title="Cancelar"
                            variant="secondary"
                            onPress={() => setVisible(false)}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        ...shadow,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: 'center',
    },
    buttonSmall: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.muted,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        justifyContent: 'center',
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    option: {
        padding: 14,
        borderRadius: 10,
    },
});
