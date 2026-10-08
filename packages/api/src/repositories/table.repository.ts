import type { Table } from '@models/table.model.js'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    /** Returns the restaurant tables ordered by number. */
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    /** Returns the free tables with capacity >= minCapacity, ordered by number. */
    findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]>
    findByNumber(restaurantId: string, number: number): Promise<Table | null>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
}
