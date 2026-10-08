import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { normalizeTableStatus } from '@models/table.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'

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

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validInput = {
        number: 1,
        description: 'Terraza',
        capacity: 4,
        restaurantId: 'r1'
    }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create and save a table with uuid and ISO dates', async () => {
            const result = await service.create(validInput)

            expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
            expect(result.number).toBe(1)
            expect(result.description).toBe('Terraza')
            expect(result.capacity).toBe(4)
            expect(result.restaurantId).toBe('r1')
            expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
            expect(result.updatedAt).toBe(result.createdAt)
            expect(await repo.findById(result.id)).toEqual(result)
        })

        it('should default the status to libre', async () => {
            const result = await service.create(validInput)
            expect(result.status).toBe('libre')
        })

        it('should normalize an explicit status', async () => {
            const result = await service.create({ ...validInput, status: 'Reservada' })
            expect(result.status).toBe('reservada')
        })

        it('should default the description to an empty string', async () => {
            const result = await service.create({ number: 2, capacity: 2, restaurantId: 'r1' })
            expect(result.description).toBe('')
        })
    })
})
