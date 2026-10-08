import type { TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async findById(id: string): Promise<Table | null> {
        return this.tables.get(id) || null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
    }

    async findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]> {
        return (await this.findByRestaurantId(restaurantId))
            .filter(t => t.status === 'libre' && t.capacity >= minCapacity)
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        return Array.from(this.tables.values())
            .find(t => t.restaurantId === restaurantId && t.number === number) || null
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, table)
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }
}
