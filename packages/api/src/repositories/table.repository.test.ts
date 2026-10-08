import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    const now = new Date().toISOString()
    const buildTable = (overrides: Partial<Table>): Table => ({
        id: 't1',
        number: 1,
        description: 'Terraza',
        capacity: 4,
        status: 'libre',
        restaurantId: 'r1',
        createdAt: now,
        updatedAt: now,
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id mapping columns to camelCase', async () => {
        await repo.save(buildTable({}))

        const found = await repo.findById('t1')
        expect(found).toEqual(buildTable({}))
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('missing')).toBeNull()
    })

    it('should update an existing table', async () => {
        await repo.save(buildTable({ number: 7, description: 'Barra', capacity: 2, status: 'reservada', updatedAt: 'later' }))

        const found = await repo.findById('t1')
        expect(found).toMatchObject({ number: 7, description: 'Barra', capacity: 2, status: 'reservada', updatedAt: 'later' })
    })

    it('should find tables by restaurant ordered by number', async () => {
        await repo.save(buildTable({ id: 't2', number: 3, restaurantId: 'r2' }))
        await repo.save(buildTable({ id: 't3', number: 1, restaurantId: 'r2' }))
        await repo.save(buildTable({ id: 't4', number: 2, restaurantId: 'r2' }))

        const results = await repo.findByRestaurantId('r2')
        expect(results.map(t => t.id)).toEqual(['t3', 't4', 't2'])
    })

    it('should find a table by restaurant and number', async () => {
        expect((await repo.findByNumber('r2', 3))?.id).toBe('t2')
        expect(await repo.findByNumber('r1', 3)).toBeNull()
    })

    it('should find only free tables with enough capacity ordered by number', async () => {
        await repo.save(buildTable({ id: 't5', number: 10, capacity: 6, restaurantId: 'r1' }))
        await repo.save(buildTable({ id: 't6', number: 11, capacity: 8, status: 'ocupada', restaurantId: 'r1' }))
        await repo.save(buildTable({ id: 't7', number: 12, capacity: 2, restaurantId: 'r1' }))

        const results = await repo.findAvailable('r1', 3)
        expect(results.map(t => t.id)).toEqual(['t5'])
        expect((await repo.findAvailable('r1', 1)).map(t => t.id)).toEqual(['t5', 't7'])
    })

    it('should reject a duplicated number within the same restaurant', async () => {
        await expect(repo.save(buildTable({ id: 't8', number: 3, restaurantId: 'r2' })))
            .rejects.toThrow(/UNIQUE/)
    })

    it('should reject a table whose restaurant does not exist', async () => {
        await expect(repo.save(buildTable({ id: 't9', number: 99, restaurantId: 'nope' })))
            .rejects.toThrow(/FOREIGN KEY/)
    })

    it('should occupy a free table atomically (changes = 1) and fail the second time (changes = 0)', async () => {
        await repo.save(buildTable({ id: 't10', number: 20, restaurantId: 'r1' }))

        const [first, second] = await Promise.all([
            repo.occupyIfFree('t10', 'u1'),
            repo.occupyIfFree('t10', 'u2')
        ])

        expect([first, second].filter(Boolean)).toHaveLength(1)
        expect((await repo.findById('t10'))?.status).toBe('ocupada')
        expect(await repo.occupyIfFree('t10', 'u3')).toBe(false)
    })

    it('should not occupy a reserved or missing table', async () => {
        await repo.save(buildTable({ id: 't11', number: 21, status: 'reservada', restaurantId: 'r1' }))

        expect(await repo.occupyIfFree('t11', 'u')).toBe(false)
        expect((await repo.findById('t11'))?.status).toBe('reservada')
        expect(await repo.occupyIfFree('missing', 'u')).toBe(false)
    })

    it('should delete a table', async () => {
        await repo.delete('t1')
        expect(await repo.findById('t1')).toBeNull()
    })
})
