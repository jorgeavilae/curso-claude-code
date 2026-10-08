import { describe, it, expect, beforeEach, vi } from 'vitest'
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

    describe('update', () => {
        const updateInput = { number: 5, description: 'Barra', capacity: 6, status: 'reservada' }

        it('should update the table keeping id, restaurant and createdAt', async () => {
            const created = await service.create(validInput)

            const result = await service.update(created.id, updateInput)

            expect(result).toMatchObject({
                id: created.id,
                number: 5,
                description: 'Barra',
                capacity: 6,
                status: 'reservada',
                restaurantId: 'r1',
                createdAt: created.createdAt
            })
            expect(await repo.findById(created.id)).toEqual(result)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.update('missing', updateInput))
                .rejects.toThrow('Table not found')
        })

        it('should revalidate the data', async () => {
            const created = await service.create(validInput)
            await expect(service.update(created.id, { ...updateInput, capacity: 0 }))
                .rejects.toThrow('Table capacity must be a positive integer')
            await expect(service.update(created.id, { ...updateInput, status: 'roto' }))
                .rejects.toThrow('Invalid table status')
        })

        it('should reject a number used by another table of the restaurant', async () => {
            await service.create(validInput)
            const second = await service.create({ ...validInput, number: 2 })
            await expect(service.update(second.id, { ...updateInput, number: 1 }))
                .rejects.toThrow('Table number is already in use in this restaurant')
        })

        it('should allow keeping the own number', async () => {
            const created = await service.create(validInput)
            const result = await service.update(created.id, { ...updateInput, number: 1 })
            expect(result.number).toBe(1)
        })
    })

    describe('queries', () => {
        beforeEach(async () => {
            await service.create({ number: 3, capacity: 6, restaurantId: 'r1' })
            await service.create({ number: 1, capacity: 2, restaurantId: 'r1' })
            await service.create({ number: 2, capacity: 4, restaurantId: 'r1', status: 'ocupada' })
            await service.create({ number: 4, capacity: 4, restaurantId: 'r1' })
            await service.create({ number: 1, capacity: 8, restaurantId: 'r2' })
        })

        it('should find tables by restaurant ordered by number', async () => {
            const result = await service.findByRestaurantId('r1')
            expect(result.map(t => t.number)).toEqual([1, 2, 3, 4])
        })

        it('should find a table by id or return null', async () => {
            const [first] = await service.findByRestaurantId('r1')
            expect(await service.findById(first.id)).toEqual(first)
            expect(await service.findById('missing')).toBeNull()
        })

        it('should return only free tables ordered by number when no capacity is given', async () => {
            const result = await service.findAvailable('r1')
            expect(result.map(t => t.number)).toEqual([1, 3, 4])
        })

        it('should return only free tables with capacity greater or equal than requested', async () => {
            const result = await service.findAvailable('r1', 4)
            expect(result.map(t => t.number)).toEqual([3, 4])
        })

        it('should not return tables of other restaurants', async () => {
            const result = await service.findAvailable('r2', 2)
            expect(result.map(t => t.capacity)).toEqual([8])
        })

        it('should throw InvalidTableCapacityError for an invalid requested capacity', async () => {
            for (const capacity of [0, -1, 1.5, NaN]) {
                await expect(service.findAvailable('r1', capacity))
                    .rejects.toThrow('Table capacity must be a positive integer')
            }
        })
    })

    describe('changeStatus', () => {
        it('should change only the status and refresh updatedAt', async () => {
            const created = await service.create(validInput)

            const result = await service.changeStatus(created.id, ' Reservada ')

            expect(result.status).toBe('reservada')
            expect(result.number).toBe(created.number)
            expect(result.capacity).toBe(created.capacity)
            expect(result.createdAt).toBe(created.createdAt)
            expect(result.updatedAt >= created.updatedAt).toBe(true)
            expect((await repo.findById(created.id))?.status).toBe('reservada')
        })

        it('should reject an invalid status without modifying the table', async () => {
            const created = await service.create(validInput)
            await expect(service.changeStatus(created.id, 'roto'))
                .rejects.toThrow('Invalid table status')
            expect((await repo.findById(created.id))?.status).toBe('libre')
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.changeStatus('missing', 'libre'))
                .rejects.toThrow('Table not found')
        })
    })

    describe('occupy', () => {
        it('should occupy a free table', async () => {
            const created = await service.create(validInput)

            const result = await service.occupy(created.id)

            expect(result.status).toBe('ocupada')
            expect(result.id).toBe(created.id)
            expect((await repo.findById(created.id))?.status).toBe('ocupada')
        })

        it('should throw TableNotAvailableError when the table is not free', async () => {
            for (const status of ['ocupada', 'reservada']) {
                const created = await service.create({ ...validInput, number: status === 'ocupada' ? 1 : 2, status })
                await expect(service.occupy(created.id))
                    .rejects.toThrow('Table is not available')
            }
        })

        it('should throw TableNotAvailableError when the table is taken concurrently', async () => {
            const created = await service.create(validInput)
            vi.spyOn(repo, 'occupyIfFree').mockResolvedValue(false)

            await expect(service.occupy(created.id)).rejects.toThrow('Table is not available')
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.occupy('missing')).rejects.toThrow('Table not found')
        })
    })

    describe('delete', () => {
        it('should delete an existing table', async () => {
            const created = await service.create(validInput)
            await service.delete(created.id)
            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.delete('missing')).rejects.toThrow('Table not found')
        })
    })
})
