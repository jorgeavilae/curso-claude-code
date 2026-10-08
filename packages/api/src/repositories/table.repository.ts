import type { Table } from '@models/table.model.js'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByNumber(restaurantId: string, number: number): Promise<Table | null>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
}
