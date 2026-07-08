import { describe, it, expect } from 'vitest'
import { canTransition } from '@/utils/declaration'

describe('canTransition', () => {
  it('allows draft to submitted', () => {
    expect(canTransition('draft', 'submitted')).toBe(true)
  })

  it('allows submitted to received', () => {
    expect(canTransition('submitted', 'received')).toBe(true)
  })

  it('allows under_review to registered', () => {
    expect(canTransition('under_review', 'registered')).toBe(true)
  })

  it('rejects draft to registered', () => {
    expect(canTransition('draft', 'registered')).toBe(false)
  })

  it('rejects certificate_ready transitions', () => {
    expect(canTransition('certificate_ready', 'draft')).toBe(false)
  })
})
