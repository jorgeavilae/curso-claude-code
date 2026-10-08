import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'

describe('normalizeTableStatus', () => {
    it('should accept all valid statuses', () => {
        for (const s of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should trim and lowercase the value', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
    })

    it('should throw InvalidTableStatusError for an invalid status', () => {
        expect(() => normalizeTableStatus('roto')).toThrow('Invalid table status')
    })

    it('should throw InvalidTableStatusError for an empty status', () => {
        expect(() => normalizeTableStatus('')).toThrow('Table status must be provided')
    })
})
