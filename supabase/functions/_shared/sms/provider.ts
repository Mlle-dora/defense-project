export interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SmsProvider {
  send(to: string, message: string): Promise<SmsResult>
}

type SettingsSupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { value?: { provider?: string } } | null }>
      }
    }
  }
}

export class MockSmsProvider implements SmsProvider {
  async send(to: string, message: string): Promise<SmsResult> {
    console.log(`[MOCK SMS] To: ${to}, Message: ${message}`)
    return { success: true, messageId: `mock-${Date.now()}` }
  }
}

export class AfricasTalkingSmsProvider implements SmsProvider {
  async send(to: string, message: string): Promise<SmsResult> {
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY')
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME')
    if (!apiKey || !username) {
      return { success: false, error: 'Africa\'s Talking credentials not configured' }
    }
    try {
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ username, to, message }),
      })
      if (!res.ok) {
        return { success: false, error: await res.text() }
      }
      const data = await res.json()
      return { success: true, messageId: data.SMSMessageData?.Recipients?.[0]?.messageId }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async send(to: string, message: string): Promise<SmsResult> {
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const token = Deno.env.get('TWILIO_AUTH_TOKEN')
    const from = Deno.env.get('TWILIO_FROM')
    if (!sid || !token || !from) {
      return { success: false, error: 'Twilio credentials not configured' }
    }
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: from, Body: message }),
        }
      )
      if (!res.ok) {
        return { success: false, error: await res.text() }
      }
      const data = await res.json()
      return { success: true, messageId: data.sid }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }
}

export async function resolveSmsProviderName(
  supabase?: SettingsSupabase
): Promise<string> {
  if (Deno.env.get('SMS_PROVIDER')) {
    return Deno.env.get('SMS_PROVIDER')!
  }
  if (supabase) {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sms_provider')
      .maybeSingle()
    const fromDb = data?.value?.provider
    if (fromDb) return fromDb
  }
  return 'mock'
}

export function createSmsProvider(name: string): SmsProvider {
  switch (name) {
    case 'africas_talking':
      return new AfricasTalkingSmsProvider()
    case 'twilio':
      return new TwilioSmsProvider()
    case 'mock':
    default:
      return new MockSmsProvider()
  }
}
