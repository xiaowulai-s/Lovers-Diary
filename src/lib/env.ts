const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    '缺少 Supabase 配置。请在 .env 或 EAS 环境变量中设置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY。',
  );
}

export const env = {
  supabaseUrl,
  supabasePublishableKey,
};
