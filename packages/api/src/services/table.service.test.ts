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

        it('should throw InvalidTableNumberError for zero, negative or non-integer numbers', async () => {
            for (const number of [0, -1, 1.5, NaN]) {
                await expect(service.create({ ...validInput, number }))
                    .rejects.toThrow('Table number must be a positive integer')
            }
        })

        it('should throw InvalidTableCapacityError for invalid capacity', async () => {
            for (const capacity of [0, -2, 2.5]) {
                await expect(service.create({ ...validInput, capacity }))
                    .rejects.toThrow('Table capacity must be a positive integer')
            }
        })

        it('should throw RestaurantIdRequiredError for empty restaurantId', async () => {
            await expect(service.create({ ...validInput, restaurantId: ' ' }))
                .rejects.toThrow('Restaurant ID is required')
        })

        it('should throw InvalidTableStatusError for invalid status', async () => {
            await expect(service.create({ ...validInput, status: 'roto' }))
                .rejects.toThrow('Invalid table status')
        })

        it('should throw DuplicatedTableNumberError when the number exists in the same restaurant', async () => {
            await service.create(validInput)
            await expect(service.create(validInput))
                .rejects.toThrow('Table number is already in use in this restaurant')
        })

        it('should allow the same number in a different restaurant', async () => {
            await service.create(validInput)
            const other = await service.create({ ...validInput, restaurantId: 'r2' })
            expect(other.restaurantId).toBe('r2')
        })
    })
})
