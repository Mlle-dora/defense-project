-- SMS provider is a platform choice, not a secret credential
UPDATE public.system_settings
SET is_sensitive = false
WHERE key = 'sms_provider';
