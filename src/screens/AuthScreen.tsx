import { Feather } from '@expo/vector-icons';
import { useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { BrandMark } from '../components/BrandMark';
import { Card } from '../components/Card';
import { useAuth } from '../providers/AuthProvider';
import { colors, fonts, radius, spacing, text } from '../theme';

type FocusedField = 'email' | 'password' | null;

export function AuthScreen() {
  const { notice, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!email.trim() || !password) {
      setError('请输入邮箱和密码。');
      return;
    }

    setError(null);
    setSubmitting(true);

    const message = await signIn(email, password);

    if (message) {
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <BrandMark size={64} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>爱苏日记</Text>
              <Text style={styles.brandNote}>PRIVATE · FOR TWO</Text>
            </View>
          </View>

          <Text style={styles.title}>只写给两个人的日记</Text>
          <Text style={styles.subtitle}>用一个已受邀的邮箱，推门进来。</Text>

          {notice ? (
            <View style={[styles.banner, styles.noticeBanner]}>
              <Feather name="shield" size={14} color={colors.accentDeep} />
              <Text style={[styles.bannerText, styles.noticeText]}>{notice}</Text>
            </View>
          ) : null}

          <Card style={styles.formCard}>
            <Text style={styles.fieldLabel}>邮箱</Text>
            <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
              <TextInput
                accessibilityLabel="邮箱"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="next"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>密码</Text>
            <View
              style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}
            >
              <TextInput
                ref={passwordRef}
                accessibilityLabel="密码"
                autoCapitalize="none"
                autoComplete="current-password"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onSubmitEditing={() => {
                  void handleSubmit();
                }}
                placeholder="输入密码"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="done"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                textContentType="password"
                value={password}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
                hitSlop={8}
                onPress={() => setShowPassword((current) => !current)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={17}
                  color={colors.inkMuted}
                />
              </Pressable>
            </View>

            {error ? (
              <View style={[styles.banner, styles.errorBanner]}>
                <Feather name="alert-circle" size={14} color={colors.danger} />
                <Text style={[styles.bannerText, styles.errorText]}>{error}</Text>
              </View>
            ) : null}

            <AppButton
              label="进入小窝"
              loading={submitting}
              onPress={() => {
                void handleSubmit();
              }}
            />

            <Text style={styles.formHint}>登录状态只保存在这台手机，下次可以直接推门。</Text>
          </Card>

          <View style={styles.footer}>
            <Feather name="lock" size={12} color={colors.inkMuted} />
            <Text style={styles.footerText}>
              仅两个已授权账号可以访问。其他人即使登录，也看不到任何内容。
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  brandCopy: {
    gap: 1,
  },
  brandName: {
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    letterSpacing: 0.3,
  },
  brandNote: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    lineHeight: 12,
    letterSpacing: 1.8,
    color: colors.accent,
  },
  title: {
    ...text.display,
    fontSize: 31,
    lineHeight: 42,
  },
  subtitle: {
    ...text.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  noticeBanner: {
    backgroundColor: colors.accentSoft,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
  },
  bannerText: {
    ...text.caption,
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
  },
  noticeText: {
    color: colors.accentDeep,
  },
  errorText: {
    color: colors.danger,
  },
  formCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  fieldLabel: {
    ...text.caption,
    color: colors.inkSoft,
    fontSize: 11.5,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldLabelSpaced: {
    marginTop: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  passwordInput: {
    paddingRight: spacing.xs,
  },
  eyeButton: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHint: {
    ...text.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 10.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    ...text.caption,
    flex: 1,
    textAlign: 'center',
    maxWidth: 290,
  },
});
